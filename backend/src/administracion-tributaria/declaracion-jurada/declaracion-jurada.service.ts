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
} from './dto/declaracion-jurada.types';

@Injectable()
export class DeclaracionJuradaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_MRECEPCION = 'Coactivo.SP_Mrecepcion';
  private readonly SP_TBLDISTRITO = 'Contenedor.SP_TblDistrito';
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
}
