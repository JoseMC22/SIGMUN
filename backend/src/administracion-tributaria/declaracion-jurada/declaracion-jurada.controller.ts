import { Controller, Post, Get, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeclaracionJuradaService } from './declaracion-jurada.service';
import {
  SearchDeclaracionJuradaSchema,
  SearchDeclaracionJuradaDto,
} from './dto/search-declaracion-jurada.dto';
import {
  ContribuyenteListItem,
  ContribuyenteDireccionItem,
  ContribuyentePlacaItem,
  PaginatedResponse,
  TipoDocumentoOption,
  TipoContribuyenteOption,
  SubTipoContribuyenteOption,
  DistritoOption,
  MviaItem,
  BuscarContribuyenteResult,
  ValidarRepresentanteResult,
  GuardarContribuyenteResult,
  GuardarRepresentanteResult,
  VincularRepresentanteResult,
  EditarContribuyenteResult,
  EliminarContribuyenteResult,
  ObtenerRepresentantesResult,
  EditarRepresentanteResult,
  EliminarRepresentanteResult,
  EstadoCuentaFiltrosResult,
  EstadoCuentaReciboRow,
  GenerarLiquidacionDJResult,
  LiquidacionReporteData,
  VerPagosData,
  DeudaConsolidadoData,
} from './dto/declaracion-jurada.types';
import {
  EstadoCuentaRecibosSchema,
  EstadoCuentaRecibosDto,
} from './dto/estado-cuenta-recibos.dto';
import {
  DeudaConsolidadoSchema,
  DeudaConsolidadoDto,
} from './dto/deuda-consolidado.dto';
import {
  GenerarLiquidacionDJSchema,
  GenerarLiquidacionDJDto,
} from './dto/estado-cuenta-liquidacion.dto';
import {
  GuardarContribuyenteSchema,
  GuardarContribuyenteDto,
} from './dto/guardar-contribuyente.dto';
import {
  GuardarRepresentanteSchema,
  GuardarRepresentanteDto,
} from './dto/guardar-representante.dto';
import {
  VincularRepresentanteSchema,
  VincularRepresentanteDto,
} from './dto/vincular-representante.dto';
import {
  EliminarContribuyenteSchema,
  EliminarContribuyenteDto,
} from './dto/eliminar-contribuyente.dto';
import {
  EliminarRepresentanteSchema,
  EliminarRepresentanteDto,
} from './dto/eliminar-representante.dto';

@Controller('declaracion-jurada')
@UseGuards(JwtAuthGuard)
export class DeclaracionJuradaController {
  constructor(private readonly service: DeclaracionJuradaService) {}

