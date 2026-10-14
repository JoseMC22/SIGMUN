import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdenanzasService } from './ordenanzas.service';
import {
  OrdenanzasResponse,
  OrdenanzasDetalleResponse,
} from './dto/ordenanzas.types';
import { CrearOrdenanzaSchema } from './dto/crear-ordenanza.dto';

// Validación Zod del id de ruta del update (T6): coerce int positivo; el
// valor vacío hace coerce Number('') = 0 y cae en el error de positive().
const EditarOrdenanzaParamsSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id debe ser un número' })
    .int('id debe ser un número entero')
    .positive('id debe ser un entero positivo'),
});

// Validación Zod del query del detalle (T7/T9): coerce int positivo; el
// valor vacío hace coerce Number('') = 0 y cae en el error de positive().
const DetalleOrdenanzaQuerySchema = z.object({
  idordenanza: z.coerce
    .number({ invalid_type_error: 'idordenanza debe ser un número' })
    .int('idordenanza debe ser un número entero')
    .positive('idordenanza debe ser un entero positivo'),
});

// Validación Zod del id de ruta del update del detalle (T3): coerce int
// positivo (PK del detalle, WHERE del modo 8).
const EditarDetalleParamsSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id debe ser un número' })
    .int('id debe ser un número entero')
    .positive('id debe ser un entero positivo'),
});

// Validación Zod del body del update del detalle (T3): SOLO los campos con
// valor conocido (el modo 4 no devuelve tipo/observacion/estado y el modo 8
// los pisaría). Montos ≥ 0; anno YYYY exacto (char 4 del SP).
const EditarDetalleSchema = z.object({
  cidordenanza: z.coerce
    .number({ invalid_type_error: 'cidordenanza debe ser un número' })
    .int('cidordenanza debe ser un número entero')
    .positive('cidordenanza debe ser un entero positivo'),
  anno: z
    .string({ invalid_type_error: 'anno debe ser un texto' })
    .regex(/^\d{4}$/, 'anno debe tener el formato YYYY'),
  tipoRec: z
    .string({ invalid_type_error: 'tipoRec debe ser un texto' })
    .min(1, 'tipoRec es obligatorio'),
  impInsol: z.coerce
    .number({ invalid_type_error: 'impInsol debe ser un número' })
    .min(0, 'impInsol debe ser mayor o igual a 0'),
  impReaj: z.coerce
    .number({ invalid_type_error: 'impReaj debe ser un número' })
    .min(0, 'impReaj debe ser mayor o igual a 0'),
  mora: z.coerce
    .number({ invalid_type_error: 'mora debe ser un número' })
    .min(0, 'mora debe ser mayor o igual a 0'),
  costoEmis: z.coerce
    .number({ invalid_type_error: 'costoEmis debe ser un número' })
    .min(0, 'costoEmis debe ser mayor o igual a 0'),
});

@Controller('mantenimiento-tablas/ordenanzas')
@UseGuards(JwtAuthGuard)
export class OrdenanzasController {
  constructor(private readonly ordenanzasService: OrdenanzasService) {}

  /** Listado de ordenanzas (iteración 1 del CRUD; sin params). */
  @Get()
  async listar(): Promise<OrdenanzasResponse> {
    return this.ordenanzasService.listar();
  }

  /**
   * Alta de ordenanza master (iteración 2, @msquery=1 = INSERT).
   * Validación Zod safeParse (patrón mantenimiento-uit); el operador sale
   * del usuario de sesión inyectado por el JwtAuthGuard (patrón
   * mantenimiento-vias).
   */
  @Post()
  async crear(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const parsed = CrearOrdenanzaSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'Datos inválidos');
    }
    const operador = (req.user as any)?.username || '';
    return this.ordenanzasService.crear(parsed.data, operador);
  }

  /**
   * Update de fila del detalle (T3, @msquery=8 = UPDATE en CAJA.DOrdenanzas,
   * NO toca tipo/observacion/estado). El id de ruta es la PK del detalle
   * (WHERE del modo 8) validada Zod int positivo; el body trae SOLO los
   * campos conocidos validados con EditarDetalleSchema. La estación viaja
   * por header x-estacion (el SP la exige sin default) y el operador sale
   * del usuario de sesión inyectado por el JwtAuthGuard.
   *
   * OJO rutas: `@Patch('detalle/:id')` (2 segmentos) no colisiona con
   * `@Patch(':id')` (1 segmento) ni con `@Get('detalle')` (distinto método).
   */
  @Patch('detalle/:id')
  async editarDetalle(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const parsedParams = EditarDetalleParamsSchema.safeParse({ id: id ?? '' });
    if (!parsedParams.success) {
      const msg = parsedParams.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'id inválido');
    }
    const parsed = EditarDetalleSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'Datos inválidos');
    }
    const operador = (req.user as any)?.username || '';
    const rawEstacion = req.headers?.['x-estacion'];
    const estacion = Array.isArray(rawEstacion)
      ? (rawEstacion[0] ?? '')
      : (rawEstacion ?? '');
    return this.ordenanzasService.editarDetalle(
      parsedParams.data.id,
      { ...parsed.data, estacion },
      operador,
    );
  }

  /**
   * Update de ordenanza master (T6, @msquery=7 = UPDATE, NO toca estado).
   * El id de ruta se valida Zod int positivo y el body reutiliza
   * CrearOrdenanzaSchema (mismo manejo BadRequest que crear); el operador
   * sale del usuario de sesión inyectado por el JwtAuthGuard.
   */
  @Patch(':id')
  async editar(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const parsedParams = EditarOrdenanzaParamsSchema.safeParse({ id: id ?? '' });
    if (!parsedParams.success) {
      const msg = parsedParams.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'id inválido');
    }
    const parsed = CrearOrdenanzaSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'Datos inválidos');
    }
    const operador = (req.user as any)?.username || '';
    return this.ordenanzasService.editar(parsedParams.data.id, parsed.data, operador);
  }

  /**
   * Detalle de una ordenanza (iteración 4, @msquery=4 re-modelado). El SP
   * re-verificado (13/10 ~16:32) ahora SI filtra server-side con
   * `WHERE CIDORDENANZA = @idordenanza` — ya sin filtro en memoria; el
   * endpoint además trae CONCEPTO vía el JOIN a CAJA.TIPO_INGRESOS_DET.
   * La validación del query es Zod safeParse (patrón crear). Read-only.
   */
  @Get('detalle')
  async detalle(
    @Query('idordenanza') idordenanza: string,
  ): Promise<OrdenanzasDetalleResponse> {
    const parsed = DetalleOrdenanzaQuerySchema.safeParse({
      idordenanza: idordenanza ?? '',
    });
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(msg || 'idordenanza inválida');
    }
    return this.ordenanzasService.detalle(parsed.data.idordenanza);
  }
}
