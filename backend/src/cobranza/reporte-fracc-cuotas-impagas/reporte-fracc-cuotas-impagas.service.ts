import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchFraccCuotasImpagasDto } from './dto/search-fracc-cuotas-impagas.dto';
import {
  FraccCuotasImpagasResult,
  FraccCuotasImpagasRow,
} from './reporte-fracc-cuotas-impagas.types';

/**
 * Convierte una fecha dd/mm/yyyy del SP a un numero comparable YYYYMMDD.
 *
 * Se usa un entero y no un Date a proposito: construir un Date con new Date('2003/11/15')
 * depende del locale del runtime, y comparar strings dd/mm/yyyy no ordena por fecha
 * ('15/11/2003' > '30/09/2016' es true y las dos cosas estan mal).
 * Devuelve null si la fecha no existe o no se puede leer.
 */
function aClaveFecha(ddmmyyyy: unknown): number | null {
  if (ddmmyyyy === null || ddmmyyyy === undefined) return null;
  const m = String(ddmmyyyy).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return anio * 10000 + mes * 100 + dia;
}

/** YYYY-MM-DD -> YYYYMMDD. El DTO ya garantiza el formato. */
function isoAClaveFecha(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

/** YYYY-MM-DD -> dd/mm/yyyy, que es el formato que espera el SP. */
function isoADdMmYyyy(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

@Injectable()
export class ReporteFraccCuotasImpagasService {
  private readonly SP_NAME = 'Rentas.Rpt_Rentas_General';
  private readonly logger = new Logger(ReporteFraccCuotasImpagasService.name);

  /**
   * Fijo. La rama 42 del SP es 'rpt_fraccionamientos_resumen': una fila por
   * fraccionamiento, con el resumen de cuotas impagadas.
   */
  private readonly BUSC = 42;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca fraccionamientos con cuotas impagadas ejecutando
   * Rentas.Rpt_Rentas_General con @BUSC=42, @CODIGO y @FECH_INI.
   *
   * El SP no pagina -> se traen todas las filas y se pagina en memoria.
   *
   * Dónde vive cada filtro (verificado contra la BD, no supuesto):
   *
   * - CODIGO: el SP lo aplica, con `where t.codigo LIKE '%'+@CODIGO+'%' or @CODIGO=''`.
   *   Ese WHERE es un cambio pendiente en la BD: mientras siga siendo
   *   `t.codigo = @CODIGO or t.codigo = ''`, mandar el codigo vacio devuelve 0 filas
   *   (el datamart tiene 11302 filas y ninguna con codigo vacio o NULL, asi que el
   *   `or t.codigo=''` no matchea nunca). Se manda el codigo tal cual y se loguea
   *   el caso de "codigo vacio trajo 0 filas" para que no parezca un bug del backend.
   *
   * - FECH_INI: la rama 42 NO lo usa. La fecha de corte se aplica aqui, en memoria,
   *   sobre 'F.Convenio', que es la unica fecha real por fraccionamiento que trae el
   *   SELECT DISTINCT ('fecha' es la de la cuota y no esta en el SELECT; 'curren_date'
   *   es constante en todo el resultado). Aun asi se manda @FECH_INI al SP para que,
   *   si el DBA agrega el filtro del lado de la base, no haya que tocar el backend.
   */
  async search(
    dto: SearchFraccCuotasImpagasDto,
  ): Promise<FraccCuotasImpagasResult> {
    const { page, pageSize, Codigo, FechCorte } = dto;

    const buscaPorCodigo = (Codigo ?? '').trim() !== '';
    const usaFechaCorte = (FechCorte ?? '').trim() !== '';

    const spParams: Record<string, any> = {
      BUSC: this.BUSC, // fijo
      CODIGO: Codigo || '',
      FECH_INI: usaFechaCorte ? isoADdMmYyyy(FechCorte) : '',
    };

    this.logger.log(
      `[ReporteFraccCuotasImpagas] SP params: ${JSON.stringify(spParams)}`,
    );

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
        undefined,
        60000,
      );
      const allRows = (result.recordset ?? []) as any[];
      this.logger.log(
        `[ReporteFraccCuotasImpagas] SP returned ${allRows.length} rows`,
      );

      // Mapeo a FraccCuotasImpagasRow: null -> '' para no enviar null al frontend.
      const mappedAllRows: FraccCuotasImpagasRow[] = allRows.map((row: any) => {
        const out: FraccCuotasImpagasRow = {};
        for (const key of Object.keys(row)) {
          const val = row[key];
          out[key] = val === null || val === undefined ? '' : val;
        }
        return out;
      });

      // Codigo vacio + 0 filas casi siempre significa que el WHERE del SP todavia
      // es `t.codigo = @CODIGO or t.codigo = ''`. Se avisa en el log, no se oculta.
      if (!buscaPorCodigo && allRows.length === 0) {
        this.logger.warn(
          `[ReporteFraccCuotasImpagas] 0 filas con CODIGO vacio. La rama @BUSC=42 ` +
            `debe filtrar con "t.codigo LIKE '%'+@CODIGO+'%' or @CODIGO=''"; ` +
            `si sigue usando "t.codigo = @CODIGO or t.codigo = ''" devuelve 0 filas ` +
            `siempre porque el datamart no tiene codigos vacios.`,
        );
      }

      // Fecha de corte: el SP no la aplica en esta rama.
      let rowsFiltradas = mappedAllRows;
      if (usaFechaCorte) {
        const corte = isoAClaveFecha(FechCorte);
        let sinFecha = 0;
        rowsFiltradas = mappedAllRows.filter((row) => {
          const fecha = aClaveFecha(row['F.Convenio']);
          // Sin fecha legible no se puede comprobar que cae dentro del corte, asi que
          // la fila se excluye. Se cuenta aparte para que el silencio sea visible.
          if (fecha === null) {
            sinFecha++;
            return false;
          }
          return fecha <= corte;
        });
        this.logger.log(
          `[ReporteFraccCuotasImpagas] fecha de corte ${FechCorte} (dd/mm/yyyy ` +
            `${isoADdMmYyyy(FechCorte)}): ${mappedAllRows.length} -> ` +
            `${rowsFiltradas.length} filas (${sinFecha} sin F.Convenio legible, excluidas)`,
        );
      }

      const total = rowsFiltradas.length;
      const start = (page - 1) * pageSize;
      const paginatedRows = rowsFiltradas.slice(start, start + pageSize);
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
      this.logger.error(
        `[ReporteFraccCuotasImpagas] search SP error: ${err}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al consultar el reporte de cuotas impagadas',
      };
    }
  }
}