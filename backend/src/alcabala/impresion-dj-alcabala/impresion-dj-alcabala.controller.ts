import {
  Controller,
  Get,
  Logger,
  Param,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';
import { generateOpPdf } from './op-pdf-generator';
import {
  generateDeclaracionPdf,
  loadLogoDataUri,
} from './declaracion-pdf-generator';

@Controller('alcabala/impresion-dj-alcabala')
@UseGuards(JwtAuthGuard)
export class ImpresionDjAlcabalaController {
  private readonly logger = new Logger(ImpresionDjAlcabalaController.name);

  constructor(
    private readonly impresionDjAlcabalaService: ImpresionDjAlcabalaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('op-pdf/:idAlcabala')
  async getOpPdf(
    @Param('idAlcabala') idAlcabala: string,
    @Res() res: Response,
  ) {
    const id = parseInt(idAlcabala, 10);
    if (isNaN(id)) {
      throw new BadRequestException({ success: false, error: 'ID de alcabala inválido' });
    }

    try {
      const { numVal, anoVal, rows } =
        await this.impresionDjAlcabalaService.resolveOpPrintData(id);
      const buffer = await generateOpPdf(rows);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="op_${numVal}_${anoVal}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err: any) {
      this.logger.error(
        `op-pdf failed for idAlcabala=${id}: ${err?.message ?? err}`,
        err?.stack,
      );
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: err?.message ?? 'Error al generar PDF de OP',
        });
      }
    }
  }

  @Get('declaracion-pdf/:idAlcabala')
  async getDeclaracionPdf(
    @Param('idAlcabala') idAlcabala: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const id = Number(idAlcabala);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException({
        success: false,
        error: 'ID de alcabala inválido',
      });
    }

    try {
      const user = req.user as { username?: string } | undefined;
      const usuario = user?.username ?? 'SISTEMA';
      const fecha = formatNow();

      const row =
        await this.impresionDjAlcabalaService.resolveDeclaracionPrintData(id);
      const logoPath = this.configService.get<string>('REPORT_IMG_RUTA');
      const logoDataUri = await loadLogoDataUri(logoPath);
      const buffer = await generateDeclaracionPdf(row, {
        usuario,
        fecha,
        logoDataUri,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="declaracion_${id}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err: any) {
      this.logger.error(
        `declaracion-pdf failed for idAlcabala=${id}: ${err?.message ?? err}`,
        err?.stack,
      );
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: err?.message ?? 'Error al generar PDF de declaración',
        });
      }
    }
  }
}

function formatNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}
