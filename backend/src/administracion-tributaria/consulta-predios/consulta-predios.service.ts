import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConsultaPrediosDto } from './dto/search-consulta-predios.dto';
import {
  ConsultaPrediosRow,
  ConsultaPrediosSearchResponse,
  SpConsultaPrediosRow,
} from './consulta-predios.types';

const SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Mapeo posicional del SELECT de @busc=19 (ConsultapredController L111-127). */
export function mapConsultaPredioRow(
  row: SpConsultaPrediosRow,
): ConsultaPrediosRow {
  const cells = row ?? [];
  return {
    codigo: toText(cells[0]),
    nombre: toText(cells[1]),
    cod_pred: toText(cells[2]),
    anexo: `${toText(cells[3])}-${toText(cells[4])}`,
    direccion: toText(cells[5]),
    uso: toText(cells[6]),
    t_area_const: toNumber(cells[7]),
    area_terreno: toNumber(cells[8]),
    porcen: toNumber(cells[9]),
    val_terreno: toNumber(cells[10]),
    val_constru: toNumber(cells[11]),
    autoavaluo: toNumber(cells[12]),
    id_instalas: toText(cells[13]),
    num_pisos: toNumber(cells[14]),
    categoria: toText(cells[15]),
  };
}

@Injectable()
export class ConsultaPrediosService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * `@busc=20` entrega el total (primera columna de la primera fila) y
   * `@busc=19` las filas paginadas. Todos los valores se enlazan como
   * parámetros nominales: nunca se concatenan en la consulta.
   */
  async search(
    dto: SearchConsultaPrediosDto,
  ): Promise<ConsultaPrediosSearchResponse> {
    const {
      codigo,
      codPred,
      anno,
      codVia,
      urbBus,
      nro,
      dpto,
      mza,
      lte,
      sublote,
      page,
      pageSize,
    } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = inicio + pageSize - 1;

    const totalResult = await this.db.executeProcedure<SpConsultaPrediosRow>(
      SP_MCONTRIBUYENTE,
      {
        '@busc': 20,
        '@anno': anno,
        '@id_via': codVia,
        '@nro': nro,
        '@dpto': dpto,
        '@Mza': mza,
        '@Lte': lte,
        '@SubLte': sublote,
        '@cod_pred': codPred,
        '@codigo': codigo,
        '@cod_urb': urbBus,
      },
    );

    const total = toNumber(totalResult.recordset?.[0]?.[0]);

    const rowsResult = await this.db.executeProcedure<SpConsultaPrediosRow>(
      SP_MCONTRIBUYENTE,
      {
        '@busc': 19,
        '@anno': anno,
        '@id_via': codVia,
        '@nro': nro,
        '@dpto': dpto,
        '@Mza': mza,
        '@Lte': lte,
        '@SubLte': sublote,
        '@cod_pred': codPred,
        '@codigo': codigo,
        '@inicio': inicio,
        '@final': final,
        '@cod_urb': urbBus,
      },
    );

    const data = (rowsResult.recordset ?? []).map((row) =>
      mapConsultaPredioRow(row),
    );
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
