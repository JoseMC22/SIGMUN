import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly localBasePath: string;
  private readonly nasUser?: string;
  private readonly nasPassword?: string;

  constructor(private readonly configService: ConfigService) {
    // Lee la ruta base física del almacenamiento NAS desde variables de entorno
    this.localBasePath =
      this.configService.get<string>('UPLOAD_DIR') ||
      this.configService.get<string>('NAS_LOCAL_PATH') ||
      '\\\\192.168.3.100\\digital';

    this.nasUser = this.configService.get<string>('NAS_USER');
    this.nasPassword = this.configService.get<string>('NAS_PASSWORD');
  }

  async onModuleInit() {
    await this.ensureNasMounted();
  }

  /**
   * Conecta y autentica automáticamente el recurso compartido NAS de Windows al iniciar el servidor
   */
  async ensureNasMounted(): Promise<boolean> {
    if (!this.localBasePath.startsWith('\\\\')) {
      return true; // Es una ruta local común
    }

    // Si ya es accesible, no hace falta reconectar
    if (fs.existsSync(this.localBasePath)) {
      this.logger.log(`Conexión a NAS activa y disponible en: ${this.localBasePath}`);
      return true;
    }

    if (!this.nasUser || !this.nasPassword) {
      this.logger.warn(`Ruta NAS ${this.localBasePath} no accesible y no se configuraron NAS_USER/NAS_PASSWORD`);
      return false;
    }

    try {
      this.logger.log(`Autenticando automáticamente recurso NAS ${this.localBasePath}...`);
      // Ejecutar net use para autenticar la sesión SMB en Windows
      const cmd = `net use "${this.localBasePath}" /user:${this.nasUser} ${this.nasPassword} /persistent:yes`;
      await execAsync(cmd);
      this.logger.log(`Recurso NAS autenticado exitosamente en Windows.`);
      return true;
    } catch (err: any) {
      this.logger.error(`No se pudo montar o autenticar el recurso NAS automáticamente: ${err?.message || err}`);
      return false;
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

