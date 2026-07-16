import { Injectable, Logger } from '@nestjs/common';
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
} from './dto/declaracion-jurada.types';
import { GuardarContribuyenteDto } from './dto/guardar-contribuyente.dto';

@Injectable()
export class DeclaracionJuradaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_MRECEPCION = 'Coactivo.SP_Mrecepcion';
  private readonly SP_TBLDISTRITO = 'Contenedor.SP_TblDistrito';
  private readonly SP_VW_MVIAS = 'Rentas.SP_vw_Mvias';
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
    return { codigo: mensaje, mensaje };
  }
}
