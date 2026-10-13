import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdenanzasService } from './ordenanzas.service';
import { OrdenanzasResponse } from './dto/ordenanzas.types';
import { CrearOrdenanzaSchema } from './dto/crear-ordenanza.dto';

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
}
