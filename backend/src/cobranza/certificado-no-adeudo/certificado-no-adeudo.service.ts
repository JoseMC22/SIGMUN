import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  ContribuyenteRow,
  SearchContribuyenteResult,
} from './certificado-no-adeudo.types';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpRow = Record<string, any>;

/** Normaliza valores del SP a texto; ignora valores no serializables. */
const str = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (v instanceof Date) return v.toISOString();
  return '';
};

function mapContribuyente(row: SpRow): ContribuyenteRow {
  return {
    codigo: str(row.codigo),
    nombres: str(row.nombres),
    paterno: str(row.paterno),
    materno: str(row.materno),
    documento: str(row.documento),
    numDoc: str(row.num_doc),
    direccion: str(row.DireFis),
  };
}

@Injectable()
export class CertificadoNoAdeudoService {
  private readonly logger = new Logger(CertificadoNoAdeudoService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Busqueda de contribuyentes (Rentas.sp_Mcontribuyente @busc=5/6). */
  async search(
    dto: SearchContribuyenteDto,
  ): Promise<SearchContribuyenteResult> {
    const baseParams = {
      codigo: dto.Codigo ?? '',
      nombres: dto.Nombres ?? '',
      paterno: dto.Paterno ?? '',
      materno: dto.Materno ?? '',
      razon: dto.Razon ?? '',
      num_doc: dto.NumDoc ?? '',
      tipo_busqueda: dto.TipoBusqueda,
      cod_pred: '',
      checkfrac: 0,
    };

    try {
      const countResult = await this.db.executeProcedure(
        'Rentas.sp_Mcontribuyente',
        { ...baseParams, busc: 6 },
      );
      const countRow = countResult.recordset?.[0] as SpRow | undefined;
      const total = countRow ? Number(Object.values(countRow)[0] ?? 0) : 0;

      if (total === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          page: dto.page,
          pageSize: dto.pageSize,
          totalPages: 0,
        };
      }

      if (dto.pageSize === 100000) {
        const exportResult = await this.db.executeProcedure(
          'Rentas.sp_Mcontribuyente',
          { ...baseParams, busc: 5, inicio: String(1), final: String(total) },
        );
        const data = (exportResult.recordset ?? []).map((r) =>
          mapContribuyente(r as SpRow),
        );
        return {
          success: true,
          data,
          total,
          page: 1,
          pageSize: 100000,
          totalPages: 1,
        };
      }

      const inicio = (dto.page - 1) * dto.pageSize + 1;
      const final = dto.page * dto.pageSize;
      const rowsResult = await this.db.executeProcedure(
        'Rentas.sp_Mcontribuyente',
        {
          ...baseParams,
          busc: 5,
          inicio: String(inicio),
          final: String(final),
        },
      );
      const data = (rowsResult.recordset ?? []).map((r) =>
        mapContribuyente(r as SpRow),
      );

      return {
        success: true,
        data,
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: Math.ceil(total / dto.pageSize),
      };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] search error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: 0,
        error: 'Error al consultar los contribuyentes',
      };
    }
  }
}
