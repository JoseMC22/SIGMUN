import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchFraccDetalladoDto } from './dto/search-fracc-detallado.dto';
import { CatalogosFraccDetalladoDto } from './dto/catalogos-fracc-detallado.dto';
import {
  FraccDetalladoAnioRow,
  FraccDetalladoCatalogos,
  FraccDetalladoMesRow,
  FraccDetalladoResult,
  FraccDetalladoRow,
} from './reporte-fracc-detallado.types';

@Injectable()
export class ReporteFraccDetalladoService {
  private readonly SP_NAME = 'Rentas.Rpt_Rentas_General';
  private readonly logger = new Logger(ReporteFraccDetalladoService.name);

  /**
   * Fijo. La rama 40 del SP es 'lista_fracc': una fila por fraccionamiento con
   * el detalle de cuotas (13 columnas, ver reporte-fracc-detallado.types.ts).
   */
  private readonly BUSC = 40;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca fraccionamientos ejecutando Rentas.Rpt_Rentas_General con
   * @BUSC=40, @CODIGO, @ANNO y @id_mes.
   *
   * El SP no pagina -> se traen todas las filas del corte y se pagina en memoria.
   *
   * Dónde vive cada filtro (verificado contra la BD — probe T0 —, no supuesto):
   *
   * - CODIGO: `LIKE '%'+@CODIGO+'%'` (contiene). Vacío = sin acotar y un código
   *   parcial es una búsqueda válida. NO aplicar padCodigo: rellenar el código
   *   con ceros a la izquierda cambiaría la búsqueda (a diferencia de la rama
   *   @BUSC=42, donde era igualdad exacta).
   *
   * - ANNO: igualdad exacta sobre ANIO_SALDO. Obligatorio: vacío = 0 filas.
   *   El DTO lo exige, así que el caso vacío no llega al SP.
   *
   * - id_mes: igualdad exacta sobre MES_SALDO. Obligatorio: vacío = 0 filas.
   *   Va SIN ceros a la izquierda ('8', '11'): el combo devuelve
   *   id_mes = CAST(mes_saldo AS INT) y acá no se formatea.
   *
   * La rama lista_fracc no tiene ORDER BY: el orden de filas queda como lo
   * devuelve el SP (igual que el legado). Agregar ordenamiento propio está
   * fuera de scope de este port.
   */
  async search(dto: SearchFraccDetalladoDto): Promise<FraccDetalladoResult> {
    const { page, pageSize, Codigo, Anno, IdMes } = dto;

    const buscaPorCodigo = (Codigo ?? '').trim() !== '';

    // Nunca loguear el valor de CODIGO: es un identificador personal (R11).
    // Se loguea si hubo código y cuánto mide, jamás el valor.
    this.logger.log(
      `[ReporteFraccDetallado] SP params: BUSC=${this.BUSC}, ANNO=${Anno}, ` +
        `id_mes=${IdMes}, ` +
        `codigo=${
          buscaPorCodigo
            ? `presente (${Codigo.length} chars)`
            : 'ausente (sin acotar)'
        }`,
    );

    try {
      const result = await this.db.executeProcedure<FraccDetalladoRow>(
        this.SP_NAME,
        { BUSC: this.BUSC, CODIGO: Codigo || '', ANNO: Anno, id_mes: IdMes },
        undefined,
        60000,
      );
      const allRows: FraccDetalladoRow[] = result.recordset ?? [];
      this.logger.log(
        `[ReporteFraccDetallado] SP returned ${allRows.length} rows`,
      );

      // Mapeo a FraccDetalladoRow: null -> '' para no enviar null al frontend.
      const mappedAllRows: FraccDetalladoRow[] = allRows.map((row) => {
        const out: FraccDetalladoRow = {};
        for (const key of Object.keys(row)) {
          const val = row[key];
          out[key] = val === null || val === undefined ? '' : val;
        }
        return out;
      });

      // Todos los filtros vive en el SP: no hay filtro en memoria.
      const total = mappedAllRows.length;
      const start = (page - 1) * pageSize;
      const paginatedRows = mappedAllRows.slice(start, start + pageSize);
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

      return {
        success: true,
        data: paginatedRows,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (err) {
      this.logger.error(`[ReporteFraccDetallado] search SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al consultar el reporte de fraccionamientos detallado',
      };
    }
  }

  /**
   * Combos Año Corte / Mes Corte (Decisión 5 del design).
   *
   * - @BUSC=38 -> columna anio_saldo: años distintos, DESC (el más reciente
   *   primero, que es el default del combo).
   * - @BUSC=39, @ANNO=<año> -> columnas id_mes, nom_mes: meses de ese año.
   *
   * Sin Anno solo se piden los años: el combo Mes Corte se refresca al cambiar
   * el año (el legado lo cargaba una vez y mostraba meses de un año que ya no
   * era el seleccionado — un bug silencioso que este port no replica).
   */
  async getCatalogos(
    dto: CatalogosFraccDetalladoDto,
  ): Promise<FraccDetalladoCatalogos> {
    const { Anno } = dto;
    const pideMeses = (Anno ?? '').trim() !== '';

    try {
      const aniosResult = await this.db.executeProcedure<FraccDetalladoAnioRow>(
        this.SP_NAME,
        { BUSC: 38 },
        undefined,
        60000,
      );
      // Char puede venir con espacios de relleno; se trima para el combo.
      const anios: string[] = (aniosResult.recordset ?? [])
        .map((row) => String(row.anio_saldo ?? '').trim())
        .filter((anio) => anio !== '');

      let meses: { id_mes: number; nom_mes: string }[] = [];
      if (pideMeses) {
        const mesesResult = await this.db.executeProcedure<FraccDetalladoMesRow>(
          this.SP_NAME,
          { BUSC: 39, ANNO: Anno },
          undefined,
          60000,
        );
        // id_mes = CAST(mes_saldo AS INT): sin ceros a la izquierda, que es
        // como lo espera el filtro MES_SALDO = @id_mes de la búsqueda.
        meses = (mesesResult.recordset ?? [])
          .map((row) => ({
            id_mes: Number(row.id_mes ?? ''),
            nom_mes: String(row.nom_mes ?? '').trim(),
          }))
          .filter(
            (mes) =>
              Number.isInteger(mes.id_mes) &&
              mes.id_mes >= 1 &&
              mes.id_mes <= 12 &&
              mes.nom_mes !== '',
          );
      }

      this.logger.log(
        `[ReporteFraccDetallado] catalogos: ${anios.length} anios` +
          (pideMeses
            ? `, ${meses.length} meses para ANNO=${Anno}`
            : ' (sin meses)'),
      );

      return { success: true, anios, meses };
    } catch (err) {
      this.logger.error(`[ReporteFraccDetallado] catalogos SP error: ${err}`);
      return {
        success: false,
        anios: [],
        meses: [],
        error: 'Error al consultar los catálogos del reporte',
      };
    }
  }
}
