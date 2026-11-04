import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as os from 'os';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';
import {
  CertificadosSchema,
  ContribuyenteSchema,
  DetalleCertificadoSchema,
  EmptyBodySchema,
  GenerarCertificadoSchema,
  ImpresionCertificadoSchema,
  PrediosSchema,
} from './dto/certificado.dto';
import { SearchContribuyenteSchema } from './dto/search-contribuyente.dto';

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new BadRequestException(detail);
  }
  return result.data as z.infer<S>;
}

@Controller('cobranza/certificado-no-adeudo')
@UseGuards(JwtAuthGuard)
export class CertificadoNoAdeudoController {
  constructor(private readonly service: CertificadoNoAdeudoService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: unknown) {
    return this.service.search(parse(SearchContribuyenteSchema, body));
  }

  @Post('certificados')
  @HttpCode(HttpStatus.OK)
  certificados(@Body() body: unknown) {
    return this.service.getCertificados(parse(CertificadosSchema, body));
  }

  @Post('detalle')
  @HttpCode(HttpStatus.OK)
  detalle(@Body() body: unknown) {
    return this.service.getDetalle(parse(DetalleCertificadoSchema, body));
  }

  /**
   * PDF del certificado. Responde `inline` para que el navegador lo abra.
   *
   * Solo se genera si el recibo de emision esta cancelado (`est_imprime='1'`);
   * si no, 409 `RECIBO_NO_CANCELADO`. Certificado inexistente: 404.
   */
  @Get('pdf')
  async pdf(
    @Query('codigo') codigo: string | undefined,
    @Query('certNro') certNro: string | undefined,
    @Query('certAnio') certAnio: string | undefined,
    @Res() res: Response,
  ) {
    const dto = parse(ImpresionCertificadoSchema, {
      codigo,
      certNro,
      certAnio,
    });
    const result = await this.service.getImpresion(dto);

    if (!result.success) {
      const status =
        result.code === 'NO_ENCONTRADO'
          ? HttpStatus.NOT_FOUND
          : result.code === 'RECIBO_NO_CANCELADO'
            ? HttpStatus.CONFLICT
            : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        code: result.code,
        error: result.error,
      });
      return;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.data.filename}"`,
      'Content-Length': result.data.buffer.length,
    });
    res.end(result.data.buffer);
  }

  @Post('contribuyente')
  @HttpCode(HttpStatus.OK)
  contribuyente(@Body() body: unknown) {
    return this.service.getContribuyente(parse(ContribuyenteSchema, body));
  }

  @Post('tipos-deuda')
  @HttpCode(HttpStatus.OK)
  tiposDeuda(@Body() body: unknown) {
    parse(EmptyBodySchema, body ?? {});
    return this.service.getTiposDeuda();
  }

  @Post('tipos-periodo')
  @HttpCode(HttpStatus.OK)
  tiposPeriodo(@Body() body: unknown) {
    parse(EmptyBodySchema, body ?? {});
    return this.service.getTiposPeriodo();
  }

  @Post('anios-deuda')
  @HttpCode(HttpStatus.OK)
  aniosDeuda(@Body() body: unknown) {
    parse(EmptyBodySchema, body ?? {});
    return { success: true, data: this.service.getAniosDeuda() };
  }

  @Post('predios')
  @HttpCode(HttpStatus.OK)
  predios(@Body() body: unknown) {
    return this.service.getPredios(parse(PrediosSchema, body));
  }

  @Post('generar')
  @HttpCode(HttpStatus.OK)
  generar(
    @Body() body: unknown,
    @Request() req: Request & { user?: { username?: string } },
  ) {
    const usuario = req.user?.username ?? '';
    const estacion = os.hostname().toUpperCase() || 'SISTEMA';
    return this.service.generar(
      parse(GenerarCertificadoSchema, body),
      usuario,
      estacion,
    );
  }
}
