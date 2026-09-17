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
  GenerarDeudaConcepto,
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
  GenerarDeudaConceptoSchema,
  GenerarDeudaConceptoDto,
} from './dto/generar-deuda-concepto.dto';
import {
  GenerarDeudaGuardarSchema,
  GenerarDeudaGuardarDto,
} from './dto/generar-deuda-guardar.dto';
import {
  GenerarLiquidacionDJSchema,
  GenerarLiquidacionDJDto,
} from './dto/estado-cuenta-liquidacion.dto';
import {
  CondicionConvenioSchema,
  CondicionConvenioDto,
  FraccionarInicialSchema,
  FraccionarInicialDto,
  FraccionarCuotasSchema,
  FraccionarCuotasDto,
  FraccionarApoderadoSchema,
  FraccionarApoderadoDto,
  SimuladoConvenioSchema,
  SimuladoConvenioDto,
  GenerarConvenioSchema,
  GenerarConvenioDto,
  ConvenioReporteSchema,
  ConvenioReporteDto,
  ListadoFraccSchema,
  ListadoFraccDto,
  AnularConvenioSchema,
  AnularConvenioDto,
} from './dto/fraccionar.dto';
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

  @Post('estado-cuenta/generar-deuda-concepto')
  async getGenerarDeudaConcepto(
    @Body() dto: GenerarDeudaConceptoDto,
  ): Promise<
    | { success: true; data: GenerarDeudaConcepto[] }
    | { success: false; error: string }
  > {
    let parsed: GenerarDeudaConceptoDto;
    try {
      parsed = GenerarDeudaConceptoSchema.parse(dto);
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
      const data = await this.service.getGenerarDeudaConcepto(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los conceptos de generar deuda.',
      };
    }
  }

  @Post('estado-cuenta/generar-deuda-guardar')
  async guardarGenerarDeuda(
    @Body() dto: GenerarDeudaGuardarDto,
  ): Promise<
    | { success: true; data: { idMulta: string | null } }
    | { success: false; error: string }
  > {
    let parsed: GenerarDeudaGuardarDto;
    try {
      parsed = GenerarDeudaGuardarSchema.parse(dto);
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
      const data = await this.service.guardarGenerarDeuda(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al guardar la deuda generada.',
      };
    }
  }

  // ─── Fraccionar Deuda ─────────────────────────────────────────────────

  @Post('estado-cuenta/fraccionar/condicion')
  async fraccionarCondicion(
    @Body() dto: CondicionConvenioDto,
  ): Promise<
    | { success: true; data: string }
    | { success: false; error: string }
  > {
    let parsed: CondicionConvenioDto;
    try {
      parsed = CondicionConvenioSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.verificarCondicionFraccionamiento(
        parsed.codigo,
        parsed.param,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data ?? '' };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al consultar la condición de fraccionamiento.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/inicial')
  async fraccionarInicial(
    @Body() dto: FraccionarInicialDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getDatosInicialesFraccionar']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: FraccionarInicialDto;
    try {
      parsed = FraccionarInicialSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getDatosInicialesFraccionar(parsed);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los datos iniciales del fraccionamiento.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/cuotas')
  async fraccionarCuotas(
    @Body() dto: FraccionarCuotasDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['calcularCuotasConvenio']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: FraccionarCuotasDto;
    try {
      parsed = FraccionarCuotasSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.calcularCuotasConvenio(parsed);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al calcular las cuotas.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/simulado')
  async fraccionarSimulado(
    @Body() dto: SimuladoConvenioDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getSimuladoConvenio']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: SimuladoConvenioDto;
    try {
      parsed = SimuladoConvenioSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getSimuladoConvenio(parsed);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al generar el simulado del convenio.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/generar-convenio')
  async fraccionarGenerarConvenio(
    @Body() dto: GenerarConvenioDto,
  ): Promise<
    | { success: true; data: { convenio: string } }
    | { success: false; error: string }
  > {
    let parsed: GenerarConvenioDto;
    try {
      parsed = GenerarConvenioSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.generarConvenio(parsed);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al generar el convenio.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/convenio-reporte')
  async fraccionarConvenioReporte(
    @Body() dto: ConvenioReporteDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getReporteConvenio']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: ConvenioReporteDto;
    try {
      parsed = ConvenioReporteSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getReporteConvenio(
        parsed.codigo,
        parsed.convenio,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener el reporte del convenio.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/listado')
  async fraccionarListado(
    @Body() dto: ListadoFraccDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getListadoFraccionamientos']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: ListadoFraccDto;
    try {
      parsed = ListadoFraccSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getListadoFraccionamientos(parsed.codigo);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al listar los fraccionamientos.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/detalle')
  async fraccionarDetalleConvenio(
    @Body() dto: ConvenioReporteDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getDetalleConvenio']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: ConvenioReporteDto;
    try {
      parsed = ConvenioReporteSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getDetalleConvenio(
        parsed.codigo,
        parsed.convenio,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener el detalle del convenio.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/resolucion-genera')
  async fraccionarResolucionGenera(
    @Body() dto: ConvenioReporteDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    let parsed: ConvenioReporteDto;
    try {
      parsed = ConvenioReporteSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.generarResolucion(
        parsed.codigo,
        parsed.convenio,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, message: r.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al generar la resolución.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/resolucion-reporte')
  async fraccionarResolucionReporte(
    @Body() dto: ConvenioReporteDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getDatosResolucion']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: ConvenioReporteDto;
    try {
      parsed = ConvenioReporteSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getDatosResolucion(
        parsed.codigo,
        parsed.convenio,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener los datos de la resolución.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/anular')
  async fraccionarAnularConvenio(
    @Body() dto: AnularConvenioDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    let parsed: AnularConvenioDto;
    try {
      parsed = AnularConvenioSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.anularConvenio(
        parsed.codigo,
        parsed.convenio,
        parsed.operador,
        parsed.estacion,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, message: r.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al anular el convenio.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/anular-sc')
  async fraccionarAnularConvenioSc(
    @Body() dto: AnularConvenioDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    let parsed: AnularConvenioDto;
    try {
      parsed = AnularConvenioSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.anularConvenioSc(
        parsed.codigo,
        parsed.convenio,
        parsed.operador,
        parsed.estacion,
      );
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, message: r.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al anular el convenio sin cargos.',
      };
    }
  }

  @Post('estado-cuenta/fraccionar/apoderado')
  async fraccionarApoderado(
    @Body() dto: FraccionarApoderadoDto,
  ): Promise<
    | { success: true; data: NonNullable<Awaited<ReturnType<DeclaracionJuradaService['getApoderadoConvenio']>>>['data'] }
    | { success: false; error: string }
  > {
    let parsed: FraccionarApoderadoDto;
    try {
      parsed = FraccionarApoderadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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
      const r = await this.service.getApoderadoConvenio(parsed.codigo);
      if (!r.success) {
        return { success: false, error: r.message };
      }
      return { success: true, data: r.data! };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al consultar el apoderado.',
      };
    }
  }
}