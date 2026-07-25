import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import {
  SpMContribuyenteRow,
  SpAlcabalasByContribuyenteRow,
  ContribuyenteItem,
  AlcabalaItem,
  ContribuyenteSearchResult,
  AlcabalasResult,
} from './determinar-alcabala.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

@Injectable()
export class DeterminarAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_DJALCABALA = 'Alcabala.sp_DJAlcabala';
  private readonly logger = new Logger(DeterminarAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async searchContribuyente(
    dto: SearchContribuyenteDto,
  ): Promise<ContribuyenteSearchResult> {
    const { tipoBusqueda, busqueda, paterno, materno, nombres, page, pageSize } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams: Record<string, string> = {
      codigo: '',
      nombres: '',
      paterno: '',
      materno: '',
      num_doc: '',
      tipo_busqueda: tipoBusqueda,
      razon: '',
      cod_pred: '',
      checkfrac: '0',
    };

    if (tipoBusqueda === 'N') {
      // Nombre: 3 campos separados, siempre se envían al SP
      baseParams.paterno = paterno || '';
      baseParams.materno = materno || '';
      baseParams.nombres = nombres || '';
    } else {
      // C, R, D, P, V: un solo campo
      const fieldMap: Record<string, string> = {
        C: 'codigo',
        R: 'razon',
        D: 'num_doc',
        P: 'direccion',
        V: 'placa',
      };
      const fieldName = fieldMap[tipoBusqueda] || 'codigo';
      if (busqueda) baseParams[fieldName] = busqueda;
    }

    try {
      // First: get total count
      const totalResult = await this.db.executeProcedure<any>(
        this.SP_MCONTRIBUYENTE,
        { ...baseParams, busc: 6 },
      );
      const totalRow = totalResult.recordset?.[0];
      const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

      // Second: get rows with pagination
      const rowsResult = await this.db.executeProcedure<SpMContribuyenteRow>(
        this.SP_MCONTRIBUYENTE,
        { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
      );

      const data: ContribuyenteItem[] = (
        rowsResult.recordset || []
      ).map((row: any) => ({
        codigo: String(col(row, 'codigo') ?? ''),
        paterno: String(col(row, 'paterno') ?? ''),
        materno: String(col(row, 'materno') ?? ''),
        nombres: String(col(row, 'nombres') ?? ''),
        numDoc: String(col(row, 'num_doc') ?? ''),
        direccion: String(col(row, 'DireFis') ?? ''),
        row: Number(col(row, 'ROW') ?? 0),
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
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] searchContribuyente SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al buscar contribuyentes',
      };
    }
  }

  async getAlcabalasByContribuyente(
    codigo: string,
  ): Promise<AlcabalasResult> {
    try {
      const result = await this.db.executeProcedure<SpAlcabalasByContribuyenteRow>(
        this.SP_DJALCABALA,
        {
          buscar: '6',
          codigo: codigo,
        },
      );

      const data: AlcabalaItem[] = (result.recordset || []).map((row: any) => ({
        idAlcabala: Number(col(row, 'id_alcabala') ?? 0),
        fechaRegistro: String(col(row, 'fecharegistro') ?? ''),
        montoAlcabala: Number(col(row, 'monto_alcabala') ?? 0),
        codPred: String(col(row, 'codpred') ?? ''),
        anioPred: String(col(row, 'aniopred') ?? ''),
        codigoVenta: String(col(row, 'codigo_venta') ?? ''),
        estado: String(col(row, 'estado') ?? ''),
      }));

      return {
        success: true,
        data,
      };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] getAlcabalasByContribuyente SP error: ${err}`);
      return {
        success: false,
        data: [],
        error: 'Error al consultar alcabalas del contribuyente',
      };
    }
  }
}