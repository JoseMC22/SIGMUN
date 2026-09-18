import { Injectable, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import { SearchDeclaracionJuradaDto } from './dto/search-declaracion-jurada.dto';
import {
  SpMContribuyenteRow,
  SpMContribuyenteDireccionRow,
  SpMContribuyentePlacaRow,
  ContribuyenteListItem,
  ContribuyenteDireccionItem,
  ContribuyentePlacaItem,
  PaginatedResponse,
  TipoDocumentoOption,
  TipoContribuyenteOption,
  SubTipoContribuyenteOption,
  DistritoOption,
  SpMviaRow,
  MviaItem,
  SpMBuscarContribuyenteRow,
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
  EstadoCuentaPredioOption,
  EstadoCuentaReciboRow,
  GenerarLiquidacionDJResult,
  LiquidacionReporteData,
  VerPagosData,
  VerPagosRecibo,
  LiquidacionReporteDetalle,
  DeudaConsolidadoData,
  GenerarDeudaConcepto,
  PeriodoAnno,
  PeriodoDetalle,
  PredioDJItem,
  HojaResumenComboOption,
  HojaResumenCombosResult,
  HojaResumenEditarResult,
  GuardarHojaResumenResult,
  DeterminacionResult,
} from './dto/declaracion-jurada.types';
import { EstadoCuentaRecibosDto } from './dto/estado-cuenta-recibos.dto';
import { DeudaConsolidadoDto } from './dto/deuda-consolidado.dto';
import { GenerarDeudaConceptoDto } from './dto/generar-deuda-concepto.dto';
import { GenerarDeudaGuardarDto } from './dto/generar-deuda-guardar.dto';
import { GenerarLiquidacionDJDto } from './dto/estado-cuenta-liquidacion.dto';
import { GuardarContribuyenteDto } from './dto/guardar-contribuyente.dto';
import { GuardarRepresentanteDto } from './dto/guardar-representante.dto';
import { VincularRepresentanteDto } from './dto/vincular-representante.dto';
import { EliminarContribuyenteDto } from './dto/eliminar-contribuyente.dto';
import { EliminarRepresentanteDto } from './dto/eliminar-representante.dto';
import type { SimuladoConvenioDto, GenerarConvenioDto } from './dto/fraccionar.dto';
import { GuardarHojaResumenDto } from './dto/guardar-hoja-resumen.dto';
import type {
  DeterminacionIpDto,
  DeterminacionArbitriosDto,
} from './dto/determinacion.dto';

@Injectable()
export class DeclaracionJuradaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_MREPRESENTANTE = 'Rentas.sp_Mrepresentante';
  private readonly SP_RENTASMAIN = 'Rentas.sp_rentasmain';
  private readonly SP_MRECEPCION = 'Coactivo.SP_Mrecepcion';
  private readonly SP_TBLDISTRITO = 'Contenedor.SP_TblDistrito';
  private readonly SP_VW_MVIAS = 'Rentas.SP_vw_Mvias';
  private readonly SP_CAJA_FRAMEWORK = 'dbo.store_caja_framework';
  private readonly SP_MHRPRED = 'Rentas.sp_MHRpred';
  private readonly SP_LISTA_COMBO = 'Calculo.sp_ListaCombo';
  private readonly logger = new Logger(DeclaracionJuradaService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchDeclaracionJuradaDto,
  ): Promise<PaginatedResponse<ContribuyenteListItem | ContribuyenteDireccionItem | ContribuyentePlacaItem>> {
    const {
      tipoBusqueda,
      codigo,
      nombres,
      paterno,
      materno,
      razon,
      numDoc,
      codPred,
      anno,
      idVia,
      nro,
      dpto,
      mza,
      lte,
      subLte,
      codUrb,
      placa,
      checkfrac,
      page,
      pageSize,
    } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams = {
      codigo: codigo || '',
      nombres: nombres || '',
      paterno: paterno || '',
      materno: materno || '',
      razon: razon || '',
      num_doc: numDoc || '',
      tipo_busqueda: tipoBusqueda,
      cod_pred: codPred || '',
      checkfrac,
    };

    if (tipoBusqueda === 'P') {
      // ── Address/Predio mode: busc=15 (count), busc=14 (paginated data) ──
      // Only the params the SP defines for busc=14/15 — no extra params allowed
      const addressParams = {
        anno: anno || '',
        id_via: idVia || '',
        nro: nro || '',
        dpto: dpto || '',
        Mza: mza || '',
        Lte: lte || '',
        SubLte: subLte || '',
        cod_pred: codPred || '',
        cod_urb: codUrb || '',
      };

      const totalResult = await this.db.executeProcedure<any>(
        this.SP_MCONTRIBUYENTE,
        { ...addressParams, busc: 15 },
      );
      const totalRow = totalResult.recordset?.[0];
      const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

      const rowsResult = await this.db.executeProcedure<SpMContribuyenteDireccionRow>(
        this.SP_MCONTRIBUYENTE,
        { ...addressParams, busc: 14, inicio: String(inicio), final: String(final) },
      );

      const data: ContribuyenteDireccionItem[] = (
        rowsResult.recordset || []
      ).map((row) => ({
        codigo: row.codigo ?? '',
        nombre: row.nombre ?? '',
        codPred: row.cod_pred ?? '',
        anexo: row.anexo ?? '',
        subAnexo: row.sub_anexo ?? '',
        direccion: row.direcion ?? '',
        row: row.ROW ?? 0,
      }));

      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
      return { data, total, page, pageSize, totalPages };
    }

    if (tipoBusqueda === 'V') {
      // ── Placa mode: busc=17 (count), busc=18 (paginated data) ──
      const placaParams = {
        placa: placa || '',
      };

      const totalResult = await this.db.executeProcedure<any>(
        this.SP_MCONTRIBUYENTE,
        { ...placaParams, busc: 17 },
      );
      const totalRow = totalResult.recordset?.[0];
      const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

      const rowsResult = await this.db.executeProcedure<SpMContribuyentePlacaRow>(
        this.SP_MCONTRIBUYENTE,
        { ...placaParams, busc: 18, inicio: String(inicio), final: String(final) },
      );

      const data: ContribuyentePlacaItem[] = (
        rowsResult.recordset || []
      ).map((row) => ({
        codigo: row.codigo ?? '',
        nombresCompletos: row.nomcontrib ?? '',
        numDoc: row.nro_documento ?? '',
        direFis: row.DireFis ?? '',
        placa: row.placa ?? '',
        row: row.ROW ?? 0,
      }));

      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
      return { data, total, page, pageSize, totalPages };
    }

    // ── Standard mode: busc=6 (count), busc=5 (paginated data) ──
    const totalResult = await this.db.executeProcedure<any>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 6 },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    const rowsResult = await this.db.executeProcedure<SpMContribuyenteRow>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
    );

    const data: ContribuyenteListItem[] = (
      rowsResult.recordset || []
    ).map((row) => ({
      codigo: row.codigo ?? '',
      tipoDetalle: row.tipo_detalle ?? '',
      gestion: row.Gestion ?? '',
      nombresCompletos: [row.nombres, row.paterno, row.materno]
        .filter(Boolean)
        .join(' '),
      numDoc: row.num_doc ?? '',
      direFis: row.DireFis ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    return { data, total, page, pageSize, totalPages };
  }

  // ── Combos para el modal de registro ──────────────────────

  /**
   * Tipos de documento — exec Coactivo.SP_Mrecepcion @msquery=1
   * Devuelve id_doc con formato "01/8" donde 01 es el value y 8 la
   * cantidad máxima de dígitos permitidos para el número de documento.
   */
  async getTiposDocumento(): Promise<TipoDocumentoOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_MRECEPCION, {
      msquery: 1,
    });
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      const idDoc = String(vals[0] ?? '');
      const label = String(vals[1] ?? '');
      const [value = '', digits = ''] = idDoc.split('/');
      const maxDigits = parseInt(digits, 10);
      return {
        value: value.trim(),
        maxDigits: Number.isFinite(maxDigits) ? maxDigits : 0,
        label: label.trim(),
      };
    });
  }

  /**
   * Tipos de contribuyente — exec Rentas.sp_Mcontribuyente @busc=7
   * Devuelve id_tipocontri (value) y tipo_detalle (label).
   */
  async getTiposContribuyente(): Promise<TipoContribuyenteOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 7,
    });
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        value: String(vals[0] ?? '').trim(),
        label: String(vals[1] ?? '').trim(),
      };
    });
  }

  /**
   * Subtipos de contribuyente — exec Rentas.sp_Mcontribuyente @busc=8, @id_tipocontri='01'
   */
  async getSubTiposContribuyente(
    idTipoContri: string,
  ): Promise<SubTipoContribuyenteOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 8,
      id_tipocontri: idTipoContri,
    });
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        value: String(vals[0] ?? '').trim(),
        label: String(vals[1] ?? '').trim(),
      };
    });
  }

  // ── Combos Datos Domicilio Fiscal ────────────────────────

  private async getComboByBusc(busc: number): Promise<{ value: string; label: string }[]> {
    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, { busc });
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        value: String(vals[0] ?? '').trim(),
        label: String(vals[1] ?? '').trim(),
      };
    });
  }

  /** @busc=10 — Tipo de Interior */
  async getTiposInterior() {
    return this.getComboByBusc(10);
  }

  /** @busc=11 — Tipo de Edificación */
  async getTiposEdificacion() {
    return this.getComboByBusc(11);
  }

  /** @busc=12 — Tipo de Ingreso */
  async getTiposIngreso() {
    return this.getComboByBusc(12);
  }

  /** @busc=13 — Tipo de Agrupamiento */
  async getTiposAgrupamiento() {
    return this.getComboByBusc(13);
  }

  /**
   * Distritos — exec Contenedor.SP_TblDistrito @msquery=1
   */
  async getDistritos(): Promise<DistritoOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_TBLDISTRITO, {
      msquery: 1,
    });
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        value: String(vals[0] ?? '').trim(),
        label: String(vals[1] ?? '').trim(),
      };
    });
  }

  // ── Búsqueda de vías (modal Domicilio Fiscal) ────────────

  /**
   * Buscar vías por nombre — exec Rentas.SP_vw_Mvias @msquery=2|3
   * @msquery=3 → total (count)
   * @msquery=2 → datos paginados
   */
  async searchVias(
    nombreVia: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<MviaItem>> {
    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    // Total
    const totalResult = await this.db.executeProcedure<any>(this.SP_VW_MVIAS, {
      msquery: 3,
      nombre_via: nombreVia || '',
    });
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    // Datos paginados
    const rowsResult = await this.db.executeProcedure<SpMviaRow>(this.SP_VW_MVIAS, {
      msquery: 2,
      nombre_via: nombreVia || '',
      inicio: String(inicio),
      final: String(final),
    });

    const data: MviaItem[] = (rowsResult.recordset ?? []).map((row) => ({
      codVia: row.cod_via ?? '',
      idZona: row.id_zona ?? '',
      zona: row.nom_zona ?? '',
      idUrba: row.id_urba ?? '',
      urbanizacion: [row.nombabr, row.nombres].filter(Boolean).join(' '),
      via: [row.tipoabr, row.nombre_via].filter(Boolean).join(' '),
      nCuadra: row.vcuadra ?? '',
      nLado: row.lado_via ?? '',
      arancel: row.arancel ?? '',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    return { data, total, page, pageSize, totalPages };
  }

  /**
   * Buscar contribuyente por nº de documento — exec Rentas.sp_Mcontribuyente @busc=26, @num_doc
   * La primera columna del result set indica si fue encontrado (true/false).
   * Devuelve siempre un objeto BuscarContribuyenteResult con `encontrado` en false cuando
   * no hay filas.
   */
  async buscarContribuyentePorDoc(
    numDoc: string,
  ): Promise<BuscarContribuyenteResult> {
    const empty: BuscarContribuyenteResult = {
      encontrado: false,
      nombres: '',
      paterno: '',
      materno: '',
      codigo: '',
      correo_e: '',
      num_doc: numDoc,
    };

    if (!numDoc || !numDoc.trim()) return empty;

    const result = await this.db.executeProcedure<SpMBuscarContribuyenteRow>(
      this.SP_MCONTRIBUYENTE,
      { busc: 26, num_doc: numDoc.trim() },
    );

    const row = result.recordset?.[0] as
      | (SpMBuscarContribuyenteRow & { [key: string]: unknown })
      | undefined;

    if (!row) return empty;

    // La primera columna del result set indica si fue encontrado.
    const firstValue = Object.values(row)[0];
    const encontrado =
      firstValue === true ||
      String(firstValue).trim().toLowerCase() === 'true';

    if (!encontrado) return { ...empty, num_doc: numDoc.trim() };

    return {
      encontrado: true,
      nombres: String(row.nombres ?? '').trim(),
      paterno: String(row.paterno ?? '').trim(),
      materno: String(row.materno ?? '').trim(),
      codigo: String(row.codigo ?? '').trim(),
      correo_e: String(row.correo_e ?? '').trim(),
      num_doc: String(row.num_doc ?? numDoc.trim()).trim(),
    };
  }

  /**
   * Validar si debe agregar representante — exec Rentas.sp_Mcontribuyente @busc=25, @num_doc
   * La primera columna del result set viene como string 'true'/'false'.
   *   'true'  -> pasa el filtro (NO debe agregar representante)
   *   'false' -> debe agregar un representante (debeAgregarRepresentante = true)
   */
  async validarRepresentante(numDoc: string): Promise<ValidarRepresentanteResult> {
    if (!numDoc || !numDoc.trim()) {
      return { debeAgregarRepresentante: false };
    }

    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 25,
      num_doc: numDoc.trim(),
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    if (!row) return { debeAgregarRepresentante: false };

    const firstValue = Object.values(row)[0];
    const firstStr = String(firstValue ?? '').trim().toLowerCase();
    // Regla de negocio (según SP @busc=25, columna como string):
    //   'true'  -> pasa el filtro (NO debe agregar representante)
    //   'false' -> debe agregar un representante
    const debeAgregar = firstStr === 'false';

    return { debeAgregarRepresentante: debeAgregar };
  }

  /**
   * Validar si el contribuyente tiene representante por código — exec Rentas.sp_Mcontribuyente @busc=25, @codigo
   * La primera columna del result set viene como string 'true'/'false'.
   *   'true'  -> tiene representante (NO debe agregar representante)
   *   'false' -> no tiene representante (debeAgregarRepresentante = true)
   */
  async validarRepresentantePorCodigo(codigo: string): Promise<ValidarRepresentanteResult> {
    if (!codigo || !codigo.trim()) {
      return { debeAgregarRepresentante: false };
    }

    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 25,
      codigo: codigo.trim(),
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    if (!row) return { debeAgregarRepresentante: false };

    const firstValue = Object.values(row)[0];
    const firstStr = String(firstValue ?? '').trim().toLowerCase();
    const debeAgregar = firstStr === 'false';

    return { debeAgregarRepresentante: debeAgregar };
  }

  /**
   * Guardar contribuyente (nuevo o actualización) — exec Rentas.sp_Mcontribuyente @busc=1
   * Mapea 1:1 los parámetros del SP. Devuelve el código generado / mensaje.
   */
  async guardar(dto: GuardarContribuyenteDto): Promise<GuardarContribuyenteResult> {
    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 1,
      codigo: dto.codigo ?? '',
      id_pers: dto.id_pers ?? '',
      id_docu: dto.id_docu ?? '',
      num_doc: dto.num_doc ?? '',
      nombres: dto.nombres ?? '',
      paterno: dto.paterno ?? '',
      materno: dto.materno ?? '',
      id_dist: dto.id_dist ?? '',
      tipourb: dto.tipourb ?? '',
      des_urb: dto.des_urb ?? '',
      tipovia: dto.tipovia ?? '',
      des_via: dto.des_via ?? '',
      id_zona: dto.id_zona ?? '',
      id_urba: dto.id_urba ?? '',
      id_via: dto.id_via ?? '',
      referencia: dto.referencia ?? '',
      manzana: dto.manzana ?? '',
      lote: dto.lote ?? '',
      sub_lote: dto.sub_lote ?? '',
      numero: dto.numero ?? '',
      departam: dto.departam ?? '',
      nestado: dto.nestado ?? '',
      motivo: dto.motivo ?? '',
      operador: dto.operador ?? '',
      estacion: dto.estacion ?? '',
      id_tipocontri: dto.id_tipocontri ?? '',
      id_subtipocontri: dto.id_subtipocontri ?? '',
      id_motivo_actualizacion: dto.id_motivo_actualizacion ?? '',
      tipo_interior_id: dto.tipo_interior_id ?? '',
      tipo_edificio_id: dto.tipo_edificio_id ?? '',
      tipo_ingreso_id: dto.tipo_ingreso_id ?? '',
      tipo_agrupamiento_id: dto.tipo_agrupamiento_id ?? '',
      letra1: dto.letra1 ?? '',
      letra2: dto.letra2 ?? '',
      numero2: dto.numero2 ?? '',
      nombre_ingreso: dto.nombre_ingreso ?? '',
      nombre_agrupamiento: dto.nombre_agrupamiento ?? '',
      nombre_edificio: dto.nombre_edificio ?? '',
      piso: dto.piso ?? '',
      numero_interno: dto.numero_interno ?? '',
      letra_interno: dto.letra_interno ?? '',
      correo_e: dto.correo_e ?? '',
      partida_defuncion: dto.partida_defuncion ?? '',
      fecha_defuncion: dto.fecha_defuncion ?? '',
      telefono1: dto.telefono1 ?? '',
      anexo1: dto.anexo1 ?? '',
      telefono2: dto.telefono2 ?? '',
      anexo2: dto.anexo2 ?? '',
      flag_notificar: dto.flag_notificar ?? '',
      idperfil: dto.idperfil ?? '',
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    const mensaje = row ? String(Object.values(row)[0] ?? '').trim() : '';
    let codigo = '';
    if (mensaje.includes(':')) {
      const afterColon = mensaje.split(':').slice(1).join(':').trim();
      const digitsMatch = afterColon.match(/\d+/);
      if (digitsMatch) {
        codigo = digitsMatch[0];
      }
    }
    return { codigo, mensaje };
  }

  /**
   * Obtener contribuyente por código para edición — exec Rentas.sp_Mcontribuyente @busc=4, @codigo
   * Mapeo posicional idéntico al proyecto legacy (índices del SELECT del SP).
   */
  async buscarPorCodigo(codigo: string): Promise<EditarContribuyenteResult> {
    if (!codigo || !codigo.trim()) {
      throw new Error('Código de contribuyente no válido.');
    }

    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 4,
      codigo: codigo.trim(),
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    if (!row) {
      throw new Error('Contribuyente no encontrado.');
    }

    const v = Object.values(row).map((x) => String(x ?? '').trim());
    const get = (i: number) => v[i] ?? '';

    return {
      codigo: get(0),
      idPers: get(1),
      idDocu: get(2),
      numDoc: get(3),
      nombres: get(4),
      paterno: get(5),
      materno: get(6),
      idDist: get(7),
      tipourb: get(8),
      desUrb: get(9),
      tipovia: get(10),
      desVia: get(11),
      idZona: get(12),
      idUrba: get(13),
      idVia: get(14),
      referencia: get(15),
      manzana: get(16),
      lote: get(17),
      subLote: get(18),
      numero: get(19),
      departam: get(20),
      nestado: get(21),
      operador: get(22),
      estacion: get(23),
      fechIng: get(24),
      nomZona: get(27),
      // legacy: nomurba = nombabr + " " + nombre_urba
      nomUrba: [get(28), get(29)].filter(Boolean).join(' '),
      nomVia: get(30),
      tipoContri: get(31),
      subTipoContri: get(32),
      letra1: get(39),
      numero2: get(40),
      letra2: get(41),
      tipoInteriorId: get(42),
      tipoAgrupamientoId: get(43),
      tipoIngresoId: get(44),
      tipoEdificacionId: get(45),
      nombreEdificio: get(46),
      nombreIngreso: get(47),
      nombreAgrupamiento: get(48),
      piso: get(49),
      letraInterno: get(50),
      numeroInterno: get(51),
      correo: get(52),
      partidaDefuncion: get(53),
      fechaDefuncion: get(54),
      telefono1: get(55),
      anexo1: get(56),
      telefono2: get(57),
      anexo2: get(58),
      flagNotificar: get(59),
    };
  }

  // ── Obtener datos del contribuyente + sus representantes (modal Representantes) ──

  /**
   * Datos del contribuyente — exec Rentas.sp_rentasmain @buscar=3, @codigo.
   * Devuelve: codigo, nombres, num_doc, direccion.
   */
  async obtenerRepresentantes(codigo: string): Promise<ObtenerRepresentantesResult> {
    if (!codigo || !codigo.trim()) {
      throw new Error('Código de contribuyente no válido.');
    }

    // ── Datos Contribuyente (sp_rentasmain @buscar=3) ──
    const mainResult = await this.db.executeProcedure<any>(this.SP_RENTASMAIN, {
      buscar: 3,
      codigo: codigo.trim(),
    });

    const mainRow = mainResult.recordset?.[0] as { [key: string]: unknown } | undefined;
    if (!mainRow) {
      throw new Error('Contribuyente no encontrado.');
    }
    const mv = Object.values(mainRow).map((x) => String(x ?? '').trim());
    const datos = {
      codigo: mv[0] ?? '',
      nombres: mv[1] ?? '',
      numDoc: mv[2] ?? '',
      direccion: mv[3] ?? '',
    };

    // ── Representantes (sp_Mrepresentante @busc=4) ──
    const repResult = await this.db.executeProcedure<any>(this.SP_MREPRESENTANTE, {
      busc: 4,
      codigo: codigo.trim(),
    });

    // Soportar tanto recordset como recordsets (primer set)
    let rows: any[] = [];
    if (repResult.recordset && repResult.recordset.length > 0) {
      rows = repResult.recordset;
    } else if (
      repResult.recordsets &&
      (repResult.recordsets as any[]).length > 0 &&
      (repResult.recordsets as any[])[0].length > 0
    ) {
      rows = (repResult.recordsets as any[])[0];
    }

    const representantes: ObtenerRepresentantesResult['representantes'] = rows.map((row: any) => {
      const v = Object.values(row).map((x) => String(x ?? '').trim());
      const get = (i: number) => v[i] ?? '';
      // Mapeo posicional del legacy:
      // 0 lid, 1 codigo, 4+5+6 nombres, 16 nro_documento (legacy),
      // 25 documento (tipo doc), 31 descripcion (tipo relacion), 32 direccion
      return {
        cod: get(0),
        codigo: get(1),
        tipoRelacion: get(31),
        nombres: [get(4), get(5), get(6)].filter(Boolean).join(' '),
        tipoDocumento: get(25),
        nroDocumento: get(3),
        direccion: get(32),
      };
    });

    return { datos, representantes };
  }

  // ── Eliminar contribuyente (sp_Mcontribuyente @busc=3) ──

  /**
   * Ejecuta Rentas.sp_Mcontribuyente @busc=3 con @codigo, @motivo, @operador.
   * El SP devuelve una o más filas; tomamos el primer mensaje de la primera columna.
   */
  async eliminar(dto: EliminarContribuyenteDto): Promise<EliminarContribuyenteResult> {
    if (!dto.codigo || !dto.codigo.trim()) {
      throw new Error('Código de contribuyente no válido.');
    }

    const result = await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
      busc: 3,
      codigo: dto.codigo.trim(),
      motivo: dto.motivo ?? '',
      operador: dto.operador ?? '',
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    const mensaje = row ? String(Object.values(row)[0] ?? '').trim() : '';

    // Mensajes típicos del SP: "SE ELIMINO EL CONTRIBUYENTE N°: ..." o mensajes de error.
    const esError = /no se pudo|error|no existe|no encontrad|duplicad/i.test(mensaje);

    return { success: !esError, mensaje };
  }

  // ── Guardar representante (replica la lógica legacy del PHP) ──
  // Ejecuta sp_Mrepresentante con @busc=tip y, si cod_repre viene vacío,
  // adicionalmente ejecuta sp_Mcontribuyente @busc=1 con tipo 01/01 + datos
  // forzados para crear al representante como contribuyente natural.
  async guardarRepresentante(dto: GuardarRepresentanteDto): Promise<GuardarRepresentanteResult> {
    const tipNum = String(dto.tip ?? '1');

    const result = await this.db.executeProcedure<any>(this.SP_MREPRESENTANTE, {
      busc: tipNum,
      codigo: dto.codigo ?? '',
      id: dto.id ?? '',
      id_docu: dto.id_docu ?? '',
      num_doc: dto.num_doc ?? '',
      nombres: dto.nombres ?? '',
      paterno: dto.paterno ?? '',
      materno: dto.materno ?? '',
      id_dist: dto.id_dist ?? '',
      tipourb: dto.tipourb ?? '',
      des_urb: dto.des_urb ?? '',
      tipovia: dto.tipovia ?? '',
      des_via: dto.des_via ?? '',
      id_zona: dto.id_zona ?? '',
      id_urba: dto.id_urba ?? '',
      id_via: dto.id_via ?? '',
      referencia: dto.referencia ?? '',
      manzana: dto.manzana ?? '',
      lote: dto.lote ?? '',
      sub_lote: dto.sub_lote ?? '',
      numero: dto.numero ?? '',
      departam: dto.departam ?? '',
      nestado: dto.nestado ?? '',
      operador: dto.operador ?? '',
      estacion: dto.estacion ?? '',
      id_tipo_relacion: dto.id_tipo_relacion ?? '',
      letra1: dto.letra1 ?? '',
      numero2: dto.numero2 ?? '',
      letra2: dto.letra2 ?? '',
      piso: dto.piso ?? '',
      numero_interno: dto.numero_interno ?? '',
      letra_interno: dto.letra_interno ?? '',
      tipo_interior_id: dto.tipo_interior_id ?? '',
      tipo_edificio_id: dto.tipo_edificio_id ?? '',
      tipo_ingreso_id: dto.tipo_ingreso_id ?? '',
      tipo_agrupamiento_id: dto.tipo_agrupamiento_id ?? '',
      nombre_edificio: dto.nombre_edificio ?? '',
      nombre_ingreso: dto.nombre_ingreso ?? '',
      nombre_agrupamiento: dto.nombre_agrupamiento ?? '',
      cod_repre: dto.cod_repre ?? '',
    });

    // Obtener id_representante de forma segura (mismo patrón que registro-solicitud.service.ts)
    let idRepresentante = '';
    if (result.recordset && result.recordset.length > 0) {
      const firstRow = result.recordset[0];
      if (firstRow) {
        idRepresentante = firstRow.id_representante ?? firstRow[0] ?? '';
      }
    } else if (result.recordsets && (result.recordsets as any[]).length > 0 && (result.recordsets as any[])[0].length > 0) {
      const firstRow = (result.recordsets as any[])[0][0];
      if (firstRow) {
        idRepresentante = firstRow.id_representante ?? firstRow[0] ?? '';
      }
    }
    idRepresentante = String(idRepresentante ?? '').trim();

    // Si cod_repre está vacío, crear al representante como contribuyente (tipo 01/01) — sp_Mcontribuyente @busc=1
    const codRepre = String(dto.cod_repre ?? '').trim();
    if (codRepre.length <= 0) {
      await this.db.executeProcedure<any>(this.SP_MCONTRIBUYENTE, {
        busc: '1',
        codigo: '',
        id_pers: '',
        id_docu: dto.id_docu ?? '',
        num_doc: dto.num_doc ?? '',
        nombres: dto.nombres ?? '',
        paterno: dto.paterno ?? '',
        materno: dto.materno ?? '',
        id_dist: dto.id_dist ?? '',
        tipourb: dto.tipourb ?? '',
        des_urb: dto.des_urb ?? '',
        tipovia: dto.tipovia ?? '',
        des_via: dto.des_via ?? '',
        id_zona: dto.id_zona ?? '',
        id_urba: dto.id_urba ?? '',
        id_via: dto.id_via ?? '',
        referencia: dto.referencia ?? '',
        manzana: dto.manzana ?? '',
        lote: dto.lote ?? '',
        sub_lote: dto.sub_lote ?? '',
        numero: dto.numero ?? '',
        departam: dto.departam ?? '',
        nestado: dto.nestado ?? '',
        motivo: '',
        operador: dto.operador ?? '',
        estacion: dto.estacion ?? '',
        id_tipocontri: '01',
        id_subtipocontri: '01',
        id_motivo_actualizacion: '99',
        tipo_interior_id: dto.tipo_interior_id ?? '',
        tipo_edificio_id: dto.tipo_edificio_id ?? '',
        tipo_ingreso_id: dto.tipo_ingreso_id ?? '',
        tipo_agrupamiento_id: dto.tipo_agrupamiento_id ?? '',
        letra1: dto.letra1 ?? '',
        letra2: dto.letra2 ?? '',
        numero2: dto.numero2 ?? '',
        nombre_ingreso: dto.nombre_ingreso ?? '',
        nombre_agrupamiento: dto.nombre_agrupamiento ?? '',
        nombre_edificio: dto.nombre_edificio ?? '',
        piso: dto.piso ?? '',
        numero_interno: dto.numero_interno ?? '',
        letra_interno: dto.letra_interno ?? '',
        correo_e: 'representante_update@gmail.com',
        partida_defuncion: 'representante_update',
        fecha_defuncion: '01/01/1999',
        telefono1: '999999999',
        anexo1: '9999',
        telefono2: '999999992',
        anexo2: '9992',
        flag_notificar: '1',
        idperfil: '',
      });
    }

    return { id: idRepresentante };
  }

  // ── Obtener representante por id (sp_Mrepresentante @busc=6, modal Editar Representante) ──
  // Mapeo posicional del legacy PHP (ver EditarRepresentanteResult).
  async obtenerRepresentante(id: string): Promise<EditarRepresentanteResult> {
    if (!id || !id.trim()) {
      throw new Error('Id de representante no válido.');
    }

    const result = await this.db.executeProcedure<any>(this.SP_MREPRESENTANTE, {
      busc: 6,
      id: id.trim(),
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    if (!row) {
      throw new Error('Representante no encontrado.');
    }

    const v = Object.values(row).map((x) => String(x ?? '').trim());
    const get = (i: number) => v[i] ?? '';

    return {
      id: get(0),
      codigo: get(1),
      idDocu: get(2),
      numDoc: get(3),
      nombres: get(4),
      paterno: get(5),
      materno: get(6),
      idDist: get(7),
      tipourb: get(8),
      desUrb: get(9),
      tipovia: get(10),
      desVia: get(11),
      idZona: get(12),
      idUrba: get(13),
      idVia: get(14),
      referencia: get(15),
      manzana: get(16),
      lote: get(17),
      subLote: get(18),
      numero: get(19),
      departam: get(20),
      nestado: get(21),
      operador: get(22),
      estacion: get(23),
      nomZona: get(27),
      nomUrba: get(28),
      nomVia: get(30),
      idTipoRelacion: get(31),
      letra1: get(33),
      numero2: get(34),
      letra2: get(35),
      piso: get(36),
      numeroInterno: get(37),
      letraInterno: get(38),
      tipoInteriorId: get(39),
      tipoEdificacionId: get(40),
      tipoIngresoId: get(41),
      tipoAgrupamientoId: get(42),
      nombreEdificio: get(43),
      nombreIngreso: get(44),
      nombreAgrupamiento: get(45),
    };
  }

  // ── Eliminar representante (sp_Mrepresentante @busc=7) ──
  // Ejecuta el SP con @codigo (contribuyente) + @id (representante).
  async eliminarRepresentante(dto: EliminarRepresentanteDto): Promise<EliminarRepresentanteResult> {
    if (!dto.codigo || !dto.codigo.trim() || !dto.id || !dto.id.trim()) {
      throw new Error('Código e id del representante son obligatorios.');
    }

    const result = await this.db.executeProcedure<any>(this.SP_MREPRESENTANTE, {
      busc: 7,
      codigo: dto.codigo.trim(),
      id: dto.id.trim(),
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    const mensaje = row ? String(Object.values(row)[0] ?? '').trim() : '';

    const esError = /no se pudo|error|no existe|no encontrad|duplicad/i.test(mensaje);

    return { success: !esError, mensaje };
  }

  // ── Vincular representante con contribuyente recién creado (sp_Mrepresentante @busc=13) ──
  // Ejecuta el SP con @busc=13 pasando @codigo (contribuyente) + @id (representante).
  async vincularRepresentante(dto: VincularRepresentanteDto): Promise<VincularRepresentanteResult> {
    await this.db.executeProcedure<any>(this.SP_MREPRESENTANTE, {
      busc: '13',
      codigo: dto.codigo,
      id: dto.id,
    });
    return { success: true };
  }

  // ── Estado de Cuenta (modal): filtros por contribuyente ─────────────────
  // dbo.store_caja_framework:
  //   @msquery=5  → período min/max   | @msquery=6 → año min/max
  //   @msquery=15 → predios           | @msquery=20 → vehículos (placas)
  //   @msquery=21 → fraccionamientos (num_docu)
  async getEstadoCuentaFiltros(codigo: string): Promise<EstadoCuentaFiltrosResult> {
    const cod = codigo.trim();
    if (!cod) {
      throw new Error('Código de contribuyente no válido.');
    }

    const [periodoRes, anioRes, predioRes, vehiculoRes, fracRes] =
      await Promise.all([
        this.db.executeProcedure<any>(this.SP_CAJA_FRAMEWORK, { msquery: 5, codigo: cod }),
        this.db.executeProcedure<any>(this.SP_CAJA_FRAMEWORK, { msquery: 6, codigo: cod }),
        this.db.executeProcedure<any>(this.SP_CAJA_FRAMEWORK, { msquery: 15, codigo: cod }),
        this.db.executeProcedure<any>(this.SP_CAJA_FRAMEWORK, { msquery: 20, codigo: cod }),
        this.db.executeProcedure<any>(this.SP_CAJA_FRAMEWORK, { msquery: 21, codigo: cod }),
      ]);

    // Rangos min/max → listas ("01".."12" / "2008".."2026")
    const periodoRow = periodoRes.recordset?.[0];
    const anioRow = anioRes.recordset?.[0];

    const predios: EstadoCuentaPredioOption[] = (predioRes.recordset ?? []).map(
      (row: any) => {
        const codPred = String(row.cod_pred ?? '').trim();
        const anexo1 = String(row.anexo1 ?? '').trim();
        const direccion = String(row.direccion ?? '').trim();
        return {
          // The recibos SPs filter by MRecibos.cod_pred ONLY (bare predio
          // code, no anexo suffix): appending "-anexo" here made every
          // receipt of the predio fail the cod_pred IN(...) match while
          // predial/multas survived via their '' / codigo escape values.
          // Legacy sent the bare code too.
          value: codPred,
          label: [codPred, anexo1, direccion].filter(Boolean).join('-'),
        };
      },
    );

    return {
      periodos: this.buildRange(periodoRow?.minimo, periodoRow?.maximo, 2),
      // Años del más reciente al más viejo: 2026, 2025, ... 2008
      anios: this.buildRange(anioRow?.minimo, anioRow?.maximo).reverse(),
      predios,
      vehiculos: (vehiculoRes.recordset ?? [])
        .map((row: any) => String(row.cod_pred ?? '').trim())
        .filter(Boolean),
      fraccionamientos: (fracRes.recordset ?? [])
        .map((row: any) => String(row.num_docu ?? '').trim())
        .filter(Boolean),
    };
  }

  /** Genera la lista [min..max] como strings; opcionalmente con padding de ceros. */
  private buildRange(minRaw: unknown, maxRaw: unknown, pad?: number): string[] {
    const min = parseInt(String(minRaw ?? ''), 10);
    const max = parseInt(String(maxRaw ?? ''), 10);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
    const out: string[] = [];
    for (let n = min; n <= max; n++) {
      out.push(pad ? String(n).padStart(pad, '0') : String(n));
    }
    return out;
  }

  // ── Estado de Cuenta (modal): recibos grid ("Mostrar") ──────────────────
  // Port of the legacy conreccontriAction, with a few improvements:
  //   • Named JSON payload instead of the legacy positional array.
  //   • Every filter value is wrapped as *value* — sp_EstCta_Rentas_predecesor
  //     replaces asterisks with quotes to build `in('v1','v2')` clauses.
  //   • Explicit SP selection table (legacy could hit an undefined SP name).
  //   • Rows are mapped by column name (the SPs end with SELECT *) and state
  //     filtering happens server-side instead of inside view code.
  async getEstadoCuentaRecibos(
    dto: EstadoCuentaRecibosDto,
  ): Promise<EstadoCuentaReciboRow[]> {
    // Clients must send PLAIN values ("2026", "02.30"); we wrap each one as
    // *value*. Quotes and asterisks are stripped first because the predecesor
    // SP rewrites asterisks as quotes when building its dynamic IN clauses,
    // so letting them through would corrupt (or inject into) the SQL text.
    const wrapList = (items: string[]): string =>
      items
        .map((item) => item.replace(/['*]/g, "").trim())
        .filter(Boolean)
        .map((item) => `*${item}*`)
        .join(",");

    let tipos = wrapList(dto.conceptos);

    // Arbitrio sub-concepts (11.01 barridos, 11.02 residuos, 11.03 parques,
    // 11.04 serenazgo) are stored in MRecibos.tipo_rec while EVERY arbitrio
    // receipt lives under tipo '11.00'. The predecesor SP only filters by
    // tipo (@tiporec is a vestigial parameter it ignores), so a sub-concept
    // selection must pull the parent concept and then be applied as a
    // row-level filter on the result below.
    const tipoRecFilter = dto.arbitrios
      .map((value) => value.replace(/['*]/g, "").trim())
      .filter(Boolean);
    if (
      tipoRecFilter.length > 0 &&
      !dto.conceptos.some((c) => c.trim() === "11.00")
    ) {
      tipos += (tipos ? "," : "") + "*11.00*";
    }

    // Legacy rule: criteria 9-12 also request companion "beneficio" concept
    // codes when their base concept (arbitrios/predial/vehicular/alcabala)
    // is present in the filter.
    if ([9, 10, 11, 12].includes(dto.criterio)) {
      const companions: ReadonlyArray<readonly [string, string]> = [
        ['11.00', '*00.47*'],
        ['02.01', '*00.46*'],
        ['00.30', '*00.48*'],
        ['00.38', '*00.50*'],
      ];
      const extras = companions
        .filter(([needle]) => tipos.includes(needle))
        .map(([, extra]) => extra)
        .filter((extra) => !tipos.includes(extra));
      if (extras.length > 0) {
        tipos += `,${extras.join(',')}`;
      }
    }

    // Legacy quirk kept on purpose: the SP has no native "por compensar"
    // state, so we ask it for pending rows ('0') and keep only negative
    // reajuste rows in the filter below.
    const estadoParam = dto.estado === '3' ? '0' : dto.estado;

    const result = await this.db.executeProcedure<Record<string, unknown>>(
      this.resolveRecibosSp(dto.criterio, dto.soloCoactivo),
      {
        codigo: dto.codigo.trim(),
        annos: wrapList(dto.anios),
        tipos,
        tiporec: wrapList(dto.arbitrios),
        perio: wrapList(dto.periodos),
        predio: wrapList(dto.predios),
        vehiculo: wrapList(dto.vehiculos),
        estado: estadoParam,
        criterio: String(dto.criterio),
        fracciona: wrapList(dto.fraccionamientos),
      },
      undefined,
      190_000, // heavy queries — same budget as the legacy store proxy
    );

    return ((result.recordset ?? []) as Array<Record<string, unknown>>)
      .map((raw) => this.mapEstadoCuentaReciboRow(raw))
      .filter((row) => {
        switch (dto.estado) {
          case '0':
            return row.impReaj >= 0; // pendiente
          case '3':
            return row.impReaj < 0; // por compensar (saldo a favor)
          default:
            return true; // cancelado / todo
        }
      })
      .filter(
        (row) =>
          tipoRecFilter.length === 0 ||
          row.tipo !== '11.00' ||
          tipoRecFilter.includes(row.tipoRec),
      );
  }

  /** Maps the legacy button criterion (+ Solo Coactivo flag) to its SP. */
  private resolveRecibosSp(criterio: number, soloCoactivo: boolean): string {
    if (criterio === 12) {
      return soloCoactivo
        ? 'Caja.sp_EstCta_Rentas_Coactivo_amnistia'
        : 'Caja.sp_EstCta_Rentas_amnistia_2026';
    }
    if (soloCoactivo) {
      return 'Caja.sp_EstCta_Rentas_Coactivo';
    }
    switch (criterio) {
      case 8:
        return 'Caja.sp_EstCta_Rentas_Fracc_2025';
      case 11:
        return 'Caja.sp_EstCta_Rentas_2021';
      default:
        return 'Caja.sp_EstCta_Rentas';
    }
  }

  private mapEstadoCuentaReciboRow(
    raw: Record<string, unknown>,
  ): EstadoCuentaReciboRow {
    const str = (key: string): string => String(raw[key] ?? '').trim();
    const num = (key: string): number => Number(raw[key] ?? 0) || 0;

    const tipo = str('tipo');
    const anexo = str('anexo');
    const subAnexo = str('sub_anexo');
    const impReaj = num('imp_reaj');
    const interes = num('mora');
    const costoEmision = num('costo_emis');
    const totPagado = num('tot_pago');

    return {
      idrecibo: str('idrecibo'),
      codigo: str('codigo'),
      tipo,
      anno: str('anno'),
      codPred: str('cod_pred'),
      anexo,
      subAnexo,
      detAnexo: tipo === '11.00' && anexo ? `${anexo}-${subAnexo}` : '',
      tipoRec: str('tipo_rec'),
      periodo: str('periodo'),
      impInsol: num('imp_insol'),
      costoEmision,
      impReaj,
      interes,
      desTipo: str('des_tipo'),
      desCabecera: str('des_cabecera'),
      ubica: str('ubica_2') || str('ubica'),
      benefic: num('descuento'),
      total: Number((impReaj + interes + costoEmision - totPagado).toFixed(2)),
      totPagado,
    };
  }

  // ── Generar Liquidación DJ (Estado de Cuenta modal) ─────────────────

  async generarLiquidacionDJ(
    dto: GenerarLiquidacionDJDto,
  ): Promise<GenerarLiquidacionDJResult> {
    const SP_LIQUIDACION = '[Caja].[pa_liquidacion]';
    const cod = dto.codigo.trim();
    const dtz = new Date().toLocaleDateString('es-PE');

    // ── Step 1: VT Validation (conditional — only if vt array is non-empty) ──
    if (dto.vt && dto.vt.length > 0) {
      // Get num_val for each VT receipt
      const vtNumVals: { idrecibo: number; num_val: string }[] = [];
      for (const vt of dto.vt) {
        const vtResult = await this.db.executeProcedure<any>(SP_LIQUIDACION, {
          msquery: 14,
          idrecibo: Number(vt.idrecibo),
          codigo: vt.codigo,
        });
        const vtRow = vtResult.recordset?.[0];
        if (vtRow) {
          const numVal = String(vtRow.num_val ?? Object.values(vtRow)[0] ?? '').trim();
          vtNumVals.push({ idrecibo: Number(vt.idrecibo), num_val: numVal });
        }
      }

      // Group VT receipts by num_val
      const grouped = new Map<string, number[]>();
      for (const item of vtNumVals) {
        if (!item.num_val) continue;
        const ids = grouped.get(item.num_val) || [];
        ids.push(item.idrecibo);
        grouped.set(item.num_val, ids);
      }

      // For each group, verify all receipts exist in the valor tributario
      for (const [numVal, ids] of grouped.entries()) {
        if (ids.length === 0) continue;

        const idsStr = ids.join(',');

        const foundResult = await this.db.query<{ encontrados: number; num_val: string; id_valor: number; ano_val: number }>(
          `SELECT COUNT(*) as encontrados, rm.num_val, rm.id_valor, rm.ano_val
           FROM Rentas.Mvalores rm WITH(NOLOCK)
           INNER JOIN Rentas.Dvalores rd WITH(NOLOCK) ON rd.id_valor = rm.id_valor AND rd.num_val = rm.num_val AND rd.ano_val = rm.ano_val AND rm.nestado = '1'
           INNER JOIN Caja.MRecibos r ON rd.idrecibo = r.idrecibo
           WHERE rm.num_val = @num_val AND rd.idrecibo IN (${idsStr}) AND r.estado <> 1
           GROUP BY rm.num_val, rm.id_valor, rm.ano_val`,
          { num_val: numVal },
        );

        const foundRow = foundResult.recordset?.[0];
        if (!foundRow) {
          return {
            success: false,
            error: `Existen periodos faltantes para la Liquidación del Valor Tributario: ${numVal}`,
          };
        }

        const totalResult = await this.db.query<{ total_recibos: number }>(
          `SELECT COUNT(*) as total_recibos
           FROM Rentas.Dvalores rd WITH(NOLOCK)
           INNER JOIN Caja.MRecibos r ON rd.idrecibo = r.idrecibo
           WHERE rd.id_valor = @id_valor AND rd.num_val = @num_val AND rd.ano_val = @ano_val AND r.estado <> 1`,
          { id_valor: foundRow.id_valor, num_val: numVal, ano_val: foundRow.ano_val },
        );

        const totalRow = totalResult.recordset?.[0];
        const totalRecibos = totalRow ? Number(totalRow.total_recibos ?? 0) : 0;

        if (foundRow.encontrados !== totalRecibos) {
          return {
            success: false,
            error: `Existen periodos faltantes para la Liquidación del Valor Tributario: ${numVal}`,
          };
        }
      }
    }

    // ── Step 2: Create Header (@msquery=1) ──
    const firstReceipt = dto.liquidacion[0];
    const observacion = `${firstReceipt.anexo || ''}/${firstReceipt.sub_anexo || ''}`;

    this.logger.log(
      `[liquidacion-dj] Step 2 pa_liquidacion(@msquery=1) | monto=${dto.totalp} codigo=${cod}`,
    );

    let nliqui = '';
    let idliqui = '';

    const headerResult = await this.db.executeProcedure(
      SP_LIQUIDACION,
      {
        msquery: 1,
        codigo: cod,
        monto: dto.totalp,
        usuario: dto.usuario || 'USUARIO',
        terminal: 'NIMAGEN01',
        observacion,
        fec_venci: dtz,
      },
      {
        msquery: mssql.Int,
        codigo: mssql.VarChar(20),
        monto: mssql.Float,
        usuario: mssql.VarChar(50),
        terminal: mssql.VarChar(50),
        observacion: mssql.NVarChar(4000),
        fec_venci: mssql.VarChar(30),
      },
    );

    const headerRow = headerResult.recordset?.[0] as Record<string, unknown> | undefined;
    this.logger.log(
      `[liquidacion-dj] Step 2 result: ${JSON.stringify(headerRow ?? {})}`,
    );

    if (headerRow) {
      nliqui = String(headerRow.nliqui ?? Object.values(headerRow)[0] ?? '');
      idliqui = String(headerRow.idliqui ?? Object.values(headerRow)[1] ?? '');
    }

    if (!nliqui) {
      return { success: false, error: 'No se pudo crear la cabecera de liquidación' };
    }

    // ── Step 3: Batch Insert Details (@msquery=15) ──
    // NOTA: Caja.tbl_dliquidacion.cod_pre es char(14) (dev Y prod). Con
    // ANSI_WARNINGS ON (driver node-mssql) un valor más largo aborta con
    // error 2628 → el SP responde FALSO. El legacy rodaba con ANSI_WARNINGS
    // OFF, así que truncaba silenciosamente. Se trunca aquí explícitamente
    // para respetar ese comportamiento (p.ej. "IP-Ord-2026-0020" → 14 chars).
    const detalles = dto.liquidacion.map((item, index) => ({
      secuencia: index + 1,
      idrecibo: Number(item.idrecibo),
      anno: item.anno,
      cod_pre: (item.cod_pred ?? '').trim().substring(0, 14),
      anexo: (item.anexo || '').substring(0, 4),
      sub_anexo: (item.sub_anexo || '').substring(0, 4),
      tipo: (item.tipo ?? '').substring(0, 5).trim(),
      tipo_rec: (item.tipo_rec ?? '').substring(0, 5).trim(),
      periodo: (item.periodo ?? '').substring(0, 2),
      imp_insol: item.imp_reaj,
      imp_mora: item.mora,
      costo_emi: item.costo_emis,
      fact_mora: item.fact_mora,
      descuento: item.benefic,
    }));

    this.logger.log(
      `[liquidacion-dj] Step 3 pa_liquidacion(@msquery=15) | nliqui=${nliqui} idliqui=${idliqui} detalles=${detalles.length}`,
    );

    const detailsResult = await this.db.executeProcedure(
      SP_LIQUIDACION,
      {
        msquery: 15,
        numero: nliqui,
        idlq: Number(idliqui) || 0,
        detalles: JSON.stringify(detalles),
      },
      {
        msquery: mssql.Int,
        numero: mssql.VarChar(15),
        idlq: mssql.Int,
        detalles: mssql.NVarChar(mssql.MAX),
      },
    );

    const detailsRow = detailsResult.recordset?.[0];
    const firstCol = detailsRow ? String(Object.values(detailsRow)[0] ?? '').trim() : '';

    this.logger.log(
      `[liquidacion-dj] Step 3 result: ${firstCol}`,
    );

    if (firstCol !== 'CORRECTO') {
      return { success: false, error: 'Error al insertar detalles de liquidación' };
    }

    // ── Step 4: Verify Totals (@msquery=11) ──
    this.logger.log(
      `[liquidacion-dj] Step 4 pa_liquidacion(@msquery=11) | nliqui=${nliqui} expectedTotal=${dto.totalp}`,
    );

    const verifyResult = await this.db.executeProcedure<{ total: number }>(
      SP_LIQUIDACION,
      { msquery: 11, numero: nliqui },
    );

    const verifyRow = verifyResult.recordset?.[0];
    const spTotal = verifyRow ? Number(verifyRow.total ?? Object.values(verifyRow)[0] ?? 0) : 0;

    this.logger.log(
      `[liquidacion-dj] Step 4 result: spTotal=${spTotal} expectedTotal=${dto.totalp}`,
    );

    const diff = Math.abs(spTotal - dto.totalp);
    if (diff > 0.01) {
      return { success: false, error: 'Error de verificación: total no coincide' };
    }

    this.logger.log(
      `[liquidacion-dj] Liquidación generada: ${nliqui} para código ${cod}`,
    );

    return { success: true, idliqui, nliqui };
  }

  // ── Reporte Liquidación ──────────────────────────────────

  /**
   * Obtiene los datos para el reporte de impresión de una liquidación.
   * SP: [Caja].[pa_liquidacion] (@msquery=9, @idlq=<idliqui>)
   * Retorna: nombre, domicilio, código, n° liquidación, fecha,
   *          y filas de detalle (año, tributo, monto).
   */
  async getLiquidacionReporte(
    idliqui: string,
  ): Promise<LiquidacionReporteData> {
    const result = await this.db.executeProcedure<Record<string, unknown>>(
      '[Caja].[pa_liquidacion]',
      { msquery: 9, idlq: Number(idliqui) },
      { msquery: mssql.Int, idlq: mssql.Int },
    );

    const rows = (result.recordset ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      throw new Error('No se encontraron datos para la liquidación especificada.');
    }

    // First row carries header fields; all rows carry detail fields.
    const first = rows[0];

    // The SP may return named columns or positional. We try common names
    // first and fall back to positional index (matching the legacy PHP code).
    const str = (v: unknown): string => String(v ?? '').trim();
    const num = (v: unknown): number => Number(v ?? 0);

    const nombre = str(first.nombre ?? first.Name ?? Object.values(first)[0]);
    const domicilio = str(first.domicilio ?? first.Direccion ?? Object.values(first)[1]);
    const nliqui = str(first.nliqui ?? first.numero ?? first.NumLiq ?? Object.values(first)[2]);
    const codigo = str(first.codigo ?? first.Codigo ?? Object.values(first)[3]);
    const fecha = str(first.fecha ?? first.Fecha ?? Object.values(first)[7]);
    const usuario = str(first.usuario ?? first.Usuario ?? Object.values(first)[8]);

    const detalles: LiquidacionReporteDetalle[] = rows.map((row) => ({
      anno: str(row.anno ?? row.Anno ?? row.YEAR ?? Object.values(row)[4]),
      tipo_general: str(row.tipo_general ?? row.descripcion ?? row.Tipo ?? Object.values(row)[5]),
      monto: num(row.monto ?? row.Monto ?? row.importe ?? Object.values(row)[6]),
    }));

    const totalNeto = detalles.reduce((sum, d) => sum + d.monto, 0);

    return {
      nombre,
      domicilio,
      codigo,
      nliqui,
      fecha,
      usuario,
      detalles,
      totalNeto,
    };
  }

  // ── Ver Pagos (Rentas.Recibos_reporte) ──────────────────────

  /**
   * Obtiene los pagos de un contribuyente para el reporte "Ver Pagos".
   * SP: [Rentas].[Recibos_reporte] (@buscar=2, @codigo=<codigo>)
   * Agrupa filas por nro_recibo: flag=1 es cabecera, flag=0 es detalle.
   */
  async getVerPagos(codigo: string): Promise<VerPagosData> {
    const result = await this.db.executeProcedure<Record<string, unknown>>(
      '[Rentas].[Recibos_reporte]',
      { buscar: 2, codigo: codigo.trim() },
      { buscar: mssql.Int, codigo: mssql.VarChar(20) },
    );

    const rows = (result.recordset ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      return { recibos: [] };
    }

    const str = (v: unknown): string => String(v ?? '').trim();
    const num = (v: unknown): number => Number(v ?? 0);

    // Group rows by nro_recibo. flag=1 → header row, flag=0 → detail row.
    const reciboMap = new Map<string, VerPagosRecibo>();

    for (const row of rows) {
      const nroRecibo = str(row.nro_recibo ?? Object.values(row)[0]);
      const flag = str(row.flag ?? Object.values(row)[14]);

      if (flag === '1') {
        // Header row — creates/updates the receipt
        reciboMap.set(nroRecibo, {
          nroRecibo,
          fechaPago: str(row.fecha_pago ?? Object.values(row)[1]),
          totalPagado: num(row.total_pagado ?? Object.values(row)[2]),
          contribuyente: str(row.contribuyente ?? Object.values(row)[9]),
          banco: str(row.banco ?? Object.values(row)[15]),
          detalles: [],
        });
      } else {
        // Detail row — append to existing receipt
        const recibo = reciboMap.get(nroRecibo);
        if (recibo) {
          recibo.detalles.push({
            anno: str(row.anno ?? Object.values(row)[3]),
            codObligacion: str(row.cod_obligacion ?? Object.values(row)[4]),
            cuota: str(row.cuota ?? Object.values(row)[5]),
            tributo: str(row.tributo ?? Object.values(row)[6]),
            totalPagado: num(row.total_pagado_det ?? Object.values(row)[7]),
            descuento: num(row.descuento ?? Object.values(row)[8]),
            insoluto: num(row.insoluto ?? Object.values(row)[10]),
            intereses: num(row.intereses ?? Object.values(row)[11]),
            emision: num(row.emision ?? Object.values(row)[12]),
            codReferencia: str(row.cod_referencia ?? Object.values(row)[13]),
          });
        }
      }
    }

    return { recibos: Array.from(reciboMap.values()) };
  }

  // ── Deuda Consolidada (Caja.sp_Imprime_EstCta_4version) ──

  /**
   * Obtiene el reporte "Deuda Consolidada" de un contribuyente.
   * - Cabecera: [Caja].[sp_Imprime_EstCta] (@buscar=1) → nombre, domicilio, fecha
   * - Cuerpo:   [Caja].[sp_Imprime_EstCta_4version_2020|_2021] según criterio
   *             (0 → _2020, otro → _2021) → codigo, anno, tipoagr, saldo
   * Las filas se agrupan por año en el builder del frontend.
   */
  async getDeudaConsolidado(dto: DeudaConsolidadoDto): Promise<DeudaConsolidadoData> {
    const wrapList = (items: string[]): string =>
      items
        .map((item) => item.replace(/['*]/g, '').trim())
        .filter(Boolean)
        .map((item) => `*${item}*`)
        .join(',');

    const codigo = dto.codigo.trim();

    // ── Header: [Caja].[sp_Imprime_EstCta] (@buscar=1) ──
    const headerResult = await this.db.executeProcedure<Record<string, unknown>>(
      '[Caja].[sp_Imprime_EstCta]',
      { buscar: 1, codigo },
      { buscar: mssql.Int, codigo: mssql.VarChar(20) },
    );
    const headerRow = (headerResult.recordset ?? [])[0] ?? {};

    const str = (v: unknown): string => String(v ?? '').trim();
    const num = (v: unknown): number => Number(v ?? 0) || 0;

    const cabecera = {
      codigo: str(headerRow.codigo ?? Object.values(headerRow)[0] ?? codigo),
      nombre: str(headerRow.nombre ?? Object.values(headerRow)[1]),
      direccion: str(headerRow.direccion ?? Object.values(headerRow)[2]),
      fecEmision: str(headerRow.fec_emision ?? Object.values(headerRow)[3]),
      horEmision: str(headerRow.hor_emision ?? Object.values(headerRow)[4]),
      tipoDoc: str(headerRow.tipo_doc ?? Object.values(headerRow)[5]),
      ndoc: str(headerRow.ndoc ?? Object.values(headerRow)[6]),
    };

    // ── Body: choose SP variant by criterion (0 → _2020, else → _2021) ──
    const bodySp = dto.criterio === 0
      ? '[Caja].[sp_Imprime_EstCta_4version_2020]'
      : '[Caja].[sp_Imprime_EstCta_4version_2021]';

    const resumen = dto.resumen ? 1 : 0;
    const detalle = dto.detalle ? 1 : 0;
    const agrupar = dto.agrupar ? 1 : 0;

    const bodyResult = await this.db.executeProcedure<Record<string, unknown>>(
      bodySp,
      {
        codigo,
        resumen,
        detalle,
        agrupar,
        perio: wrapList(dto.periodos),
        annos: wrapList(dto.anios),
        tipos: wrapList(dto.conceptos),
        tiporec: wrapList(dto.arbitrios),
        predio: wrapList(dto.predios),
        vehiculo: wrapList(dto.vehiculos),
        estado: dto.estado,
        criterio: String(dto.criterio),
        fracciona: wrapList(dto.fraccionamientos),
      },
      undefined,
      190_000, // heavy queries — same budget as the legacy store proxy
    );

    const filas: DeudaConsolidadoData['filas'] = (
      (bodyResult.recordset ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      codigo: str(row.codigo ?? Object.values(row)[0] ?? codigo),
      anno: str(row.anno ?? Object.values(row)[1]),
      tipoagr: str(row.tipoagr ?? Object.values(row)[2]),
      saldo: num(row.saldo ?? Object.values(row)[3]),
    }));

    return { cabecera, filas };
  }

  // ── Generar Deuda — conceptos (Rentas.sp_generardeuda @busc=10) ─────────

  async getGenerarDeudaConcepto(
    dto: GenerarDeudaConceptoDto,
  ): Promise<GenerarDeudaConcepto[]> {
    const str = (v: unknown): string => String(v ?? '').trim();

    const result = await this.db.executeProcedure<Record<string, unknown>>(
      'Rentas.sp_generardeuda',
      { busc: '10', codigo_area: dto.codigo_area.trim() },
      { busc: mssql.VarChar(5), codigo_area: mssql.VarChar(10) },
      60_000, // small lookup — 60s is plenty
    );

    return (result.recordset ?? []).map((row) => ({
      tipo: str(row.tipo ?? Object.values(row)[0]),
      concepto: str(row.concepto ?? Object.values(row)[1]),
    }));
  }

  // ── Generar Deuda — Guardar (Rentas.sp_generardeuda @busc=12) ─────────

  async guardarGenerarDeuda(
    dto: GenerarDeudaGuardarDto,
  ): Promise<{ idMulta: string | null }> {
    const str = (v: unknown): string => String(v ?? '').trim();

    // Normalize fecha_multa to dd/MM/yyyy so SQL Server (language=Spanish,
    // datetime column) parses it unambiguously via CONVERT(datetime, ..., 103).
    // Accepts both ISO (YYYY-MM-DD from <input type="date">) and dd/MM/yyyy.
    const fechaMultaNorm = this.normalizeFechaMulta(dto.fecha_multa);

    const result = await this.db.executeProcedure<Record<string, unknown>>(
      'Rentas.sp_generardeuda',
      {
        busc: 12,
        codigo: dto.codigo,
        hasta: dto.anio_hasta,
        desde: dto.anio_desde,
        codigo_infraccion: dto.codigo_infraccion,
        monto_multa: dto.monto_multa,
        fecha_multa: fechaMultaNorm,
        operador: dto.operador,
        estacion: dto.estacion,
        glosa: dto.glosa ?? '',
      },
      {
        busc: mssql.Int,
        codigo: mssql.VarChar(7),
        hasta: mssql.VarChar(4),
        desde: mssql.VarChar(4),
        codigo_infraccion: mssql.VarChar(10),
        monto_multa: mssql.Decimal(12, 2),
        // VarChar(10) — fecha en formato dd/MM/yyyy. El SP hace
        // CONVERT(datetime, @fecha_multa, 103). No usar mssql.Date porque
        // el driver interpreta según timezone del servidor y rompe el insert.
        fecha_multa: mssql.VarChar(10),
        operador: mssql.VarChar(50),
        estacion: mssql.VarChar(50),
        glosa: mssql.NVarChar(4000),
      },
      30_000, // 30s es más que suficiente para un INSERT individual.
              // El SP @busc=12 hace un WHILE por cada año entre @desde/@hasta;
              // en BD de pruebas con hasta=2026 tarda ~1.7s. Si supera 30s,
              // algo está mal (lock, índice faltante, bucle). Preferimos ver
              // el error rápido a esperar 2 minutos.
    );

    // El SP emite múltiples recordsets:
    //   • 'Actualizado correctamente.. '  (vuelta exitosa del WHILE)
    //   • 'NIMI'                         (cuando no insertó)
    //   • 'fallla'                       (cuando falló el INSERT)
    // Buscamos el id real barriendo todos los recordsets. Un id válido es
    // numérico (no es ninguno de los mensajes de estado).
    const allRecordSets = result.recordsets ?? [];
    let idMulta: string | null = null;
    for (const rs of allRecordSets) {
      for (const row of rs ?? []) {
        const candidate =
          str((row as any).idmulta) ||
          str((row as any).id_multa) ||
          str((row as any).id) ||
          str(Object.values(row as object)[0]);
        // Mensajes de estado del SP — los ignoramos
        if (
          candidate &&
          candidate !== 'Actualizado correctamente.. ' &&
          candidate !== 'Actualizado correctamente.' &&
          candidate !== 'NIMI' &&
          candidate !== 'fallla' &&
          candidate !== 'Falta Codigo Infraccion'
        ) {
          idMulta = candidate;
          break;
        }
      }
      if (idMulta) break;
    }

    return { idMulta };
  }

  /**
   * Normaliza la fecha_multa a formato `dd/MM/yyyy` para que SQL Server
   * (idioma Spanish, columna datetime) la parsee sin ambigüedad.
   *
   *   "2026-08-31"  -> "31/08/2026"
   *   "31/08/2026"  -> "31/08/2026"
   *   "" o null     -> ""  (deja que el SP valide el faltante)
   */
  private normalizeFechaMulta(raw: string | null | undefined): string {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s) return '';

    // YYYY-MM-DD -> dd/MM/yyyy
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    // Already dd/MM/yyyy — validate shape to catch typos early.
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

    // Last resort: try Date.parse but DO NOT trust timezone. Return as-is
    // and let the SP raise a clear conversion error if it's truly bad.
    return s;
  }

  // ─── Fraccionar Deuda ────────────────────────────────────────────────────
  //
  // Replica los 3 endpoints legacy (Zend PHP):
  //   • condicionfrac    → [Rentas].[CondicionConvenio] @busc=1
  //   • fraccionar/index → dbo.sp_getfecha + cálculo de porcen_inicial
  //   • muestracuotas    → Rentas.CuotasConvenio
  //
  // La validación de "gastos/costas/fraccionamiento seleccionados" y
  // "exactamente un tipo de deuda (IP/ARB/VEH/MULT)" se hace en el
  // frontend antes de invocar estos métodos (mirror del JS legado).

  /**
   * Consulta las condiciones de fraccionamiento para un contribuyente.
   * SP: [Rentas].[CondicionConvenio] (@busc=1, @codigo, @param)
   * Retorna el string crudo (6 partes separadas por '*'):
   *   estado | porc_fracc | monto_min | porc_ini | max_cuotas | condicion_id
   */
  async verificarCondicionFraccionamiento(
    codigo: string,
    param: string,
  ): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure<Record<string, unknown>>(
        '[Rentas].[CondicionConvenio]',
        { busc: 1, codigo, param },
      );
      const data = result.recordset?.[0]
        ? String(Object.values(result.recordset[0] as object)[0] ?? '')
        : '';
      return { success: true, data, message: 'Condición verificada.' };
    } catch (error) {
      this.logger.error('Error al verificar condición de fraccionamiento:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al consultar las condiciones de fraccionamiento.',
      };
    }
  }

  /**
   * SP: dbo.sp_getfecha (sin parámetros) — devuelve una fila con
   *   [0] = fecha
   *   [1] = vencimiento (legacy usa [0] también, pero lo exponemos por si)
   *   [2] = interes
   *   [3] = porcen_inicial (% por defecto del sistema)
   *
   * Luego aplica las reglas del legado (fraccionar/indexAction):
   *   • Si estado==1 y param!=2 → porcen_inicial = porc_ini (excepción).
   *   • Si param==1             → max_cuotas = 25 (ordinario).
   *   • Si param==2             → max_cuotas = 11, porc_ini = porcen_inicial
   *                              (beneficio arbitrios casa habitación).
   */
  async getDatosInicialesFraccionar(dto: {
    codigo: string;
    totalpagar: number;
    param: string;
    porc_ini?: string;
    max_cuotas?: string;
    condicion_id?: string;
    estado?: string;
    tipo_deuda?: string;
  }): Promise<{
    success: boolean;
    data?: {
      fecha: string;
      vencimiento: string;
      interes: string;
      porcenInicial: number;
      montoInicial: number;
      saldo: number;
      maxCuotas: number;
      porcIni: number;
      condicionId: string;
      estado: string;
      flag: string;
      codigo: string;
      tipoDeuda: string;
      totalpagar: number;
      emision: string;
    };
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<Record<string, unknown>>(
        'dbo.sp_getfecha',
      );
      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      if (!row) {
        return {
          success: false,
          message: 'sp_getfecha no devolvió resultados.',
        };
      }
      const vals = Object.values(row);
      const fecha = String(vals[0] ?? '');
      const vencimiento = String(vals[1] ?? vals[0] ?? ''); // legado usa [0] para ambos
      const interes = String(vals[2] ?? '');
      let porcenInicial = Number(vals[3] ?? 0);
      const totalpagar = Number(dto.totalpagar) || 0;

      // Reglas del legado: el estado/param controlan las excepciones.
      const estado = String(dto.estado ?? '');
      const param = String(dto.param ?? '1');
      const porcIniInput = Number(dto.porc_ini ?? 0);

      let porcIni = porcIniInput;
      let maxCuotas = Number(dto.max_cuotas ?? 0) || 0;

      if (estado === '1' && param !== '2') {
        porcenInicial = porcIniInput || porcenInicial;
      } else {
        if (param === '1') {
          maxCuotas = 25;
        } else if (param === '2') {
          maxCuotas = 11;
          porcIni = porcenInicial;
        }
      }

      const montoInicial = Math.round(totalpagar * porcenInicial) / 100;
      const saldo = Math.round((totalpagar - montoInicial) * 100) / 100;

      return {
        success: true,
        data: {
          fecha,
          vencimiento,
          interes,
          porcenInicial,
          montoInicial,
          saldo,
          maxCuotas,
          porcIni,
          condicionId: String(dto.condicion_id ?? ''),
          estado,
          flag: param,
          codigo: dto.codigo,
          tipoDeuda: String(dto.tipo_deuda ?? ''),
          totalpagar,
          emision: '0.00',
        },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al obtener datos iniciales de fraccionamiento:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al obtener los datos iniciales del fraccionamiento.',
      };
    }
  }

  /**
   * SP: Rentas.CuotasConvenio (@cuotas, @total_deuda, @total_inici,
   *     @fec_gen, @fec_cuo) — devuelve N filas con la grilla de cuotas.
   * Mapeo de columnas (mirror exacto del que usa papeleta-transito):
   *   [0] cuota   [1] anno   [2] total_deuda   [3] cuota_ini
   *   [4] saldo_deuda   [5] monto_cuota   [6] intereses
   *   [7] cuota_total   [8] total_frac   [9] cuotas   [10] fec_gen
   */
  async calcularCuotasConvenio(dto: {
    cuotas: number;
    total_deuda: number;
    total_inici: number;
    fec_gen: string;
    fec_cuo: string;
  }): Promise<{
    success: boolean;
    data?: Array<{
      cuota: string;
      anno: string;
      totalDeuda: string;
      cuotaIni: string;
      saldoDeuda: string;
      montoCuota: string;
      intereses: string;
      cuotaTotal: string;
      totalFrac: string;
      cuotas: string;
      fecGen: string;
    }>;
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<Record<string, unknown>>(
        'Rentas.CuotasConvenio',
        {
          cuotas: dto.cuotas,
          total_deuda: dto.total_deuda,
          total_inici: dto.total_inici,
          fec_gen: dto.fec_gen,
          fec_cuo: dto.fec_cuo,
        },
      );
      const rows = (result.recordset ?? []).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const isArr = Array.isArray(row);
        const getVal = (idx: number, key: string): unknown => {
          if (isArr) return (row as unknown[])[idx];
          if (r[key] !== undefined) return r[key];
          const keys = Object.keys(r);
          return keys[idx] !== undefined ? r[keys[idx]] : '';
        };
        return {
          cuota: String(getVal(0, 'cuota') ?? ''),
          anno: String(getVal(1, 'anno') ?? ''),
          totalDeuda: String(getVal(2, 'total_deuda') ?? ''),
          cuotaIni: String(getVal(3, 'cuota_ini') ?? ''),
          saldoDeuda: String(getVal(4, 'saldo_deuda') ?? ''),
          montoCuota: String(getVal(5, 'monto_cuota') ?? ''),
          intereses: String(getVal(6, 'intereses') ?? ''),
          cuotaTotal: String(getVal(7, 'cuota_total') ?? ''),
          totalFrac: String(getVal(8, 'total_frac') ?? ''),
          cuotas: String(getVal(9, 'cuotas') ?? ''),
          fecGen: String(getVal(10, 'fec_gen') ?? ''),
        };
      });
      return { success: true, data: rows, message: 'Cuotas calculadas.' };
    } catch (error) {
      this.logger.error('Error al calcular cuotas:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al calcular las cuotas.',
      };
    }
  }

  /**
   * Lookup de Apoderado (legacy: fraccionar/contribuyente).
   * Consulta la función tabla-valorada `SELECT * FROM [Rentas].[Contribuyente](@codigo)`
   * con parámetro enlazado (NO interpolación → anti SQL-injection).
   * El código se rellena defensivamente con ceros a la izquierda hasta 7 chars.
   * Devuelve una fila: doc | paterno | materno | nombre | tipopersona,
   * expuesta como campos tipados. Si no hay fila → success:false.
   */
  async getApoderadoConvenio(codigo: string): Promise<{
    success: boolean;
    data?: {
      doc: string;
      paterno: string;
      materno: string;
      nombre: string;
      tipoPersona: string;
    };
    message: string;
  }> {
    try {
      const padded = String(codigo).trim().padStart(7, '0');
      const result = await this.db.queryWithParams<Record<string, unknown>>(
        'SELECT * FROM [Rentas].[Contribuyente](@codigo)',
        { codigo: padded },
      );
      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      if (!row) {
        return { success: false, message: 'No se encontró el Apoderado.' };
      }
      const keys = Object.keys(row);
      const getVal = (key: string, idx: number): string => {
        if (row[key] !== undefined) return String(row[key] ?? '').trim();
        return keys[idx] !== undefined ? String(row[keys[idx]] ?? '').trim() : '';
      };
      return {
        success: true,
        data: {
          doc: getVal('doc', 0),
          paterno: getVal('paterno', 1),
          materno: getVal('materno', 2),
          nombre: getVal('nombre', 3),
          tipoPersona: getVal('tipopersona', 4),
        },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al consultar el apoderado:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al consultar el apoderado.',
      };
    }
  }

  /**
   * Arma el XML de la deuda seleccionada (mirror del XML legacy):
   * un <row> por recibo con los 17 atributos, TODOS escapados.
   */
  private buildDeudaXml(deuda: SimuladoConvenioDto['deuda']): string {
    return deuda
      .map((r) => {
        const attrs: Array<[string, string | number]> = [
          ['idrecibo', r.idrecibo],
          ['montotal', r.montotal],
          ['codigo', r.codigo],
          ['anno', r.anno],
          ['cod_pred', r.cod_pred],
          ['anexo', r.anexo],
          ['sub_anexo', r.sub_anexo],
          ['tipo', r.tipo],
          ['tipo_rec', r.tipo_rec],
          ['periodo', r.periodo],
          ['imp_insol', r.imp_insol],
          ['fact_reaj', r.fact_reaj],
          ['imp_reaj', r.imp_reaj],
          ['fact_mora', r.fact_mora],
          ['imp_mora', r.imp_mora],
          ['costo_emis', r.costo_emis],
          ['ubica', r.ubica],
        ];
        return (
          '<row ' +
          attrs.map(([k, v]) => `${k}="${this.escapeXmlAttr(v)}"`).join(' ') +
          ' />'
        );
      })
      .join('');
  }

  /**
   * Escapa un valor para insertarlo como atributo XML (anti inyección/XML roto).
   */
  private escapeXmlAttr(value: string | number): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Simulación de Convenio de Fraccionamiento (legacy: fraccionar/simuladofrac).
   *
   * Flujo:
   *  1) Arma el XML de la deuda seleccionada (17 atributos por recibo, escapados).
   *  2) sp_rentasmain @buscar=3 → datos del contribuyente.
   *  3) Si hay apoderado → [Rentas].[Contribuyente](@codResp) PARAMETRIZADO.
   *  4) Rentas.GeneraConvenio_simulado_deuda(@codigo,@operador,@estacion,@varxml).
   *  5) Rentas.GeneraConvenio_simulado_cuotas(@cuotas,@total_deuda,@total_inici,
   *     @operador,@fec_gen,@fec_cuo).
   *
   * Devuelve todo tipado para que el frontend arme el reporte.
   */
  async getSimuladoConvenio(dto: SimuladoConvenioDto): Promise<{
    success: boolean;
    data?: {
      contribuyente: {
        codigo: string;
        nombre: string;
        documento: string;
        domicilio: string;
      };
      responsable: { nombre: string; documento: string };
      montoDeuda: number;
      numeroCuotas: number;
      fecha: string;
      usuario: string;
      deuda: Array<{
        anno: string;
        concepto: string;
        detalle: string;
        predio: string;
        periodos: string;
        monto: number;
      }>;
      totalDeuda: number;
      cuotas: Array<{
        cuota: string;
        anio: string;
        fecVenc: string;
        amort: number;
        interes: number;
        total: number;
      }>;
      totalCuotas: number;
    };
    message: string;
  }> {
    try {
      // ── 1) XML de deuda (mirror del legacy; atributos escapados) ──
      const dxml = this.buildDeudaXml(dto.deuda);

      // ── 2) Datos del contribuyente ──
      const mainResult = await this.db.executeProcedure<any>(
        this.SP_RENTASMAIN,
        { buscar: 3, codigo: dto.codigo },
      );
      const mainRow = mainResult.recordset?.[0] as
        | Record<string, unknown>
        | undefined;
      if (!mainRow) {
        return { success: false, message: 'Contribuyente no encontrado.' };
      }
      const mv = Object.values(mainRow).map((x) => String(x ?? '').trim());
      const contribuyente = {
        codigo: mv[0] ?? dto.codigo,
        nombre: mv[1] ?? '',
        documento: mv[2] ?? '',
        domicilio: mv[3] ?? '',
      };

      // ── 3) Responsable (apoderado o el mismo contribuyente) ──
      let responsable = { nombre: contribuyente.nombre, documento: contribuyente.documento };
      const codResp = dto.codResp.trim();
      if (codResp) {
        const respResult = await this.db.queryWithParams<Record<string, unknown>>(
          'SELECT * FROM [Rentas].[Contribuyente](@codResp)',
          { codResp: codResp.padStart(7, '0') },
        );
        const respRow = respResult.recordset?.[0];
        if (respRow) {
          const rv = Object.values(respRow).map((x) => String(x ?? '').trim());
          responsable = {
            documento: rv[0] ?? '',
            nombre: `${rv[1] ?? ''} ${rv[2] ?? ''} ${rv[3] ?? ''}`
              .replace(/\s+/g, ' ')
              .trim(),
          };
        }
      }

      // ── 4) Deuda simulada (mapeo por índice como el legacy) ──
      const deudaResult = await this.db.executeProcedure<any>(
        'Rentas.GeneraConvenio_simulado_deuda',
        {
          codigo: dto.codigo,
          operador: dto.operador,
          estacion: dto.estacion,
          varxml: dxml,
        },
      );
      const deudaRows = (deudaResult.recordset ?? []) as Record<string, unknown>[];
      let totalDeuda = 0;
      const deuda = deudaRows.map((row) => {
        const v = Object.values(row).map((x) => String(x ?? '').trim());
        const monto = Number(v[14]) || 0;
        totalDeuda += monto;
        return {
          anno: v[1] ?? '',
          concepto: v[7] ?? '',
          detalle: v[9] ?? '',
          predio: v[3] ?? '',
          periodos: v[2] ?? '',
          monto,
        };
      });

      // ── 5) Cuotas simuladas ──
      const cuotasResult = await this.db.executeProcedure<any>(
        'Rentas.GeneraConvenio_simulado_cuotas',
        {
          cuotas: dto.numeroCuotas,
          total_deuda: dto.totalDeuda,
          total_inici: dto.totalInicial,
          operador: dto.operador,
          fec_gen: dto.fecGen,
          fec_cuo: dto.fecCuo,
        },
      );
      const cuotasRows = (cuotasResult.recordset ?? []) as Record<string, unknown>[];
      let totalCuotas = 0;
      const cuotas = cuotasRows.map((row) => {
        const v = Object.values(row).map((x) => String(x ?? '').trim());
        const esCuotaCero = (v[0] ?? '') === '00';
        const total = Number(v[9]) || 0;
        totalCuotas += total;
        return {
          cuota: v[0] ?? '',
          anio: v[1] ?? '',
          fecVenc: v[10] ?? '',
          amort: Number(v[5]) || 0,
          interes: esCuotaCero ? 0 : Number(v[6]) || 0,
          total,
        };
      });

      // Fecha de proyección/emisión: vencimiento de la primera fila (legacy).
      const primeraFila = cuotasRows[0];
      const fecha = primeraFila
        ? String(Object.values(primeraFila)[10] ?? dto.fecCuo).trim()
        : dto.fecCuo;

      return {
        success: true,
        data: {
          contribuyente,
          responsable,
          montoDeuda: dto.totalDeuda,
          numeroCuotas: dto.numeroCuotas,
          fecha,
          usuario: dto.operador.toUpperCase(),
          deuda,
          totalDeuda,
          cuotas,
          totalCuotas,
        },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al generar el simulado del convenio:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al generar el simulado del convenio.',
      };
    }
  }

  /**
   * Genera el Convenio de Fraccionamiento (legacy: fraccionar/generaconvenio).
   * SP: Rentas.GeneraConvenio — graba y devuelve el N° de convenio en la
   * primera columna de la primera fila (legacy: `echo $rowrecibos[0][0]`).
   * NOTA legacy: validaba que el usuario tuviera "caja asignada"; en Nest el
   * login actual no maneja ese concepto, se envía operador/estacion reales.
   */
  async generarConvenio(dto: GenerarConvenioDto): Promise<{
    success: boolean;
    data?: { convenio: string };
    message: string;
  }> {
    try {
      const dxml = this.buildDeudaXml(dto.deuda);
      const result = await this.db.executeProcedure<any>(
        'Rentas.GeneraConvenio',
        {
          codigo: dto.codigo,
          cuotas: dto.numeroCuotas,
          operador: dto.operador.toUpperCase(),
          estacion: dto.estacion.toUpperCase(),
          total_deuda: dto.totalDeuda,
          total_inici: dto.totalInicial,
          fec_gen: dto.fecGen,
          fec_cuo: dto.fecCuo,
          condicion_id: dto.condicionId,
          varxml: dxml,
          CodResp: dto.codResp,
          TipoDeuda: dto.tipoDeuda,
        },
      );
      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      const convenio = row
        ? String(Object.values(row)[0] ?? '').trim()
        : '';
      if (!convenio) {
        return {
          success: false,
          message: 'No se obtuvo el número del convenio generado.',
        };
      }
      return { success: true, data: { convenio }, message: 'ok' };
    } catch (error) {
      this.logger.error('Error al generar el convenio:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al generar el convenio.',
      };
    }
  }

  /**
   * Datos del reporte del convenio (legacy: JasperReport ReporteConvenio).
   * SP: Rentas.ImprimeConvenio
   *   @buscar=1 → cabecera (contribuyente, responsable, propietario/veh, etc.)
   *   @buscar=2 → detalle: deuda de origen   (subreporte "Origen")
   *   @buscar=3 → detalle: cuotas generadas  (subreporte "Destino")
   * Mapeo POR NOMBRE de columna (verificado contra el legacy/plantilla):
   *   buscar=2 → anno, tipo_des, tipo_rec_des, cod_pred, periodo, importe,
   *              total_valor, num_cuotas
   *   buscar=3 → periodo, fec_venc, imp_insol, intereses, imp_reaj, observacion
   *              (totalCuotas = Σ imp_reaj)
   */
  async getReporteConvenio(
    codigo: string,
    convenio: string,
  ): Promise<{
    success: boolean;
    data?: {
      cabecera: Record<string, string>;
      deuda: Array<{
        anno: string;
        concepto: string;
        detalle: string;
        predio: string;
        periodos: string;
        monto: number;
      }>;
      totalDeuda: number;
      cuotas: Array<{
        cuota: string;
        anio: string;
        fecVenc: string;
        amort: number;
        interes: number;
        total: number;
        observacion: string;
      }>;
      totalCuotas: number;
      /** Número de cuotas del fraccionamiento (columna num_cuotas, buscar=2). */
      numCuotas: string;
    };
    message: string;
  }> {
    try {
      // ── Cabecera ──
      const cabResult = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 1, codigo, convenio },
      );
      const cabRow = cabResult.recordset?.[0] as
        | Record<string, unknown>
        | undefined;
      if (!cabRow) {
        return { success: false, message: 'Convenio no encontrado.' };
      }
      // Se expone como string map (los campos del Jasper usan nombre de columna).
      const cabecera: Record<string, string> = {};
      for (const [k, v] of Object.entries(cabRow)) {
        cabecera[k] =
          v instanceof Date
            ? v.toLocaleDateString('es-PE')
            : String(v ?? '').trim();
      }

      // ── Detalle: deuda de origen (@buscar=2) ──
      const deudaResult = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 2, codigo, convenio },
      );
      const deudaRows = (deudaResult.recordset ?? []) as Record<
        string,
        unknown
      >[];
      let totalDeuda = 0;
      let totalValorSp = '';
      let numCuotas = '';
      for (const row of deudaRows) {
        const get = (k: string) => String(row[k] ?? '').trim();
        const importe = Number(get('importe')) || 0;
        if (get('total_valor') !== '') totalValorSp = get('total_valor');
        if (get('num_cuotas') !== '') numCuotas = get('num_cuotas');
        totalDeuda += importe;
      }
      const deuda = deudaRows.map((row) => {
        const get = (k: string) => String(row[k] ?? '').trim();
        return {
          anno: get('anno'),
          concepto: get('tipo_des'),
          detalle: get('tipo_rec_des'),
          predio: get('cod_pred'),
          periodos: get('periodo'),
          monto: Number(get('importe')) || 0,
        };
      });
      // El SP entrega su propio total (total_valor) cuando existe.
      if (totalValorSp !== '') {
        totalDeuda = Number(totalValorSp) || totalDeuda;
      }

      // ── Detalle: cuotas generadas (@buscar=3) ──
      const cuotasResult = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 3, codigo, convenio },
      );
      const cuotasRows = (cuotasResult.recordset ?? []) as Record<
        string,
        unknown
      >[];
      let totalCuotas = 0;
      const cuotas = cuotasRows.map((row) => {
        const get = (k: string) => String(row[k] ?? '').trim();
        const esCuotaCero = get('periodo') === '00';
        const total = Number(get('imp_reaj')) || 0;
        totalCuotas += total;
        return {
          cuota: get('periodo'),
          anio: '',
          fecVenc: get('fec_venc'),
          amort: Number(get('imp_insol')) || 0,
          interes: esCuotaCero ? 0 : Number(get('intereses')) || 0,
          total,
          observacion: get('observacion'),
        };
      });

      return {
        success: true,
        data: { cabecera, deuda, totalDeuda, cuotas, totalCuotas, numCuotas },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al obtener el reporte del convenio:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al obtener el reporte del convenio.',
      };
    }
  }

  /**
   * Listado de fraccionamientos del contribuyente
   * (legacy: fraccionar/consultafracc → Rentas.ImprimeConvenio @buscar=4).
   * Mapeo por índice de columna (igual que el legacy):
   *   [4] anno | [5] convenio | [7] monto | [11] cuotas |
   *   [16] estado | [19] usuario | [21] fecha.
   */
  async getListadoFraccionamientos(codigo: string): Promise<{
    success: boolean;
    data?: Array<{
      convenio: string;
      anno: string;
      cuotas: string;
      monto: string;
      estado: string;
      usuario: string;
      fecha: string;
    }>;
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 4, codigo },
      );
      const rows = (result.recordset ?? []) as Record<string, unknown>[];
      const data = rows.map((row) => {
        const v = Object.values(row).map((x) =>
          x instanceof Date
            ? x.toLocaleDateString('es-PE')
            : String(x ?? '').trim(),
        );
        return {
          convenio: v[5] ?? '',
          anno: v[4] ?? '',
          cuotas: v[11] ?? '',
          monto: v[7] ?? '',
          estado: v[16] ?? '',
          usuario: v[19] ?? '',
          fecha: v[21] ?? '',
        };
      });
      return { success: true, data, message: 'ok' };
    } catch (error) {
      this.logger.error('Error al listar los fraccionamientos:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al listar los fraccionamientos.',
      };
    }
  }

  // ─── /Fraccionar Deuda ──────────────────────────────────────────────────

  /**
   * Detalle de un convenio fraccionado (legacy: fraccionar/resolfracc).
   * SP: Rentas.ImprimeConvenio
   *   @buscar=5 → fila única del convenio (mapeo POR ÍNDICE como el legacy):
   *     [3] monto total frac. | [6] número de cuotas | [7] cuota inicial |
   *     [9] estado (label) | [12] fecha convenio | [13] nro recibo |
   *     [14] estado (código)
   *   @buscar=3 → detalle de cuotas del grid (mapeo por nombre, igual que el
   *     reporte): periodo, imp_insol, intereses, imp_reaj, fec_venc, observacion
   */
  async getDetalleConvenio(codigo: string, convenio: string): Promise<{
    success: boolean;
    data?: {
      fecha: string;
      montoTotal: string;
      cuotaInicial: string;
      porcentajeInicial: string;
      saldo: string;
      numeroCuotas: string;
      estado: string;
      estadoCodigo: string;
      nroRecibo: string;
      cuotas: Array<{
        periodo: string;
        importe: string;
        reajuste: string;
        total: string;
        fechaVenc: string;
        nroRecibo: string;
      }>;
    };
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 5, codigo, convenio },
      );
      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      if (!row) {
        return { success: false, message: 'Convenio no encontrado.' };
      }
      const v = Object.values(row).map((x) =>
        x instanceof Date
          ? x.toLocaleDateString('es-PE')
          : String(x ?? '').trim(),
      );
      // Cálculos del legacy:
      //   porcentajeInicial = cuotaInicial * (100 / montoTotal)
      //   saldo = montoTotal - cuotaInicial
      const montoTotal = Number(v[3]) || 0;
      const cuotaInicial = Number(v[7]) || 0;
      const porcentajeInicial =
        montoTotal > 0 ? cuotaInicial * (100 / montoTotal) : 0;
      const saldo = montoTotal - cuotaInicial;

      // ── Cuotas del grid (@buscar=3, mismo mapeo que el reporte) ──
      const cuotasResult = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        { buscar: 3, codigo, convenio },
      );
      const cuotasRows = (cuotasResult.recordset ?? []) as Record<
        string,
        unknown
      >[];
      const cuotas = cuotasRows.map((r) => {
        const get = (k: string) => String(r[k] ?? '').trim();
        return {
          periodo: get('periodo'),
          importe: get('imp_insol'),
          reajuste: get('intereses'),
          total: get('imp_reaj'),
          fechaVenc: get('fec_venc'),
          nroRecibo: get('observacion'),
        };
      });

      return {
        success: true,
        data: {
          fecha: v[12] ?? '',
          montoTotal: String(montoTotal),
          cuotaInicial: String(cuotaInicial),
          porcentajeInicial: String(porcentajeInicial),
          saldo: String(saldo),
          numeroCuotas: v[6] ?? '',
          estado: v[9] ?? '',
          estadoCodigo: v[14] ?? '',
          nroRecibo: v[13] ?? '',
          cuotas,
        },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al obtener el detalle del convenio:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al obtener el detalle del convenio.',
      };
    }
  }

  /**
   * Genera la resolución de un convenio fraccionado (legacy:
   * fraccionar/resoluciongenera). SP: Rentas.ImprimeConvenio @buscar=7.
   * El SP genera/marca la resolución; el legacy devolvía el texto
   * "Resolucion Generada Correctamente".
   */
  async generarResolucion(
    codigo: string,
    convenio: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.db.executeProcedure<any>('Rentas.ImprimeConvenio', {
        buscar: 7,
        codigo,
        convenio,
      });
      return { success: true, message: 'Resolución Generada Correctamente' };
    } catch (error) {
      this.logger.error('Error al generar la resolución:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al generar la resolución.',
      };
    }
  }

  /**
   * Datos de la resolución de un convenio fraccionado (legacy: jasper
   * rpt_conv_resolucion). SP: Rentas.ResolucionConvenio @buscar=1 con
   * @codigo/@convenio. Devuelve la primera fila mapeada por nombre.
   */
  async getDatosResolucion(
    codigo: string,
    convenio: string,
  ): Promise<{
    success: boolean;
    data?: {
      numero_documento: string;
      nombre_contribuyente: string;
      direcion: string;
      numero_cuotas: string;
      fecha_convenio: string;
      cuota_inicial: string;
      numero_letra: string;
      numero_ingreso: string;
      fecha_cancelado: string;
      valores: string;
      raw: Record<string, unknown>;
    };
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<any>(
        'Rentas.ResolucionConvenio',
        { buscar: 1, codigo, convenio },
      );
      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      if (!row) {
        return { success: false, message: 'Resolución no encontrada.' };
      }
      const get = (k: string): string => {
        const direct = row[k];
        if (direct !== undefined) return String(direct).trim();
        const key = Object.keys(row).find(
          (kk) => kk.toLowerCase() === k.toLowerCase(),
        );
        return key ? String(row[key]).trim() : '';
      };
      return {
        success: true,
        data: {
          numero_documento: get('numero_documento'),
          nombre_contribuyente: get('nombre_contribuyente'),
          direcion: get('direcion'),
          numero_cuotas: get('numero_cuotas'),
          fecha_convenio: get('fecha_convenio'),
          cuota_inicial: get('cuota_inicial'),
          numero_letra: get('numero_letra'),
          numero_ingreso: get('numero_ingreso'),
          fecha_cancelado: get('fecha_cancelado'),
          valores: get('valores'),
          raw: row,
        },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al obtener los datos de la resolución:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al obtener los datos de la resolución.',
      };
    }
  }

  /**
   * Anula un convenio fraccionado (legacy: fraccionar/anularfrac).
   * SP: Rentas.Anularconvenio con @codigo, @convenio, @operador, @estacion.
   */
  async anularConvenio(
    codigo: string,
    convenio: string,
    operador: string,
    estacion: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.db.executeProcedure<any>('Rentas.Anularconvenio', {
        codigo,
        convenio,
        operador,
        estacion,
      });
      return { success: true, message: 'Convenio anulado correctamente.' };
    } catch (error) {
      this.logger.error('Error al anular el convenio:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al anular el convenio.',
      };
    }
  }

  /**
   * Anula un convenio fraccionado sin cargos (legacy: fraccionar/anularfracsc).
   * SP: Rentas.Anularconveniosc con @codigo, @convenio, @operador, @estacion.
   */
  async anularConvenioSc(
    codigo: string,
    convenio: string,
    operador: string,
    estacion: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.db.executeProcedure<any>('Rentas.Anularconveniosc', {
        codigo,
        convenio,
        operador,
        estacion,
      });
      return {
        success: true,
        message: 'Convenio anulado sin cargos correctamente.',
      };
    } catch (error) {
      this.logger.error('Error al anular el convenio sin cargos:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al anular el convenio sin cargos.',
      };
    }
  }

  /**
   * Reporte de tesorería de fraccionamientos (legacy: fraccionar/reporteconsulta).
   * SP: Rentas.ImprimeConvenio @buscar=8 con @fech_inicio, @fech_fin, @operador.
   * Mapeo por índice de columna (igual que el legacy):
   *   [0] codigo | [1] anno | [2] convenio | [3] estado | [4] fecha |
   *   [5] deuda_ini | [6] cuotas | [7] cuotas_canceladas |
   *   [8] cuotas_vencidas | [9] operador
   */
  async getReporteFraccionamientos(dto: {
    desde: string;
    hasta: string;
    operador: string;
  }): Promise<{
    success: boolean;
    data?: Array<{
      codigo: string;
      anno: string;
      convenio: string;
      estado: string;
      fecha: string;
      deudaIni: string;
      cuotas: string;
      cuotasCanceladas: string;
      cuotasVencidas: string;
      operador: string;
    }>;
    message: string;
  }> {
    try {
      const result = await this.db.executeProcedure<any>(
        'Rentas.ImprimeConvenio',
        {
          buscar: 8,
          fech_inicio: dto.desde,
          fech_fin: dto.hasta,
          operador: dto.operador,
        },
      );
      const rows = (result.recordset ?? []) as Record<string, unknown>[];
      const data = rows.map((row) => {
        const v = Object.values(row).map((x) =>
          x instanceof Date
            ? x.toLocaleDateString('es-PE')
            : String(x ?? '').trim(),
        );
        return {
          codigo: v[0] ?? '',
          anno: v[1] ?? '',
          convenio: v[2] ?? '',
          estado: v[3] ?? '',
          fecha: v[4] ?? '',
          deudaIni: v[5] ?? '',
          cuotas: v[6] ?? '',
          cuotasCanceladas: v[7] ?? '',
          cuotasVencidas: v[8] ?? '',
          operador: v[9] ?? '',
        };
      });
      return { success: true, data, message: 'ok' };
    } catch (error) {
      this.logger.error('Error al consultar el reporte de tesorería:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al consultar el reporte de tesorería.',
      };
    }
  }

  /**
   * Filtros iniciales del reporte de tesorería (legacy: fraccionar/reportesAction):
   *   - dbo.sp_getfecha → fecha del sistema (desde = hasta = hoy)
   *   - Calculo.sp_ListaCombo @busc=8 → combo de usuarios
   */
  async getReporteFraccionamientosFiltros(): Promise<{
    success: boolean;
    data?: { desde: string; hasta: string; usuarios: Array<{ value: string; label: string }> };
    message: string;
  }> {
    try {
      const [fechaResult, combosResult] = await Promise.all([
        this.db.executeProcedure<Record<string, unknown>>('dbo.sp_getfecha'),
        this.db.executeProcedure<any>('Calculo.sp_ListaCombo', { busc: 8 }),
      ]);
      const fechaRow = fechaResult.recordset?.[0] as
        | Record<string, unknown>
        | undefined;
      const fechaVal = fechaRow ? Object.values(fechaRow)[0] : undefined;
      const fecha =
        fechaVal instanceof Date
          ? fechaVal.toLocaleDateString('es-PE')
          : String(fechaVal ?? '');

      const comboRows = (combosResult.recordset ?? []) as Record<string, unknown>[];
      const usuarios = comboRows.map((row) => {
        const v = Object.values(row).map((x) => String(x ?? '').trim());
        return { value: v[0] ?? '', label: v[1] ?? v[0] ?? '' };
      });

      return {
        success: true,
        data: { desde: fecha, hasta: fecha, usuarios },
        message: 'ok',
      };
    } catch (error) {
      this.logger.error('Error al cargar los filtros del reporte:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al cargar los filtros del reporte.',
      };
    }
  }

  // ═══ Períodos / Declaración Jurada (sp_rentasmain @buscar=1,2,4) ═══════════

  /**
   * Lista de períodos (años) de un contribuyente — @buscar=1.
   */
  async getPeriodos(codigo: string): Promise<PeriodoAnno[]> {
    if (!codigo?.trim()) throw new Error('Código de contribuyente requerido.');
    const result = await this.db.executeProcedure<any>(this.SP_RENTASMAIN, {
      buscar: 1,
      codigo: codigo.trim(),
    });
    const rows = (result.recordset ?? []) as Record<string, unknown>[];
    return rows.map((row) => {
      const v = Object.values(row).map((x) => String(x ?? '').trim());
      return { anno: v[1] ?? v[0] ?? '' };
    });
  }

  /**
   * Resumen de un período — @buscar=2.
   */
  async getPeriodoDetalle(codigo: string, anno: string): Promise<PeriodoDetalle> {
    if (!codigo?.trim()) throw new Error('Código de contribuyente requerido.');
    if (!anno?.trim()) throw new Error('Período requerido.');
    const result = await this.db.executeProcedure<any>(this.SP_RENTASMAIN, {
      buscar: 2,
      codigo: codigo.trim(),
      anno: anno.trim(),
    });
    const row = (result.recordset?.[0] ?? {}) as Record<string, unknown>;
    const v = Object.values(row).map((x) => String(x ?? '').trim());
    return {
      codigo: v[0] ?? '',
      anno: v[1] ?? '',
      nroPredi: v[8] ?? '0',
      totAutoavaluo: v[2] ?? '0.00',
      baseImponible: v[4] ?? '0.00',
      impAnual: v[5] ?? '0.00',
      impTrime: v[6] ?? '0.00',
      costoEmi: v[9] ?? '0.00',
      porInafec: v[13] ?? '',
    };
  }

  /**
   * Predios de un contribuyente en un período — @buscar=4.
   */
  async getPrediosDJ(codigo: string, anno: string): Promise<PredioDJItem[]> {
    if (!codigo?.trim()) throw new Error('Código de contribuyente requerido.');
    if (!anno?.trim()) throw new Error('Período requerido.');
    const result = await this.db.executeProcedure<any>(this.SP_RENTASMAIN, {
      buscar: 4,
      codigo: codigo.trim(),
      anno: anno.trim(),
    });
    const rows = (result.recordset ?? []) as Record<string, unknown>[];
    return rows.map((row) => {
      const v = Object.values(row).map((x) => String(x ?? '').trim());
      // Prioriza columnas por nombre (aliases del SP); cae a posición si no hay nombre.
      const get = (name: string, pos: number): string => {
        const named = row[name];
        return named !== undefined && named !== null
          ? String(named).trim()
          : v[pos] ?? '';
      };
      return {
        tipo: get('tipo', 8),
        codPred: get('cod_pred', 2),
        // Defensa: si el anexo llegara con un sufijo separado por coma, se conserva solo la parte principal.
        anexo: (get('anexo', 3) || '').split(',')[0],
        direccion: get('direccion', 4),
        areaTerreno: get('area_terreno', 5) || '0',
        porcenPropiedad: get('porcen_propiedad', 6) || '0',
        totalAutoavaluo: get('total_autoavaluo', 7) || '0.00',
        arancel: get('arancel', 12),
        predioVendido: get('predio_vendido', 11),
        uso: get('uso', 13),
      };
    });
  }

  // ═══ Hoja de Resumen predial (Rentas.sp_MHRpred) ═══════════

  /**
   * Combos de la Hoja de Resumen — Calculo.sp_ListaCombo:
   *   @busc=1 → régimen, @busc=2 → motivo.
   */
  async getHojaResumenCombos(): Promise<HojaResumenCombosResult> {
    const [regRes, motRes] = await Promise.all([
      this.db.executeProcedure<any>(this.SP_LISTA_COMBO, { busc: 1 }),
      this.db.executeProcedure<any>(this.SP_LISTA_COMBO, { busc: 2 }),
    ]);

    const mapCombo = (rows: any[]): HojaResumenComboOption[] =>
      rows.map((row) => {
        const v = Object.values(row).map((x) => String(x ?? '').trim());
        return { value: v[0] ?? '', label: v[1] ?? v[0] ?? '' };
      });

    return {
      regimen: mapCombo(regRes.recordset ?? []),
      motivos: mapCombo(motRes.recordset ?? []),
    };
  }

  /**
   * Hoja de Resumen existente para edición — Rentas.sp_MHRpred @busc=3.
   * Si no existe, lanza Error (el controller lo devuelve como success:false).
   */
  async getHojaResumenEditar(codigo: string, anno: string): Promise<HojaResumenEditarResult> {
    if (!codigo?.trim()) throw new Error('Código de contribuyente requerido.');
    if (!anno?.trim()) throw new Error('Período requerido.');

    const result = await this.db.executeProcedure<any>(this.SP_MHRPRED, {
      busc: 3,
      codigo: codigo.trim(),
      anno: anno.trim(),
    });

    const row = result.recordset?.[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('Hoja de Resumen no encontrada para el período seleccionado.');

    // Columnas reales de Rentas.sp_MHRpred @busc=3 (verificadas contra el
    // recordset del SP y el hrAction legado; posición 0-based como fallback):
    //   [0] codigo        [1] anno          [2] num_decla   [3] fec_decla
    //   [4] fec_ingre     [5] id_motivo     [6] id_inafec   [7] tot_autoavaluo
    //   [8] porc_inafectac[9] base_imponible[10] imp_anual  [11] imp_trime
    //   [12] afect_emi    [13] nro_predi    [14] costo_emi  [15] base_legal
    //   [16] nume_resol   [17] expe_exone   [18] fech_resol [19] vigencia_desde
    //   [20] vigencia_hasta [21] observacion [22] nestado   [23] operador
    //   [24] estacion     [25] fech_ing     [26] nombres    [27] anno_hasta
    //   [28] afectacion
    const raw = Object.values(row);
    const low: Record<string, unknown> = {};
    for (const k of Object.keys(row)) low[k.toLowerCase()] = row[k];

    const toText = (x: unknown): string => {
      if (x === undefined || x === null) return '';
      if (x instanceof Date) return Number.isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10);
      return String(x).trim();
    };
    const txt = (name: string, pos: number): string => {
      const named = low[name.toLowerCase()];
      return named !== undefined ? toText(named) : toText(raw[pos]);
    };
    // Fecha → DD/MM/YYYY (lo que espera el frontend, que lo convierte a YYYY-MM-DD).
    const toFecha = (x: unknown): string => {
      if (x === undefined || x === null) return '';
      const s = String(x instanceof Date ? x.toISOString().slice(0, 10) : String(x)).trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
      return s;
    };
    const fch = (name: string, pos: number): string => {
      const named = low[name.toLowerCase()];
      return toFecha(named !== undefined ? named : raw[pos]);
    };
    // Extrae el año (4 dígitos) de un valor que puede ser fecha o año plano.
    const yr = (name: string, pos: number): string => {
      const named = low[name.toLowerCase()];
      const x = named !== undefined ? named : raw[pos];
      if (x === undefined || x === null) return '';
      if (x instanceof Date) return String(x.getFullYear());
      const m = String(x).match(/\b(\d{4})\b/);
      return m ? m[1] : '';
    };

    // afect_emi viene como 'Checked'/'Unchecked' (puede variar a 1/0 según driver).
    const emi = txt('afect_emi', 12).toLowerCase();

    return {
      codigo: txt('codigo', 0),
      anno: txt('anno', 1),
      numResol: txt('nume_resol', 16),
      fecResol: fch('fech_resol', 18),
      nroExpediente: txt('expe_exone', 17),
      baseLegal: txt('base_legal', 15),
      regimen: txt('id_inafec', 6),
      motivo: txt('id_motivo', 5),
      // Años de vigencia (txthrdesde/txthrhasta en el legado): el desde es el
      // año de la propia HR; el hasta es anno_hasta. Si vienen vacíos se deriva
      // de las fechas vigencia_desde/vigencia_hasta.
      vigDesde: yr('anno', 1) || yr('vigencia_desde', 19),
      vigHasta: yr('anno_hasta', 27) || yr('vigencia_hasta', 20),
      observacion: txt('observacion', 21),
      bloquearEmi: emi === '1' || emi === 'checked' || emi === 'true' ? '1' : '',
      usuarioReg: txt('operador', 23),
      fechaReg: fch('fech_ing', 25),
      estacionReg: txt('estacion', 24),
      numDecla: txt('num_decla', 2),
      fecDecla: fch('fec_decla', 3),
      fecVigDesde: fch('vigencia_desde', 19),
      fecVigHasta: fch('vigencia_hasta', 20),
      // Totales de la DJ asociada (bloque readonly "Datos para el registro
      // de la DDJJ"); se devuelven formateados igual que el legado.
      nroPredios: txt('nro_predi', 13),
      totalAutovaluo: txt('tot_autoavaluo', 7),
      baseImponible: txt('base_imponible', 9),
      impAnual: txt('imp_anual', 10),
      impTrimestral: txt('imp_trime', 11),
      costoEmision: txt('costo_emi', 14),
    };
  }

  /**
   * Guardar Hoja de Resumen — Rentas.generahr (grabarAction del legado).
   * El mismo SP crea y actualiza (upsert por codigo+anno); no hay switch
   * de acción. afect_emi se manda como 'true'/'false', igual que el
   * checkbox jQuery del formulario legado.
   * Devuelve { success, mensaje } con la primera columna del result set,
   * o el mensaje genérico del legado si el SP no retorna filas.
   */
  async grabarHojaResumen(dto: GuardarHojaResumenDto): Promise<GuardarHojaResumenResult> {
    // Fechas en formato no ambiguo YYYYMMDD: si van como varchar con
    // DD/MM/YYYY, SQL Server las convierte a smalldatetime según el
    // DATEFORMAT de la sesión (mdy por defecto) y falla con días > 12.
    const iso = (v: string): string => {
      const s = (v ?? '').trim();
      if (!s) return '';
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}${m[2]}${m[1]}`;
      const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) return `${ymd[1]}${ymd[2]}${ymd[3]}`;
      return s;
    };

    const result = await this.db.executeProcedure<any>('Rentas.generahr', {
      desde: dto.vig_desde ?? '',
      hasta: dto.vig_hasta ?? '',
      codigo: dto.codigo ?? '',
      anno: dto.anno ?? '',
      operador: dto.operador ?? '',
      estacion: dto.estacion ?? '',
      fech_resol: iso(dto.fec_resol ?? ''),
      base_legal: dto.base_legal ?? '',
      vigencia_desde: iso(dto.fec_vig_desde ?? ''),
      vigencia_hasta: iso(dto.fec_vig_hasta ?? ''),
      expe_exone: dto.nro_expediente ?? '',
      id_motivo: dto.motivo ?? '',
      id_inafec: dto.regimen ?? '',
      nume_resol: dto.num_resol ?? '',
      observacion: dto.observacion ?? '',
      afect_emi: dto.bloquear_emi === '1' ? 'true' : 'false',
    });

    const row = result.recordset?.[0] as { [key: string]: unknown } | undefined;
    const mensaje = row ? String(Object.values(row)[0] ?? '').trim() : '';

    const esError = /no se pudo|error|no existe|no encontrad|duplicad/i.test(mensaje);

    return { success: !esError, mensaje };
  }

  // ═══ Determinación (Impuesto Predial / Arbitrios) ═══════════

  /**
   * Determinación del Impuesto Predial — [Rentas].[predial_determinar]
   * (legacy: determinacionimpuesto4Action, siempre msquery=1, calculo='1').
   * El mensaje de salida viene en la segunda columna del primer recordset.
   */
  async calcularDeterminacionIp(dto: DeterminacionIpDto): Promise<DeterminacionResult> {
    if (!dto.codigo?.trim()) throw new Error('Código de contribuyente requerido.');
    if (!dto.anno?.trim()) throw new Error('Período requerido.');

    const result = await this.db.executeProcedure<any>('[Rentas].[predial_determinar]', {
      msquery: 1,
      codigo: dto.codigo.trim(),
      anno: dto.anno.trim(),
      calculo: '1',
      operador: dto.operador ?? '',
      estacion: dto.estacion ?? '',
      tipo_calculo: dto.tipodeterminacion ?? '1',
    });

    const row = result.recordset?.[0] as Record<string, unknown> | undefined;
    const mensaje = row ? String(Object.values(row)[1] ?? '').trim() : '';
    if (!row || /problema|error|no se pudo/i.test(mensaje)) {
      return { success: false, mensaje: mensaje || 'Ocurrió un problema al generar el IP.' };
    }
    return { success: true, mensaje };
  }

  /**
   * Determinación de Arbitrios por predio — Rentas.Calculo_inquilinos
   * (legacy: determinacionarbitrioAction, un exec por predio seleccionado).
   * Devuelve el mensaje del último cálculo y el detalle por predio.
   */
  async calcularDeterminacionArbitrios(
    dto: DeterminacionArbitriosDto,
  ): Promise<DeterminacionResult> {
    if (!dto.predios?.length) throw new Error('Debe seleccionar al menos un predio.');

    const detalles: { codPred: string; mensaje: string }[] = [];
    let ultimoMensaje = '';

    for (const p of dto.predios) {
      const result = await this.db.executeProcedure<any>('Rentas.Calculo_inquilinos', {
        codigo: p.codigo ?? '',
        ano_s: p.anno ?? '',
        cod_pred: p.cod_pred ?? '',
        anexo: p.anexo ?? '',
        sub_anexo: p.sub_anexo ?? '',
        operador: dto.operador ?? '',
        estacion: dto.estacion ?? '',
        tipo_calculo: p.tipodeterminacion ?? '1',
      });

      const row = result.recordset?.[0] as Record<string, unknown> | undefined;
      const mensaje = row ? String(Object.values(row)[1] ?? '').trim() : '';
      const ok = !!row && !/problema|error|no se pudo/i.test(mensaje);
      detalles.push({
        codPred: p.cod_pred ?? '',
        mensaje: ok ? mensaje || 'Calculado.' : mensaje || 'Ocurrió un problema al calcular.',
      });
      if (!ok) {
        return { success: false, mensaje: mensaje || 'Ocurrió un problema al generar los arbitrios.' };
      }
      if (mensaje) ultimoMensaje = mensaje;
    }

    return { success: true, mensaje: ultimoMensaje || 'Se generaron los arbitrios correctamente.' };
  }
}