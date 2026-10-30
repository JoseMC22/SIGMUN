import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
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
