import { Body, Controller, Get, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdenanzasService } from './ordenanzas.service';
import {
  OrdenanzasResponse,
  OrdenanzasDetalleResponse,
} from './dto/ordenanzas.types';
import { CrearOrdenanzaSchema } from './dto/crear-ordenanza.dto';

// Validación Zod del query del detalle (T7): coerce int positivo; el valor
// vacío hace coerce Number('') = 0 y cae en el error de positive().
const DetalleOrdenanzaQuerySchema = z.object({
  idordenanza: z.coerce
    .number({ invalid_type_error: 'idordenanza debe ser un número' })
    .int('idordenanza debe ser un número entero')
    .positive('idordenanza debe ser un entero positivo'),
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
   * Detalle de una ordenanza (iteración 3, @msquery=4). El service filtra
   * en memoria por cidordenanza (el SP NO filtra server-side); la
   * validación del query es Zod safeParse (patrón crear). Read-only: sin
   * alta de detalle aquí (queda para T4/iteración 4 si se habilita).
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
