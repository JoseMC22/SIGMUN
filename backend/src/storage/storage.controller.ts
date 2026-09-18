import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { StorageService, UploadResult } from './storage.service';
import * as fs from 'fs';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Req() req: Request,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo válido para subir.');
    }
    const subfolder = (req.body?.subfolder as string) || (req.query?.subfolder as string) || 'Digital_Legal';
    const cCodificacion = (req.body?.cCodificacion as string) || (req.query?.cCodificacion as string) || (req.body?.nro_tramite as string);
    const oficina = (req.body?.oficina as string) || (req.query?.oficina as string);

    return this.storageService.saveFile(file, subfolder, cCodificacion, oficina);
  }

  @Get('download/*path')
  async downloadFile(@Req() req: Request, @Res() res: Response) {
    // Extraer la ruta pasante tras 'storage/download/'
    const urlParts = req.url.split('/storage/download/');
    const relativePath = urlParts[1];

    if (!relativePath) {
      throw new BadRequestException('Ruta de archivo no especificada');
    }

    const decodedPath = decodeURIComponent(relativePath);
    const fullPath = this.storageService.resolveFullPath(decodedPath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('El archivo adjunto no existe o no se encuentra disponible.');
    }

    return res.sendFile(fullPath);
  }
}
