import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConsultaPrediosDto } from './dto/search-consulta-predios.dto';
import { ExportConsultaPrediosDto } from './dto/export-consulta-predios.dto';
import {
  ConsultaPrediosExportColumn,
  ConsultaPrediosExportResponse,
  ConsultaPrediosRow,
  ConsultaPrediosSearchResponse,
  SpConsultaPrediosRow,
} from './consulta-predios.types';

const SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';

/**
 * Encabezados del export según design D8 (etiquetas legacy con las correcciones
 * de D9); `sourceIndex: -1` es la numeración `N` generada por el service.
 * El índice 15 del SP se omite porque contiene el título del reporte.
 */
const EXPORT_BASE_COLUMNS: readonly ConsultaPrediosExportColumn[] = [
  { key: 'n', label: 'N', sourceIndex: -1 },
  { key: 'codigo', label: 'CODIGO', sourceIndex: 0 },
  { key: 'nombre', label: 'NOMBRE', sourceIndex: 1 },
  { key: 'predio', label: 'PREDIO', sourceIndex: 2 },
  { key: 'anexo', label: 'ANEXO', sourceIndex: 3 },
  { key: 'direccion', label: 'DIRECCIÓN', sourceIndex: 4 },
  { key: 'uso', label: 'USO', sourceIndex: 5 },
  { key: 'area_terreno', label: 'Area Terreno', sourceIndex: 6 },
  { key: 'porcen', label: '% Propiedad', sourceIndex: 7 },
  { key: 't_area_const', label: 'T. Area Const.', sourceIndex: 8 },
  { key: 'val_terreno', label: 'Val. Terreno', sourceIndex: 9 },
  { key: 'val_constru', label: 'Val. Construccion', sourceIndex: 10 },
  { key: 'autoavaluo', label: 'Autoavaluo', sourceIndex: 11 },
  { key: 'id_instalas', label: 'Instalaciones', sourceIndex: 12 },
  { key: 'num_pisos', label: 'N° Pisos', sourceIndex: 13 },
  { key: 'categoria', label: 'Categoria', sourceIndex: 14 },
];

const EXPORT_PISO_COLUMNS: readonly ConsultaPrediosExportColumn[] = [
  { key: 'item_piso', label: 'Item Piso', sourceIndex: 16 },
  { key: 'nivel_piso', label: 'Nivel Piso', sourceIndex: 17 },
  { key: 'mes_const', label: 'Mes Const.', sourceIndex: 18 },
  { key: 'anio_const', label: 'Anio Const.', sourceIndex: 19 },
  { key: 'clasificacion', label: 'Clasificacion', sourceIndex: 20 },
  { key: 'material', label: 'Material', sourceIndex: 21 },
  { key: 'estado', label: 'Estado', sourceIndex: 22 },
  { key: 'cat_muros', label: 'Cat. Muros', sourceIndex: 23 },
  { key: 'cat_techo', label: 'Cat. Techo', sourceIndex: 24 },
  { key: 'cat_pisos', label: 'Cat. Pisos', sourceIndex: 25 },
  { key: 'cat_puerta', label: 'Cat. Puerta', sourceIndex: 26 },
  { key: 'cat_reves', label: 'Cat. Revés', sourceIndex: 27 },
  { key: 'cat_bano', label: 'Cat. Baño', sourceIndex: 28 },
  { key: 'cat_insel', label: 'Cat. Insel', sourceIndex: 29 },
  { key: 'val_uni', label: 'Val. Uni', sourceIndex: 30 },
  { key: 'area_const', label: 'Area. Const.', sourceIndex: 31 },
  { key: 'val_const', label: 'Val. Const.', sourceIndex: 32 },
];

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
        'busc': 20,
        'anno': anno,
        'id_via': codVia,
        'nro': nro,
        'dpto': dpto,
        'Mza': mza,
        'Lte': lte,
        'SubLte': sublote,
        'cod_pred': codPred,
        'codigo': codigo,
        'cod_urb': urbBus,
      },
    );

    const total = toNumber(totalResult.recordset?.[0]?.[0]);

    const rowsResult = await this.db.executeProcedure<SpConsultaPrediosRow>(
      SP_MCONTRIBUYENTE,
      {
        'busc': 19,
        'anno': anno,
        'id_via': codVia,
        'nro': nro,
        'dpto': dpto,
        'Mza': mza,
        'Lte': lte,
        'SubLte': sublote,
        'cod_pred': codPred,
        'codigo': codigo,
        'inicio': inicio,
        'final': final,
        'cod_urb': urbBus,
      },
    );

    const data = (rowsResult.recordset ?? []).map((row) =>
      mapConsultaPredioRow(row),
    );
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  /**
   * `@busc='21'` devuelve las filas del reporte. La celda 15 es el título y
   * nunca se emite como dato; con `@flag_pisos='1'` se agregan las celdas
   * 16..32. Todos los valores se enlazan como parámetros nominales.
   */
  async exportPredios(
    dto: ExportConsultaPrediosDto,
  ): Promise<ConsultaPrediosExportResponse> {
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
      mostrarPisos,
    } = dto;

    const result = await this.db.executeProcedure<SpConsultaPrediosRow>(
      SP_MCONTRIBUYENTE,
      {
        'busc': '21',
        'codigo': codigo,
        'cod_pred': codPred,
        'id_via': codVia,
        'cod_urb': urbBus,
        'anno': anno,
        'nro': nro,
        'dpto': dpto,
        'Mza': mza,
        'Lte': lte,
        'SubLte': sublote,
        'flag_pisos': mostrarPisos ? '1' : '0',
      },
    );

    const spRows = result.recordset ?? [];
    const columns = mostrarPisos
      ? [...EXPORT_BASE_COLUMNS, ...EXPORT_PISO_COLUMNS]
      : EXPORT_BASE_COLUMNS;
    const dataColumns = columns.slice(1);

    const rows = spRows.map((row, index) => {
      const cells = row ?? [];
      return [
        String(index + 1),
        ...dataColumns.map((column) => toText(cells[column.sourceIndex])),
      ];
    });

    return {
      title: toText(spRows[0]?.[15]),
      mostrarPisos,
      columns: [...columns],
      rows,
    };
  }
}
