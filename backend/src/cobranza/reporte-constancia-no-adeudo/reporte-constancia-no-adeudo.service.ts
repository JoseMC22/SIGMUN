import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConstanciaNoAdeudoDto } from './dto/search-constancia-no-adeudo.dto';
import {
  ConstanciaNoAdeudoResult,
  ConstanciaNoAdeudoRow,
} from './reporte-constancia-no-adeudo.types';

@Injectable()
export class ReporteConstanciaNoAdeudoService {
  private readonly SP_NAME = 'Certificado.sp_certificado';
  private readonly logger = new Logger(ReporteConstanciaNoAdeudoService.name);

  /**
   * Rango sin acotar, en el formato que el SP espera (varchar ISO,YYYY-MM-DD).
   *
   * NO se puede "desactivar" el filtro mandando cadena vacía. El SP concatena:
   *   cab.fec_impresion >= @fini + ' 00:00:00'
   * Con @fini = '' eso queda ' 00:00:00', que SQL Server convierte a
   * 1900-01-01 00:00:00 — y @ffin = '' a 1900-01-01 23:59:59. Los DOS extremos
   * quedan fijados en 1900, así que solo|matchearían constancias de ese año.
   * El SP no tiene guarda del tipo (@fini = '' OR ...), por eso se manda un
   * rango abierto explícito en vez de vacío.
   *
   * 1900-01-01 es un piso seguro: fec_impresion nunca puede ser anterior.
   */
  private readonly RANGO_ABIERTO = {
    desde: '1900-01-01',
    hasta: '9999-12-31',
  };

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca constancias de no adeudos ejecutando Certificado.sp_certificado
   * con @BUSC = '5', @Codigo (opcional), @fini, @ffin (opcional).
   * El SP no tiene paginación → se traen todas las filas y se pagina en memoria.
   *
   * Precedencia del filtro: si @Codigo viene informado, el rango de fechas se
   * ignora y se manda @fini/@ffin con un rango abierto. Un código es un
   * identificador exacto, así que acotarlo por fechas sólo puede vaciar el
   * resultado (p. ej. una constancia emitida fuera del rango elegido).
   *
   * El mismo rango abierto se usa si el rango viene incompleto (solo uno de los
   * dos extremos), porque el SP exige ambos para acotar y con uno vacío
   * devolvería 0 filas en silencio.
   *
   * La decisión vive acá y no en el cliente para que todos los que consulten el
   * SP respeten lo mismo.
   */
  async search(dto: SearchConstanciaNoAdeudoDto): Promise<ConstanciaNoAdeudoResult> {
    const { page, pageSize, Codigo, fini, ffin } = dto;

    // Un código compuesto solo de espacios se trata como ausente.
    const buscaPorCodigo = (Codigo ?? '').trim() !== '';
    const rangoIncompleto = !fini || !ffin;
    const usaRangoAbierto = buscaPorCodigo || rangoIncompleto;

    if (usaRangoAbierto) {
      const motivo = buscaPorCodigo
        ? 'Codigo informado'
        : 'rango de fechas incompleto';
      this.logger.log(
        `[ReporteConstanciaNoAdeudo] ${motivo}: se ignora el rango ` +
          `(recibido fini="${fini}", ffin="${ffin}") y se usa rango abierto`,
      );
    }

    const spParams: Record<string, any> = {
      BUSC: '5', // fijo
      Codigo: Codigo || '',
      fini: usaRangoAbierto ? this.RANGO_ABIERTO.desde : fini,
      ffin: usaRangoAbierto ? this.RANGO_ABIERTO.hasta : ffin,
    };

    this.logger.log(
      `[ReporteConstanciaNoAdeudo] SP params: ${JSON.stringify(spParams)}`,
    );

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const allRows = (result.recordset ?? []) as any[];
      this.logger.log(
        `[ReporteConstanciaNoAdeudo] SP returned ${allRows.length} rows`,
      );

      // Mapeo a ConstanciaNoAdeudoRow: respetar casing literal, mapear null → ''
      const mappedAllRows: ConstanciaNoAdeudoRow[] = allRows.map((row: any) => {
        const out: ConstanciaNoAdeudoRow = {};
        // Copiar todas las claves tal como vienen del SP
        for (const key of Object.keys(row)) {
          const val = row[key];
          // Mapear null -> '' para no enviar null al frontend
          if (val === null || val === undefined) {
            (out as any)[key] = '';
            continue;
          }
          (out as any)[key] = val;
        }
        return out;
      });

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
      this.logger.error(
        `[ReporteConstanciaNoAdeudo] search SP error: ${err}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al consultar el reporte de constancias de no adeudos',
      };
    }
  }
}