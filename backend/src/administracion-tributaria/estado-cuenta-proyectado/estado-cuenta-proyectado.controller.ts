import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';
import { EstadoCuentaProyectadoDetalleService } from './estado-cuenta-proyectado-detalle.service';
import {
  CodigoProyectadoQuerySchema,
  ConsultaDetalleEstadoCuentaProyectadoSchema,
} from './dto/get-estado-cuenta-proyectado.dto';
import { SearchContribuyentesProyectadosSchema } from './dto/search-contribuyentes-proyectado.dto';
import {
  CabeceraProyectado,
  CatalogosProyectado,
  DetalleReciboProyectado,
  ReciboEmitidoProyectado,
} from './estado-cuenta-proyectado-detalle.types';
import { EstadoCuentaProyectadoSearchResponse } from './estado-cuenta-proyectado.types';

@Controller('administracion-tributaria/estado-cuenta-proyectado')
@UseGuards(JwtAuthGuard)
export class EstadoCuentaProyectadoController {
  constructor(
    private readonly service: EstadoCuentaProyectadoService,
    private readonly detalleService: EstadoCuentaProyectadoDetalleService,
  ) {}

  @Post('contribuyentes')
  async search(
    @Body() body: unknown,
  ): Promise<EstadoCuentaProyectadoSearchResponse> {
    return this.service.search(this.parse(SearchContribuyentesProyectadosSchema, body));
  }

  @Get('cabecera')
  async getCabecera(@Query() query: unknown): Promise<CabeceraProyectado> {
    const { codigo } = this.parse(CodigoProyectadoQuerySchema, query);
    return this.detalleService.getCabecera(codigo);
  }

  @Get('catalogos')
  async getCatalogos(@Query() query: unknown): Promise<CatalogosProyectado> {
    const { codigo } = this.parse(CodigoProyectadoQuerySchema, query);
    return this.detalleService.getCatalogos(codigo);
  }

  @Get('recibos')
  async getRecibos(@Query() query: unknown): Promise<ReciboEmitidoProyectado[]> {
    const { codigo } = this.parse(CodigoProyectadoQuerySchema, query);
    return this.detalleService.getRecibos(codigo);
  }

  @Post('consulta')
  async consulta(@Body() body: unknown): Promise<DetalleReciboProyectado[]> {
    return this.detalleService.consulta(
      this.parse(ConsultaDetalleEstadoCuentaProyectadoSchema, body),
    );
  }

  /** Parses query/body and translates ZodError into the canonical API envelope. */
  private parse<Output, Input>(
    schema: ZodType<Output, ZodTypeDef, Input>,
    body: unknown,
  ): Output {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'validation_error',
          message: 'Validation failed',
          details: {
            errors: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
      }
      throw error;
    }
  }
}
