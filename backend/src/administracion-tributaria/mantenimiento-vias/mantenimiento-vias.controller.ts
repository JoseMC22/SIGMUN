import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MantenimientoViasService } from './mantenimiento-vias.service';
import {
  SearchMantenimientoViasSchema,
  SearchMantenimientoViasDto,
} from './dto/search-mantenimiento-vias.dto';
import {
  CreateMantenimientoViaSchema,
  CreateMantenimientoViaDto,
  UpdateMantenimientoViaSchema,
  UpdateMantenimientoViaDto,
} from './dto/create-mantenimiento-vias.dto';
import {
  SaveArancelSchema,
  SaveArancelDto,
} from './dto/save-arancel.dto';
import {
  CreateUrbanizacionSchema,
  CreateUrbanizacionDto,
  UpdateUrbanizacionSchema,
  UpdateUrbanizacionDto,
} from './dto/create-urbanizacion.dto';
import {
  ViasRow,
  ViaDetail,
  PaginatedResponse,
  SpTipoVia,
  SpTipoUrbanizacion,
  SpUrbanizacion,
  SpZona,
  SpArancelRow,
  SpArancelDetalle,
  UrbanizacionRow,
  SpUrbanizacionDetail,
} from './dto/mantenimiento-vias.types';

@Controller('mantenimiento-vias')
@UseGuards(JwtAuthGuard)
export class MantenimientoViasController {
  constructor(private readonly mantenimientoViasService: MantenimientoViasService) {}