  @Post('search')
  async search(
    @Body() dto: SearchDeclaracionJuradaDto,
  ): Promise<PaginatedResponse<ContribuyenteListItem | ContribuyenteDireccionItem | ContribuyentePlacaItem>> {
    let parsed: SearchDeclaracionJuradaDto;
    try {
      parsed = SearchDeclaracionJuradaSchema.parse(dto);
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
    return this.service.search(parsed);
  }

  // ── Combos para el modal de registro ──────────────────────

  @Get('combos/tipos-documento')
  async getTiposDocumento(): Promise<{ success: true; data: TipoDocumentoOption[] }> {
    const data = await this.service.getTiposDocumento();
    return { success: true, data };
  }

  @Get('combos/tipos-contribuyente')
  async getTiposContribuyente(): Promise<{ success: true; data: TipoContribuyenteOption[] }> {
    const data = await this.service.getTiposContribuyente();
    return { success: true, data };
  }

  @Get('combos/subtipos-contribuyente')
  async getSubTiposContribuyente(
    @Query('idTipoContri') idTipoContri: string,
  ): Promise<{ success: true; data: SubTipoContribuyenteOption[] }> {
    const data = await this.service.getSubTiposContribuyente(idTipoContri ?? '');
    return { success: true, data };
  }

  @Get('combos/distritos')
  async getDistritos(): Promise<{ success: true; data: DistritoOption[] }> {
    const data = await this.service.getDistritos();
    return { success: true, data };
  }

  // ── Combos Datos Domicilio Fiscal ────────────────────────

  @Get('combos/tipos-interior')
  async getTiposInterior(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposInterior();
    return { success: true, data };
  }

  @Get('combos/tipos-edificacion')
  async getTiposEdificacion(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposEdificacion();
    return { success: true, data };
  }

  @Get('combos/tipos-ingreso')
  async getTiposIngreso(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposIngreso();
    return { success: true, data };
  }

  @Get('combos/tipos-agrupamiento')
  async getTiposAgrupamiento(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposAgrupamiento();
    return { success: true, data };
  }

  // ── Búsqueda de vías (modal Domicilio Fiscal) ────────────

  @Get('search-vias')
  async searchVias(
    @Query('nombre_via') nombreVia: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ): Promise<PaginatedResponse<MviaItem>> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(pageSize ?? '10', 10) || 10));
    return this.service.searchVias(nombreVia ?? '', pageNum, size);
  }

  // ── Buscar contribuyente por nº documento (modal Representante) ──

  @Get('buscar-contribuyente')
  async buscarContribuyente(
    @Query('num_doc') numDoc: string,
  ): Promise<{ success: true; data: BuscarContribuyenteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.buscarContribuyentePorDoc(numDoc ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al buscar contribuyente.',
      };
    }
  }

  // ── Obtener contribuyente por código (modal Editar Contribuyente) ──

  @Get('buscar-por-codigo')
  async buscarPorCodigo(
    @Query('codigo') codigo: string,
  ): Promise<{ success: true; data: EditarContribuyenteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.buscarPorCodigo(codigo ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener el contribuyente.',
      };
    }
  }

  // ── Validar si requiere representante (modal Nuevo Contribuyente) ──

  @Get('validar-representante')
  async validarRepresentante(
    @Query('num_doc') numDoc: string,
  ): Promise<{ success: true; data: ValidarRepresentanteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.validarRepresentante(numDoc ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al validar representante.',
      };
    }
  }

  // ── Validar si requiere representante por código (modal Representante) ──

  @Get('validar-representante-por-codigo')
  async validarRepresentantePorCodigo(
    @Query('codigo') codigo: string,
  ): Promise<{ success: true; data: ValidarRepresentanteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.validarRepresentantePorCodigo(codigo ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al validar representante por código.',
      };
    }
  }

  // ── Guardar contribuyente (modal Nuevo Contribuyente) ──

  @Post('guardar')
  async guardar(
    @Body() dto: GuardarContribuyenteDto,
  ): Promise<{ success: true; data: GuardarContribuyenteResult } | { success: false; error: string }> {
    let parsed: GuardarContribuyenteDto;
    try {
      parsed = GuardarContribuyenteSchema.parse(dto);
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
    try {
      const data = await this.service.guardar(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al guardar contribuyente.',
      };
    }
  }

  // ── Guardar representante (modal Representante) ──

  @Post('guardar-representante')
  async guardarRepresentante(
    @Body() dto: GuardarRepresentanteDto,
  ): Promise<{ success: true; data: GuardarRepresentanteResult } | { success: false; error: string }> {
    let parsed: GuardarRepresentanteDto;
    try {
      parsed = GuardarRepresentanteSchema.parse(dto);
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
    try {
      const data = await this.service.guardarRepresentante(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al guardar representante.',
      };
    }
  }

  // ── Vincular representante con contribuyente ──

  @Post('vincular-representante')
  async vincularRepresentante(
    @Body() dto: VincularRepresentanteDto,
  ): Promise<{ success: true; data: VincularRepresentanteResult } | { success: false; error: string }> {
    let parsed: VincularRepresentanteDto;
    try {
      parsed = VincularRepresentanteSchema.parse(dto);
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
    try {
      const data = await this.service.vincularRepresentante(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al vincular representante.',
      };
    }
  }

  // ── Obtener datos + representantes (modal Representantes) ──

  @Get('representantes')
  async representantes(
    @Query('codigo') codigo: string,
  ): Promise<{ success: true; data: ObtenerRepresentantesResult } | { success: false; error: string }> {
    try {
      const data = await this.service.obtenerRepresentantes(codigo ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener representantes.',
      };
    }
  }

  // ── Obtener representante por id (modal Editar Representante) ──

  @Get('representante-por-id')
  async representantePorId(
    @Query('id') id: string,
  ): Promise<{ success: true; data: EditarRepresentanteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.obtenerRepresentante(id ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener el representante.',
      };
    }
  }

  // ── Eliminar contribuyente (sp_Mcontribuyente @busc=3) ──

  @Post('eliminar')
  async eliminar(
    @Body() dto: EliminarContribuyenteDto,
  ): Promise<{ success: true; data: EliminarContribuyenteResult } | { success: false; error: string }> {
    let parsed: EliminarContribuyenteDto;
    try {
      parsed = EliminarContribuyenteSchema.parse(dto);
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
    try {
      const data = await this.service.eliminar(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar contribuyente.',
      };
    }
  }

  // ── Eliminar representante (sp_Mrepresentante @busc=7) ──

  @Post('eliminar-representante')
  async eliminarRepresentante(
    @Body() dto: EliminarRepresentanteDto,
  ): Promise<{ success: true; data: EliminarRepresentanteResult } | { success: false; error: string }> {
    let parsed: EliminarRepresentanteDto;
    try {
      parsed = EliminarRepresentanteSchema.parse(dto);
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
    try {
      const data = await this.service.eliminarRepresentante(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar representante.',
      };
    }
  }

  // ── Estado de Cuenta (modal): filtros por contribuyente ──
  // store_caja_framework @msquery=5|6|15|20|21, @codigo

  @Get('estado-cuenta/filtros')
  async getEstadoCuentaFiltros(
    @Query('codigo') codigo: string,
  ): Promise<
    { success: true; data: EstadoCuentaFiltrosResult } | { success: false; error: string }
  > {
    try {
      const data = await this.service.getEstadoCuentaFiltros(codigo ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los filtros del estado de cuenta.',
      };
    }
  }

  // ── Estado de Cuenta (modal): recibos grid ("Mostrar") ──
  // Caja.sp_EstCta_Rentas family (base / coactivo / sin multa / amnistía).

  @Post('estado-cuenta/recibos')
  async getEstadoCuentaRecibos(
    @Body() dto: EstadoCuentaRecibosDto,
  ): Promise<
    { success: true; data: EstadoCuentaReciboRow[] } | { success: false; error: string }
  > {
    let parsed: EstadoCuentaRecibosDto;
    try {
      parsed = EstadoCuentaRecibosSchema.parse(dto);
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
    try {
      const data = await this.service.getEstadoCuentaRecibos(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al consultar la deuda del contribuyente.',
      };
    }
  }

  // ── Estado de Cuenta (modal): Generar Liquidación ──

  @Post('estado-cuenta/liquidacion')
  async generarLiquidacion(
    @Body() dto: GenerarLiquidacionDJDto,
  ): Promise<{ success: true; data: GenerarLiquidacionDJResult } | { success: false; error: string }> {
    let parsed: GenerarLiquidacionDJDto;
    try {
      parsed = GenerarLiquidacionDJSchema.parse(dto);
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
    try {
      const data = await this.service.generarLiquidacionDJ(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al generar la liquidación.',
      };
    }
  }

  // ── Estado de Cuenta (modal): Reporte Liquidación ───────

  @Get('liquidacion/:idliqui/reporte')
  async getLiquidacionReporte(
    @Param('idliqui') idliqui: string,
  ): Promise<
    { success: true; data: LiquidacionReporteData } | { success: false; error: string }
  > {
    if (!idliqui) {
      return { success: false, error: 'Falta el parámetro idliqui.' };
    }
    try {
      const data = await this.service.getLiquidacionReporte(idliqui);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Error al obtener datos de la liquidación.',
      };
    }
  }

  // ── Ver Pagos ──────────────────────────────────────────

  @Get('ver-pagos/:codigo')
  async getVerPagos(
    @Param('codigo') codigo: string,
  ): Promise<
    { success: true; data: VerPagosData } | { success: false; error: string }
  > {
    if (!codigo) {
      return { success: false, error: 'Falta el parámetro codigo.' };
    }
    try {
      const data = await this.service.getVerPagos(codigo);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Error al obtener los pagos del contribuyente.',
      };
    }
  }

  // ── Deuda Consolidada ─────────────────────────────────

  @Post('estado-cuenta/deuda-consolidada')
  async getDeudaConsolidado(
    @Body() dto: DeudaConsolidadoDto,
  ): Promise<
    { success: true; data: DeudaConsolidadoData } | { success: false; error: string }
  > {
    let parsed: DeudaConsolidadoDto;
    try {
      parsed = DeudaConsolidadoSchema.parse(dto);
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
    try {
      const data = await this.service.getDeudaConsolidado(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener la deuda consolidada del contribuyente.',
      };
    }
  }
}