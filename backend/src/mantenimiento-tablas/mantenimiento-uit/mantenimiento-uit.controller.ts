import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MantenimientoUitService } from './mantenimiento-uit.service';
import { CrearUitSchema, CrearUitDto } from './dto/crear-uit.dto';
import { EditarUitSchema } from './dto/editar-uit.dto';

@UseGuards(JwtAuthGuard)
@Controller('mantenimiento-tablas/mantenimiento-uit')
export class MantenimientoUitController {
  constructor(
    private readonly mantenimientoUitService: MantenimientoUitService,
  ) {}

  @Get('annos')
  async obtenerAnnos() {
    return this.mantenimientoUitService.obtenerAnnos();
  }

  @Get()
  async buscar(@Query('anno', ParseIntPipe) anno: number) {
    return this.mantenimientoUitService.buscarPorAnno(anno);
  }

  @Post()
  async crear(@Body() body: Record<string, unknown>) {
    const parsed = CrearUitSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map(e => e.message).join('; ');
      throw new BadRequestException(msg || 'Datos inválidos');
    }
    return this.mantenimientoUitService.crear(parsed.data);
  }

  @Put()
  async editar(@Body() body: Record<string, unknown>) {
    const parsed = EditarUitSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map(e => e.message).join('; ');
      throw new BadRequestException(msg || 'Datos inválidos');
    }
    return this.mantenimientoUitService.editar(parsed.data);
  }

  @Delete(':anno')
  async eliminar(@Param('anno', ParseIntPipe) anno: number) {
    return this.mantenimientoUitService.eliminar(anno);
  }
}
