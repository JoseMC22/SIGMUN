import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';

/**
 * Largo maximo del token: `v1.` + payload base64url + `.` + firma base64url.
 * Con el payload actual sobran 512; el limite evita que un portador mande un
 * valor arbitrariamente grande al verificador.
 */
const MAX_TOKEN_LENGTH = 512;

const TokenSchema = z.object({
  codigo: z
    .string({
      required_error: 'El parametro codigo es obligatorio',
      invalid_type_error: 'El parametro codigo debe ser texto',
    })
    .trim()
    .min(1, 'El parametro codigo es obligatorio')
    .max(MAX_TOKEN_LENGTH, 'El token de verificacion es demasiado largo'),
});

/**
 * Verificador publico del QR del Certificado de No Adeudo.
 *
 * No lleva `JwtAuthGuard` a proposito: quien escanea el QR no tiene sesion en
 * el sistema. La autorizacion es el propio token firmado (HMAC-SHA256) que
 * viaja en `?codigo=`; sin firma valida no se toca la base.
 *
 * Escanear el QR abre el PDF directamente (no hay pagina HTML intermedia).
 */
@Controller('publico/certificado-no-adeudo')
export class CertificadoPublicoController {
  constructor(private readonly service: CertificadoNoAdeudoService) {}

  /**
   * PDF del certificado a partir del token del QR.
   *
   * 400 token ausente o gigante, 404 token invalido o certificado inexistente,
   * 409 recibo de emision no cancelado, 500 error de generacion o de
   * configuracion del servidor. Todos los errores usan el mismo sobre
   * `{ success: false, code, error }`, incluida la validacion del parametro.
   */
  @Get('pdf')
  async pdf(
    @Query('codigo') codigo: string | undefined,
    @Res() res: Response,
  ) {
    const parsed = TokenSchema.safeParse({ codigo });
    if (!parsed.success) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        code: 'PARAMETROS_INVALIDOS',
        error: parsed.error.issues.map((issue) => issue.message).join('; '),
      });
      return;
    }

    const result = await this.service.getImpresionPorToken(parsed.data.codigo);

    if (!result.success) {
      const status =
        result.code === 'TOKEN_INVALIDO' || result.code === 'NO_ENCONTRADO'
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
      // Un certificado puede dejar de ser valido (recibo anulado): no cachear.
      'Cache-Control': 'no-store',
    });
    res.end(result.data.buffer);
  }
}
