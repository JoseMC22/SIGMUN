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
  GuardarRepresentanteResult,
  VincularRepresentanteResult,
  EditarContribuyenteResult,
  EliminarContribuyenteResult,
  ObtenerRepresentantesResult,
  EditarRepresentanteResult,
  EliminarRepresentanteResult,
} from './dto/declaracion-jurada.types';
import { GuardarContribuyenteDto } from './dto/guardar-contribuyente.dto';
import { GuardarRepresentanteDto } from './dto/guardar-representante.dto';
import { VincularRepresentanteDto } from './dto/vincular-representante.dto';
import { EliminarContribuyenteDto } from './dto/eliminar-contribuyente.dto';

@Injectable()
export class DeclaracionJuradaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_MREPRESENTANTE = 'Rentas.sp_Mrepresentante';
  private readonly SP_RENTASMAIN = 'Rentas.sp_rentasmain';
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
}
