import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConvenioEstadoService } from './convenio-estado.service';
import {
  CreateConvenioEstadoDto,
  CreateConvenioEstadoSchema,
  UpdateConvenioEstadoDto,
  UpdateConvenioEstadoSchema,
  SearchConvenioEstadoDto,
  SearchConvenioEstadoSchema,
} from './convenio-estado.types';

@Controller('mantenimiento-tablas/mantenimiento-estado-convenios')
@UseGuards(JwtAuthGuard)
export class ConvenioEstadoController {
  constructor(private readonly service: ConvenioEstadoService) {}

  @Get('search')
  async searchGet(@Query() query: Record<string, string>) {
    return this.parseAndSearch(query);
  }

  @Post('search')
  async search(@Body() dto: SearchConvenioEstadoDto) {
    return this.parseAndSearch(dto);
  }

  private async parseAndSearch(raw: Record<string, string | number>) {
    let parsed: SearchConvenioEstadoDto;
    try {
      parsed = SearchConvenioEstadoSchema.parse(raw);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages || 'Parámetros inválidos.' });
      }
      throw new BadRequestException({ success: false, error: 'Parámetros inválidos.' });
    }
    return this.service.search(parsed);
  }

  @Get(':codigo')
  async findByCodigo(@Param('codigo') codigo: string) {
    const data = await this.service.findByCodigo(codigo);
    if (!data) {
      throw new NotFoundException({ success: false, error: 'Estado de convenio no encontrado.' });
    }
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreateConvenioEstadoDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ) {
    let parsed: CreateConvenioEstadoDto;
    try {
      parsed = CreateConvenioEstadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages });
      }
      throw new BadRequestException({ success: false, error: 'Datos de entrada inválidos.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    return this.service.create(parsed, operador, clientIp);
  }

  @Put(':codigo')
  async update(
    @Param('codigo') codigo: string,
    @Body() dto: UpdateConvenioEstadoDto,
    @Request() req: { user: { username: string }; ip: string; headers: Record<string, string | string[]> },
  ) {
    let parsed: UpdateConvenioEstadoDto;
    try {
      parsed = UpdateConvenioEstadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages });
      }
      throw new BadRequestException({ success: false, error: 'Datos de entrada inválidos.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const operador = req.user?.username || '';
    return this.service.update(codigo, parsed, operador, clientIp);
  }

  @Delete(':codigo')
  async delete(@Param('codigo') codigo: string) {
    return this.service.delete(codigo);
  }
}