  @Post('search')
  async search(
    @Body() dto: SearchMantenimientoViasDto,
  ): Promise<PaginatedResponse<ViasRow>> {
    let parsed: SearchMantenimientoViasDto;
    try {
      parsed = SearchMantenimientoViasSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    return this.mantenimientoViasService.search(parsed);
  }

  // ─── Combos (ANTES de :cod_via para evitar conflicto de ruteo) ───

  @Get('combos/tipos-via')
  async getTiposVia(): Promise<{ success: true; data: SpTipoVia[] }> {
    const data = await this.mantenimientoViasService.getTiposVia();
    return { success: true, data };
  }

  @Get('urbanizaciones')
  async getUrbanizacionesTable(
    @Query('tipo') tipo?: string,
    @Query('nombre') nombre?: string,
    @Query('nestado') nestado?: string,
  ): Promise<{ success: true; data: UrbanizacionRow[] }> {
    const hasFilter = tipo || nombre || nestado;
    const data = hasFilter
      ? await this.mantenimientoViasService.searchUrbanizaciones({ tipo, nombre, nestado })
      : await this.mantenimientoViasService.getUrbanizacionesTable();
    return { success: true, data };
  }

  @Get('combos/urbanizaciones')
  async getUrbanizaciones(): Promise<{ success: true; data: SpUrbanizacion[] }> {
    const data = await this.mantenimientoViasService.getUrbanizaciones();
    return { success: true, data };
  }

  @Get('combos/tipos-urbanizacion')
  async getTiposUrbanizacion(): Promise<{ success: true; data: SpTipoUrbanizacion[] }> {
    const data = await this.mantenimientoViasService.getTiposUrbanizacion();
    return { success: true, data };
  }

  @Get('combos/zonas')
  async getZonas(): Promise<{ success: true; data: SpZona[] }> {
    const data = await this.mantenimientoViasService.getZonas();
    return { success: true, data };
  }

  // ─── Urbanizaciones CRUD (ANTES de :cod_via para evitar conflicto de ruteo) ───

  @Post('urbanizaciones')
  async createUrbanizacion(
    @Body() dto: CreateUrbanizacionDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ): Promise<{ success: true; message: string }> {
    let parsed: CreateUrbanizacionDto;
    try {
      parsed = CreateUrbanizacionSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    const result = await this.mantenimientoViasService.createUrbanizacion(parsed, operador, clientIp);
    return { success: true, ...result };
  }

  @Get('urbanizaciones/:id_urba')
  async getUrbanizacion(
    @Param('id_urba') id_urba: string,
  ): Promise<{ success: true; data: SpUrbanizacionDetail }> {
    const data = await this.mantenimientoViasService.getUrbanizacion(id_urba);
    return { success: true, data };
  }

  @Put('urbanizaciones/:id_urba')
  async updateUrbanizacion(
    @Param('id_urba') id_urba: string,
    @Body() dto: UpdateUrbanizacionDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ): Promise<{ success: true; message: string }> {
    let parsed: UpdateUrbanizacionDto;
    try {
      parsed = UpdateUrbanizacionSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    console.error('[updateUrbanizacion] CONTROLLER:', { operador, user: req.user, ip: clientIp });
    const result = await this.mantenimientoViasService.updateUrbanizacion(id_urba, parsed, operador, clientIp);
    return { success: true, ...result };
  }

  @Get(':cod_via')
  async findOne(
    @Param('cod_via') cod_via: string,
  ): Promise<{ success: true; data: ViaDetail }> {
    try {
      const data = await this.mantenimientoViasService.findOne(cod_via);
      return { success: true, data };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        error: 'Error al obtener la vía.',
      });
    }
  }

  @Get(':cod_via/aranceles')
  async getAranceles(
    @Param('cod_via') cod_via: string,
  ): Promise<{ success: true; data: SpArancelRow[] }> {
    const data = await this.mantenimientoViasService.getAranceles(cod_via);
    return { success: true, data };
  }

  @Get(':cod_via/aranceles/:id_tbl')
  async getArancelDetalle(
    @Param('cod_via') cod_via: string,
    @Param('id_tbl') id_tbl: string,
  ): Promise<{ success: true; data: SpArancelDetalle }> {
    const data = await this.mantenimientoViasService.getArancelDetalle(cod_via, id_tbl);
    //console.log('[getArancelDetalle] SP returned:', JSON.stringify(data));
    return { success: true, data };
  }

  @Post(':cod_via/aranceles')
  async saveArancel(
    @Param('cod_via') cod_via: string,
    @Body() dto: SaveArancelDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ): Promise<{ success: true; message: string }> {
    let parsed: SaveArancelDto;
    try {
      console.log('[saveArancel] BODY RECIBIDO:', JSON.stringify(dto));
      console.log('[saveArancel] cod_via:', cod_via);
      const toValidate = { ...dto, cod_via };
      console.log('[saveArancel] A VALIDAR:', JSON.stringify(toValidate));
      parsed = SaveArancelSchema.parse(toValidate);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        //console.log('[saveArancel] ZodError:', JSON.stringify(error.issues));
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      //console.log('[saveArancel] Error inesperado:', error);
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    try {
      const result = await this.mantenimientoViasService.saveArancel(parsed, operador, clientIp);
      return { success: true, ...result };
    } catch (error) {
      //console.log('[saveArancel] Error en service:', error);
      throw error;
    }
  }

  @Post()
  async create(
    @Body() dto: CreateMantenimientoViaDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ): Promise<{ success: true; message: string }> {
    let parsed: CreateMantenimientoViaDto;
    try {
      parsed = CreateMantenimientoViaSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    const result = await this.mantenimientoViasService.create(parsed, operador, clientIp);
    return { success: true, ...result };
  }

  @Put(':cod_via')
  async update(
    @Param('cod_via') cod_via: string,
    @Body() dto: UpdateMantenimientoViaDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ): Promise<{ success: true; message: string }> {
    let parsed: UpdateMantenimientoViaDto;
    try {
      parsed = UpdateMantenimientoViaSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues
          .map((issue) => {
            const path = issue.path.join('.');
            return path ? `${path}: ${issue.message}` : issue.message;
          })
          .join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    const result = await this.mantenimientoViasService.update(cod_via, parsed, operador, clientIp);
    return { success: true, ...result };
  }
}
