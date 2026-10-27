import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReportePagosDto } from './dto/search-reporte-pagos.dto';
import { ReportePagoRow, ReportePagosResult } from './reporte-pagos.types';

/**
 * Acceso case-insensitive a columnas del recordset: el driver mssql puede
 * devolver los alias con distinto casing según la versión.
 */
function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`. La query corre con `set dateformat dmy`. */
function toSpDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function asText(value: any): string {
  return value === null || value === undefined ? '' : String(value);
}

function asNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reporte de Pagos — grilla "Parte Diario" del legacy `tesoreportes/reppagos`.
 *
 * Réplica de `Caja.sp_rptTesoreria` `@buscar=9`, con dos diferencias que el
 * volumen de datos hace obligatorias:
 *
 *  1. **Paginación server-side.** El SP original devuelve todas las filas del
 *     rango; con un año calendario son ~66 700 filas. Acá se pagina con
 *     `OFFSET/FETCH` y el total (conteo y suma) se calcula en una query aparte.
 *  2. **UDF acotadas a la página.** `dbo.fx_muestratributos` y
 *     `Rentas.getNombres` son funciones escalares de ~5–6 ms cada una. El SP
 *     las ejecuta una vez por fila (≈400 s para un año); acá se ejecutan solo
 *     sobre las filas de la página (≈100).
 *
 * El resto de la semántica (columnas, monto anulado, colores) es idéntica. Las
 * dos desviaciones deliberadas en los filtros de placa/papeleta —el recibo
 * fantasma que arrastra el centinela `' '` del SP y las filas duplicadas del
 * `inner join`— están documentadas en `buildFilterSql`.
 */
@Injectable()
export class ReportePagosService {
  private readonly logger = new Logger(ReportePagosService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchReportePagosDto): Promise<ReportePagosResult> {
    const page = dto.page;
    const pageSize = dto.page_size;
    const offset = (page - 1) * pageSize;

    const spParams = {
      desde: `${toSpDate(dto.fecha_inicio)} 00:00:00`,
      hasta: `${toSpDate(dto.fecha_fin)} 23:59:59`,
      codigo: dto.codigo ?? '',
      descrip: dto.contribuyente ?? '',
      movimiento: dto.recibo ?? '',
      placa: dto.placa ?? '',
      papeleta: this.buildPapeleta(dto),
    };

    const filters = this.buildFilterSql({
      hasPlaca: spParams.placa !== '',
      hasPapeleta: spParams.papeleta !== '',
    });

    this.logger.log(
      `[ReportePagos] params: ${JSON.stringify({ ...spParams, page, pageSize })}`,
    );

    try {
      const [totalsResult, pageResult] = await Promise.all([
        this.db.query<{ total: number; monto_total: number }>(
          `set dateformat dmy;
           select count(*) as total,
                  sum(case when a.estado = 1 then a.monto else 0.00 end) as monto_total
           ${filters}`,
          spParams,
        ),
        this.db.query<any>(
          `set dateformat dmy;
           with base as (
             select a.num_ingr, a.fec_pago, a.ano_pago, a.codigo, a.observacion,
                    a.monto, a.tipo_pago, a.estado, a.tipo_operacion, a.caja
             ${filters}
           ), paged as (
             select * from base
             order by fec_pago asc, num_ingr asc
             offset @offset rows fetch next @page_size rows only
           )
           select recibo = p.num_ingr,
                  fecha_pago = convert(varchar(10), p.fec_pago, 103) + ' ' + convert(varchar(5), p.fec_pago, 108),
                  codigo = case when p.codigo = '9999999' then '' else p.codigo end,
                  contribuyente = case when p.codigo = '9999999' then p.observacion
                                       else isnull(Rentas.getNombres(p.codigo), '') end,
                  monto = case when p.estado = 1 then p.monto else 0.00 end,
                  tipo_pago = p.tipo_pago,
                  estado = case when p.estado = 0 then 'SI' else 'NO' end,
                  clasificacion = case when p.tipo_operacion = 1 then 'Sismuni'
                                       when p.tipo_operacion = 2 then 'Tupa'
                                       when p.tipo_operacion = 4 then 'Entrada'
                                       else 'Caja' end,
                  tipo_operacion1 = p.tipo_operacion,
                  tipo_rec = c.tipo,
                  caja = (select nombre_caja from Caja.Mcajero with(nolock) where caja = p.caja),
                  tributo = dbo.fx_muestratributos(p.num_ingr)
           from paged p
           left join (select tipo, num_ingr
                      from Caja.Dcajas with(nolock)
                      where tipo = '12.23'
                      group by tipo, num_ingr) c on p.num_ingr = c.num_ingr
           order by p.fec_pago asc, p.num_ingr asc`,
          { ...spParams, offset, page_size: pageSize },
        ),
      ]);

      const totals = (totalsResult.recordset ?? [])[0];
      const total = asNumber(totals?.total);
      const montoTotal = Math.round(asNumber(totals?.monto_total) * 100) / 100;

      const data: ReportePagoRow[] = (pageResult.recordset ?? []).map((row) => ({
        recibo: asText(col(row, 'recibo')),
        fecha_pago: asText(col(row, 'fecha_pago')),
        clasificacion: asText(col(row, 'clasificacion')),
        codigo: asText(col(row, 'codigo')),
        contribuyente: asText(col(row, 'contribuyente')),
        tributo: asText(col(row, 'tributo')),
        monto: asNumber(col(row, 'monto')),
        tipo_pago: asText(col(row, 'tipo_pago')),
        estado: asText(col(row, 'estado')),
        tipo_operacion: asText(col(row, 'tipo_operacion1')),
        tipo_rec: asText(col(row, 'tipo_rec')),
        caja: asText(col(row, 'caja')),
      }));

      this.logger.log(
        `[ReportePagos] total=${total} page=${page}/${Math.ceil(total / pageSize)} rows=${data.length}`,
      );

      return {
        success: true,
        data,
        total,
        monto_total: montoTotal,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      };
    } catch (err) {
      this.logger.error(`[ReportePagos] search error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        monto_total: 0,
        page,
        page_size: pageSize,
        total_pages: 1,
        error: 'Error al consultar el reporte de pagos',
      };
    }
  }

  /**
   * Filtros del SP, en sus dos ramas:
   *  - sin placa/papeleta: aplica `@descrip` sobre `observacion`;
   *  - con placa o papeleta: el SP arma una tabla de `num_ingr` y hace
   *    `inner join` contra ella, y NO aplica `@descrip`.
   *
   * Dos diferencias deliberadas:
   *
   *  1. El SP inserta un centinela `' '` en su tabla temporal cuando un filtro
   *     está vacío. Como SQL Server ignora los espacios finales al comparar
   *     `varchar`, ese `' '` matchea cualquier recibo con `num_ingr` en blanco:
   *     filtrar por placa o papeleta devuelve además ese recibo, que no
   *     corresponde al filtro. Acá no se replica.
   *  2. El `inner join` del SP puede duplicar filas cuando un `num_ingr` tiene
   *     varias combinaciones (`cod_pred`, `num_docu`). Acá el conjunto se
   *     deduplica con `group by`/`union`, así que cada recibo aparece una vez.
   *
   * Además el conjunto de `num_ingr` se calcula una sola vez (`IN (subquery)`)
   * en lugar de un `EXISTS` correlacionado por fila.
   */
  private buildFilterSql(opts: {
    hasPlaca: boolean;
    hasPapeleta: boolean;
  }): string {
    const base = `
      from Caja.MCajas a with(nolock)
      where a.fec_pago between @desde and @hasta
        and a.codigo like '%' + @codigo + '%'
        and a.num_ingr like '%' + @movimiento + '%'`;

    if (!opts.hasPlaca && !opts.hasPapeleta) {
      return `${base}
        and a.observacion like '%' + @descrip + '%'`;
    }

    const placaSet = `
        select d.num_ingr
        from Caja.DCajas d with(nolock)
        inner join Caja.MRecibos r with(nolock) on d.idrecibo = r.idrecibo
        where d.cod_pred like '%' + @placa + '%'
           or d.observacion like '%' + @placa + '%'
           or d.observacion2 like '%' + @placa + '%'
        group by d.num_ingr`;

    const papeletaSet = `
        select r2.num_ingr
        from Caja.MRecibos r2 with(nolock)
        where r2.tipo = '10.86'
          and r2.num_docu like ltrim(rtrim(@papeleta)) + '%'
        group by r2.num_ingr`;

    const parts: string[] = [];
    if (opts.hasPlaca) parts.push(placaSet);
    if (opts.hasPapeleta) parts.push(papeletaSet);

    return `${base}
        and a.num_ingr in (
      ${parts.join('\n          union\n')}
        )`;
  }

  /**
   * Compone `año-talonario-número` como el legacy. Sin número de papeleta no
   * hay filtro: el legacy descarta cualquier valor de 8 caracteres o menos
   * (caso por defecto `2026-01-`).
   */
  private buildPapeleta(dto: SearchReportePagosDto): string {
    const numero = (dto.papeleta ?? '').trim();
    if (!numero) {
      return '';
    }
    const anio = (dto.anio ?? '').trim() || String(new Date().getFullYear());
    const talonario = (dto.talonario ?? '').trim() || '01';
    const papeleta = `${anio}-${talonario}-${numero}`;
    return papeleta.length <= 8 ? '' : papeleta;
  }
}
