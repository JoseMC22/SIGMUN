import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  cNombreArchivo: string;
  cRutaArchivo: string;
  cUrl: string;
  size: number;
}

export interface FileLike {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly localBasePath: string;

  constructor(private readonly configService: ConfigService) {
    // Lee la ruta base física del almacenamiento NAS desde variables de entorno
    this.localBasePath =
      this.configService.get<string>('UPLOAD_DIR') ||
      this.configService.get<string>('NAS_LOCAL_PATH') ||
      '\\\\192.168.3.100\\digital';

    // Crear carpeta base si no existe
    if (!fs.existsSync(this.localBasePath)) {
      try {
        fs.mkdirSync(this.localBasePath, { recursive: true });
      } catch (err) {
        this.logger.warn(`No se pudo verificar o crear la ruta base de almacenamiento ${this.localBasePath}:`, err);
      }
    }
  }

  /**
   * Guarda un archivo recibido en la estructura de carpetas: Subcarpeta/Año/Mes (ej: Digital_Legal/2026/09/archivo.pdf)
   */
  async saveFile(file: FileLike, subfolder = 'Digital_Legal', cCodificacion?: string, oficina?: string): Promise<UploadResult> {
    if (!file || !file.originalname) {
      throw new BadRequestException('Archivo no especificado o inválido.');
    }

    // 1. Validar extensión permitida
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Formato no permitido (${ext}). Solo se aceptan archivos PDF o Word (.pdf, .doc, .docx).`,
      );
    }

    // 2. Validar tamaño máximo permitido desde .env
    const envMaxSize = Number(this.configService.get<string>('MAX_FILE_SIZE'));
    const MAX_SIZE_BYTES = !isNaN(envMaxSize) && envMaxSize > 0 ? envMaxSize : 500 * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      const maxMb = (MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(`El archivo excede el tamaño máximo permitido de ${maxMb} MB.`);
    }

    // 3. Crear estructura de carpetas por Año / Mes / Tramite / [Oficina]
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const sanitizedCodificacion = cCodificacion ? cCodificacion.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const sanitizedOficina = oficina ? oficina.replace(/[^a-zA-Z0-9_-]/g, '_') : '';

    const pathParts = [subfolder, year, month];
    if (sanitizedCodificacion) pathParts.push(sanitizedCodificacion);
    if (sanitizedOficina) pathParts.push(sanitizedOficina);

    const relativeFolder = path.join(...pathParts).replace(/\\/g, '/');
    const targetDir = path.join(this.localBasePath, relativeFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 4. Generar nombre único con timestamp anti-sobrescritura
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedOriginalName}`;
    const fullPath = path.join(targetDir, uniqueFileName);

    // 5. Escribir archivo en disco/NAS
    fs.writeFileSync(fullPath, file.buffer);

    const relativePath = `${relativeFolder}/${uniqueFileName}`;
    this.logger.log(`Archivo guardado exitosamente en: ${fullPath}`);

    return {
      cNombreArchivo: file.originalname,
      cRutaArchivo: relativePath,
      cUrl: `/api/storage/download/${relativePath}`,
      size: file.size,
    };
  }

  /**
   * Resuelve el path físico completo en el disco/NAS dada una ruta relativa
   */
  resolveFullPath(relativePath: string): string {
    const sanitized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.localBasePath, sanitized);
  }
}

