import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import { SearchPendientesDto } from './dto/search-pendientes.dto';
import {
  SpMContribuyenteSearchRow,
  SpPendienteAlcabalaRow,
  ContribuyenteSearchResult,
  ContribuyenteSearchItem,
  PendienteAlcabalaItem,
  PendienteAlcabalaResult,
} from './rd-alcabala.types';

@Injectable()
export class RdAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_PENDIENTES = 'Caja.sp_EstCta_Rentasalcabala_proyectado';
  private readonly logger = new Logger(RdAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async searchContribuyente(
    dto: SearchContribuyenteDto,
  ): Promise<ContribuyenteSearchResult> {
    const { tipoBusqueda, codigo, nombres, paterno, materno, razonSocial, numDoc, page, pageSize } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams = {
      codigo: codigo || '',
      nombres: nombres || '',
      paterno: paterno || '',
      materno: materno || '',
      num_doc: numDoc || '',
      tipo_busqueda: tipoBusqueda || '',
      razon: razonSocial || '',
      cod_pred: '',
      checkfrac: '0',
    };

    // Total count
    const totalResult = await this.db.executeProcedure<any>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 6 },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    // Paginated rows
    const rowsResult = await this.db.executeProcedure<SpMContribuyenteSearchRow>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
    );

    const data: ContribuyenteSearchItem[] = (
      rowsResult.recordset || []
    ).map((row) => ({
      codigo: row.codigo ?? '',
      paterno: row.paterno ?? '',
      materno: row.materno ?? '',
      nombres: row.nombres ?? '',
      numDoc: row.num_doc ?? '',
      direccion: row.DireFis ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async searchPendientes(
    dto: SearchPendientesDto,
  ): Promise<PendienteAlcabalaResult> {
    const { codigo, annos, tipos, tiporec, perio, predio, estado, fechaProyectada } = dto;

    const spParams: Record<string, any> = {
      codigo: codigo || '',
      annos: annos || '',
      tipos: tipos || '',
      tiporec: tiporec || '',
      perio: perio || '',
      predio: predio || '',
      estado: estado || '',
      fecha_proyectada: fechaProyectada || '',
    };

    try {
      this.logger.log(`[RdAlcabala] searchPendientes calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<SpPendienteAlcabalaRow>(
        this.SP_PENDIENTES,
        spParams,
      );
      const rawRows = result.recordset || [];
      this.logger.log(`[RdAlcabala] searchPendientes SP returned ${rawRows.length} rows`);

      const data: PendienteAlcabalaItem[] = rawRows.map((row) => {
        const impInsol = Number(row.imp_insol ?? 0);
        const impReaj = Number(row.imp_reaj ?? 0);
        const mora = Number(row.mora ?? 0);
        const costoEmis = Number(row.costo_emis ?? 0);
        const total = impInsol + impReaj + mora + costoEmis;

        return {
          tributo: row.tipo_docu ?? '',
          anio: String(row.anno ?? ''),
          predio: String(row.cod_pred ?? ''),
          anexo: String(row.anexo ?? ''),
          subanexo: String(row.sub_anexo ?? ''),
          periodo: String(row.periodo ?? ''),
          impInsol,
          impReaj,
          factorMora: Number(row.fact_mora ?? 0),
          interes: mora,
          costoEmis,
          total,
          estado: String(row.estado ?? ''),
          observacion: String(row.observacion ?? ''),
          idrecibo: String(row.idrecibo ?? ''),
          codigo: String(row.codigo ?? ''),
        };
      });

      return {
        success: true,
        data,
        total: data.length,
      };
    } catch (err) {
      this.logger.error(`[RdAlcabala] searchPendientes SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar pendientes de alcabala',
      };
    }
  }
}
