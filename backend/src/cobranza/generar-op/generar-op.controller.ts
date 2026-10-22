import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GenerarOpService } from './generar-op.service';
import { ProcesarOpSchema, ProcesarOpDto } from './dto/procesar-op.dto';
import { GenerarOpSchema, GenerarOpDto } from './dto/generar-op.dto';
import { ProcesarOpResult, GenerarOpResult } from './generar-op.types';
import { generateOpPdf } from './op-pdf-generator';
import { z } from 'zod';

const ID_VALOR_VALIDOS = ['01', '11'];

@Controller('cobranza/generar-op')
@UseGuards(JwtAuthGuard)
export class GenerarOpController {
  private readonly logger = new Logger(GenerarOpController.name);

  constructor(private readonly service: GenerarOpService) {}

  /** Proyección de estado de cuenta (Caja.sp_EstCta_Rentasop_proyectado). */
  @Post('procesar')
  @HttpCode(HttpStatus.OK)
  async procesar(@Body() body: unknown): Promise<ProcesarOpResult> {
    let dto: ProcesarOpDto;
    try {
      dto = ProcesarOpSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          data: [],
          total: 0,
          error: errorMsg,
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.procesar(dto);
  }

  /** Generación real de la OP (Rentas.sp_Genera_OP / sp_Genera_OPVEH). */
  @Post('generar')
  @HttpCode(HttpStatus.OK)
  async generar(@Body() body: unknown): Promise<GenerarOpResult> {
    let dto: GenerarOpDto;
    try {
      dto = GenerarOpSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          error: errorMsg,
        };
      }
      return {
        success: false,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.generar(dto);
  }

  /**
   * PDF de una OP ya generada (`Rentas.sp_ImprimeOP @buscar = 2`).
   * Se responde inline para que el navegador lo abra en una pestaña.
   */
  @Get('pdf')
  async getPdf(
    @Query('idValor') idValor: string | undefined,
    @Query('numVal') numVal: string | undefined,
    @Query('anoVal') anoVal: string | undefined,
    @Res() res: Response,
  ) {
    const id = String(idValor ?? '').trim();
    const num = String(numVal ?? '').trim();
    const ano = String(anoVal ?? '').trim();

    if (!ID_VALOR_VALIDOS.includes(id)) {
      throw new BadRequestException({
        success: false,
        error: 'idValor inválido (esperado 01 o 11)',
      });
    }
    if (!num || !ano) {
      throw new BadRequestException({
        success: false,
        error: 'numVal y anoVal son obligatorios',
      });
    }

    try {
      const { rows, logoDataUri, selloDataUri } = await this.service.imprimir({
        idValor: id,
        numVal: num,
        anoVal: ano,
      });
      const buffer = await generateOpPdf(rows, {
        logoDataUri: logoDataUri ?? undefined,
        selloDataUri: selloDataUri ?? undefined,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="op_${num}_${ano}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err: any) {
      this.logger.error(
        `op-pdf failed for OP ${num}-${ano}: ${err?.message ?? err}`,
        err?.stack,
      );
      if (!res.headersSent) {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const payload = err instanceof HttpException ? err.getResponse() : null;
        const error =
          payload &&
          typeof payload === 'object' &&
          'error' in (payload as Record<string, unknown>)
            ? String((payload as Record<string, unknown>).error)
            : (err?.message ?? 'Error al generar PDF de OP');
        res.status(status).json({ success: false, error });
      }
    }
  }
}
