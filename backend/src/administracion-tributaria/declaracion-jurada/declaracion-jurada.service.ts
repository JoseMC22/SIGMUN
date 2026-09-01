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

@Injectable()
export class DeclaracionJuradaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_MREPRESENTANTE = 'Rentas.sp_Mrepresentante';
  private readonly SP_RENTASMAIN = 'Rentas.sp_rentasmain';
  private readonly SP_MRECEPCION = 'Coactivo.SP_Mrecepcion';
  private readonly SP_TBLDISTRITO = 'Contenedor.SP_TblDistrito';
  private readonly SP_VW_MVIAS = 'Rentas.SP_vw_Mvias';
  private readonly SP_CAJA_FRAMEWORK = 'dbo.store_caja_framework';
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
    const detalles = dto.liquidacion.map((item, index) => ({
      secuencia: index + 1,
      idrecibo: Number(item.idrecibo),
      anno: item.anno,
      cod_pre: item.cod_pred,
      anexo: item.anexo || '',
      sub_anexo: item.sub_anexo || '',
      tipo: item.tipo,
      tipo_rec: item.tipo_rec,
      periodo: item.periodo,
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
}