import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MultaTributariaService } from './multa-tributaria.service';
import {
  SearchContribuyenteSchema,
} from './dto/search-contribuyente.dto';
import {
  GetAnnoSchema,
  GetContribuyenteSchema,
  GetDetalleSchema,
  GetInfraccionSchema,
  GetMultasSchema,
  GetPrediosSchema,
} from './dto/get-consultas.dto';
import {
  EliminarMultaSchema,
  GrabarMultaSchema,
} from './dto/grabar-multa.dto';

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

@Controller('cobranza/multa-tributaria')
@UseGuards(JwtAuthGuard)
export class MultaTributariaController {
  constructor(private readonly service: MultaTributariaService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: unknown) {
    return this.service.search(
      parse(SearchContribuyenteSchema, body),
    );
  }

  @Post('contribuyente')
  @HttpCode(HttpStatus.OK)
  async contribuyente(@Body() body: unknown) {
    const dto = parse(GetContribuyenteSchema, body);
    const data = await this.service.getContribuyente(dto);
    if (!data) {
      return { success: false, error: 'Contribuyente no encontrado' };
    }
    return { success: true, data };
  }

  @Post('multas')
  @HttpCode(HttpStatus.OK)
  multas(@Body() body: unknown) {
    return this.service.getMultas(parse(GetMultasSchema, body));
  }

  @Post('predios')
  @HttpCode(HttpStatus.OK)
  async predios(@Body() body: unknown) {
    const dto = parse(GetPrediosSchema, body);
    const data = await this.service.getPredios(dto);
    return { success: true, data, total: data.length };
  }

  @Post('tributos')
  @HttpCode(HttpStatus.OK)
  async tributos() {
    const data = await this.service.getTributos();
    return { success: true, data, total: data.length };
  }

  @Post('gradualidad')
  @HttpCode(HttpStatus.OK)
  async gradualidad() {
    const data = await this.service.getGradualidad();
    return { success: true, data, total: data.length };
  }

  @Post('uit')
  @HttpCode(HttpStatus.OK)
  async uit(@Body() body: unknown) {
    const dto = parse(GetAnnoSchema, body);
    const data = await this.service.getUit(dto);
    return { success: true, data };
  }

  @Post('valor')
  @HttpCode(HttpStatus.OK)
  async valor(@Body() body: unknown) {
    const dto = parse(GetAnnoSchema, body);
    const data = await this.service.getValor(dto);
    return { success: true, data };
  }

  @Post('detalle')
  @HttpCode(HttpStatus.OK)
  async detalle(@Body() body: unknown) {
    const dto = parse(GetDetalleSchema, body);
    const data = await this.service.getDetalle(dto);
    return { success: true, data };
  }

  @Post('infraccion')
  @HttpCode(HttpStatus.OK)
  async infraccion(@Body() body: unknown) {
    const dto = parse(GetInfraccionSchema, body);
    const data = await this.service.getInfraccion(dto);
    return { success: true, data };
  }

  @Post('grabar')
  @HttpCode(HttpStatus.OK)
  grabar(@Body() body: unknown) {
    return this.service.grabar(
      parse(GrabarMultaSchema, body),
    );
  }

  @Post('eliminar')
  @HttpCode(HttpStatus.OK)
  eliminar(@Body() body: unknown) {
    return this.service.eliminar(
      parse(EliminarMultaSchema, body),
    );
  }

  @Get('fecha')
  async fecha() {
    const data = await this.service.getFecha();
    return { success: true, data };
  }
}
