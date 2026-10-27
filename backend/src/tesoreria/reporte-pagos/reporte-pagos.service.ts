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
  // ── Reimpresión interna (replica los templates legacy) ─────────────────

  private esc(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private money(value: any): string {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  async getReciboHtml(numIngr: string, tipo: string, reimp: boolean): Promise<string> {
    if (tipo === '2') {
      return this.getReciboTupaHtml(numIngr, reimp);
    }
    return this.getReciboSismuniHtml(numIngr, reimp);
  }

  private async getReciboSismuniHtml(numIngr: string, reimp: boolean): Promise<string> {
    const result = await this.db.executeProcedure<any>(
      'Caja.sp_Recibos_emitidos_sat',
      { buscar: 5, codigo: '', num_ingr: numIngr, cod_pred: '', anexo: '', sub_anexo: '', tipo: '', anno: '' },
    );
    const rows: any[] = result.recordset ?? [];
    if (rows.length === 0) {
      return this.notFoundHtml(numIngr);
    }
    const r = rows[0];
    const codigo = String(r.codigo ?? r[0] ?? '').trim();
    const nombres = String(r.nombres ?? r[1] ?? '');
    const numIngreso = String(r.num_ingr ?? r[2] ?? numIngr).trim();
    const codPred = String(r.cod_pred ?? r[3] ?? '').trim();
    const anno = String(r.anno ?? r[6] ?? '');
    const periodo = String(r.periodo ?? r[8] ?? '').trim();
    const direccion = String(r.direccion ?? r[20] ?? '');
    const tipodes = String(r.tipodes ?? r[21] ?? '');
    const descrip = String(r.descrip ?? r[22] ?? '');
    const doc = String(r.doc ?? r[23] ?? '');
    const fecPago = String(r.fec_pago ?? r[16] ?? '');
    const nombCajero = String(r.nomb_cajero ?? r[17] ?? '');
    const fecImp = String(r.fec_imp ?? r[19] ?? '');
    const liquidacion = String(r.liquidacion ?? r[28] ?? '');
    const efectivo = Number(r.efectivo ?? r[25] ?? 0);
    const vuelto = Number(r.vuelto ?? r[26] ?? 0);

    const lista = ['ARB', 'IP-', 'MUL', 'PIT', 'VEH'];
    const etiqueta = lista.includes(codPred.substring(0, 3)) ? 'Referenc.:' : 'Cod. Predio:';

    const detailRows = rows
      .map((row) => {
        const tributo = String(row.descrip ?? row[22] ?? '');
        const insol = this.money(row.imp_insol ?? row[9]);
        const reaj = this.money(row.imp_reaj ?? row[10]);
        const mora = this.money(row.imp_mora ?? row[11]);
        const total = this.money(row.montotal ?? row[13]);
        const per = String(row.periodo ?? row[8] ?? '').trim();
        return `<tr>
          <td width="56" height="10" class="Estilo8">${this.esc(tributo)}</td>
          <td width="40" align="right" class="Estilo8">${insol}</td>
          <td width="40" align="right" class="Estilo8">${reaj}</td>
          <td width="40" align="right" class="Estilo8">${mora}</td>
          <td width="50" align="right" class="Estilo8">${total}</td>
        </tr>
        <tr>
          <td colspan="5" width="56" height="10" class="Estilo8">Periodos: ${this.esc(per)}</td>
        </tr>
        <tr>
          <td colspan="5" height="10" class="Estilo8"></td>
        </tr>`;
      })
      .join('');

    const sumtotal = rows.reduce((acc, row) => acc + Number(row.montotal ?? row[13] ?? 0), 0);
    const sumtotalStr = this.money(sumtotal);
    const efectivoStr = this.money(efectivo === 0 ? sumtotal : efectivo);
    const vueltoStr = this.money(vuelto);

    const dscto = rows.reduce(
      (acc, row) => acc + (Number(row.imp_insol ?? row[9] ?? 0) - Number(row.imp_reaj ?? row[10] ?? 0)),
      0,
    );

    const reimpre = reimp ? '<h1>COPIA</h1>' : '';

    const dsctoHtml =
      dscto > 0
        ? `<tr><td height="20" class="dsctot" colspan="4" align="right">Descuento:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td align="right" class="dscto">${this.money(dscto * -1)}</td></tr>`
        : '';

    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es" lang="es">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Servicio de Administracion Tributaria de Ica</title>
<style type="text/css">
@media print { BODY { font-size: 14pt; font-family: Arial; } }
@media screen { BODY { font-size: 12pt; font-family: Arial; } }
@media screen, print { BODY { color: #000000; } }
body { margin-left: 0px; margin-right: 0px; }
.Estilo6 { font-size: 12px }
.Estilo8 { font-size: 11px }
.Estilo9 { font-size: 12px; font-weight: bold; }
.Estilo3 { font-size: 18px; }
.Estilo4 { font-size: 18px; font-weight: bold; }
.Numerorec { font-size: 14px; font-weight: bold; }
.copia { z-index: 1; position: absolute; left: 65%; bottom: 90%; }
body,td,th { font-family: "Courier New", Courier, monospace; }
</style>
<script language="javascript">window.print(); window.close();</script>
</head>
<body>
<table width="100%" style="border: 0px solid" id="muni">
  <tr>
    <td height="24" colspan="6" class="Estilo6"><b>Servicio de Administracion Tributaria de Ica<br>RUC: 20452454972</b><hr align="left" width="100%"></td>
  </tr>
  <tr>
    <td width="75" height="16" class="Numerorec">Recibo:</td>
    <td width="939" height="16" colspan="5" class="Numerorec">${this.esc(numIngreso)}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">Liquidaci&oacute;n:</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(liquidacion)}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">Codigo:</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(codigo)}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">Nombre:</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(nombres)}</td>
  </tr>
  <tr>
    <td colspan="6" class="copia" align="left">${reimpre}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">Documento:</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(doc)}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">${etiqueta}</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(codPred)}</td>
  </tr>
  <tr>
    <td height="16" class="Estilo8">Direcc. :</td>
    <td height="16" colspan="5" class="Estilo8">${this.esc(direccion)}</td>
  </tr>
  <tr>
    <td height="25" colspan="6" class="Estilo6" align="center">${this.esc(tipodes)}-${this.esc(anno)}</td>
  </tr>
  <tr>
    <td colspan="6" align="center">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td width="245" height="20" class="Estilo8">Tributos</td>
          <td width="245" align="right" class="Estilo8">Inso/Reaj</td>
          <td width="175" align="right" class="Estilo8">Mora</td>
          <td width="208" align="right" class="Estilo8">Form.</td>
          <td width="145" align="right" class="Estilo8">Total</td>
        </tr>
        ${detailRows}
        <tr>
          <td height="20" class="Estilo9" colspan="4" align="right">TOTAL:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
          <td align="right" class="Estilo4">${sumtotalStr}</td>
        </tr>
        <tr>
          <td height="20" class="Estilo6" colspan="4" align="right">Efectivo:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
          <td align="right" class="Estilo3">${efectivoStr}</td>
        </tr>
        <tr>
          <td height="20" class="Estilo6" colspan="4" align="right">Vuelto:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
          <td align="right" class="Estilo3">${vueltoStr}</td>
        </tr>
        ${dsctoHtml ? `<tr>${dsctoHtml}</tr>` : ''}
        <tr>
          <td class="Estilo6" colspan="6" align="left">Son:&nbsp;${sumtotalStr} SOLES</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td>&nbsp;</td></tr>
  <tr>
    <td colspan="6" class="Estilo8">Fecha Pago: ${this.esc(fecPago)}</td>
  </tr>
  <tr>
    <td colspan="6" class="Estilo8" align="left">Cajero: ${this.esc(nombCajero)}</td>
  </tr>
  <tr>
    <td colspan="6" class="Estilo8" align="left">Fecha Impresion: ${this.esc(fecImp)}</td>
  </tr>
  <tr>
    <td colspan="6" height="30">.</td>
  </tr>
</table>
</body>
</html>`;
  }

  private async getReciboTupaHtml(numIngr: string, reimp: boolean): Promise<string> {
    const result = await this.db.executeProcedure<any>(
      'Caja.sp_Recibos_emitidos_ndiseno',
      { buscar: 6, codigo: '', num_ingr: numIngr, cod_pred: '', anexo: '', sub_anexo: '', tipo: '' },
    );
    const rows: any[] = result.recordset ?? [];
    if (rows.length === 0) {
      return this.notFoundHtml(numIngr);
    }
    const r = rows[0];
    const numRaw = r.num_ingr ?? r[0] ?? numIngr;
    const numStr = Array.isArray(numRaw) ? String(numRaw[0] ?? numIngr).trim() : String(numRaw).trim();
    const codigo = String(r.codigo ?? r[1] ?? '').trim();
    const nombres = String(r.nombres ?? r[2] ?? '');
    const caja = String(r.caja ?? r[3] ?? '');
    const fecPago = String(r.fec_pago ?? r[4] ?? '');
    const monto = Number(r.monto ?? r[5] ?? 0);
    const estadoArr = r.estado ?? r[6];
    const estado = String(Array.isArray(estadoArr) ? estadoArr[1] : estadoArr ?? '').trim();
    const operadorArr = r.operador ?? r[7];
    const operador = String(Array.isArray(operadorArr) ? operadorArr[0] : operadorArr ?? '');
    const tipoRec = String(r.tipo_rec ?? r[15] ?? '');
    const conceptoArr = r.concepto ?? r[28];
    const concepto = String(Array.isArray(conceptoArr) ? conceptoArr[0] : conceptoArr ?? '');
    const nombCajero = String(r.nomb_cajero ?? r[27] ?? '');
    const fecImp = String(r.fech_ing ?? r[25] ?? '');
    const efectivo = monto;
    const vuelto = 0;
    const reimpre = reimp ? '<h1>COPIA</h1>' : '';

    const detalleRows = rows
      .map((row) => {
        const concArr = row.concepto ?? row[28];
        const conc = String(Array.isArray(concArr) ? concArr[0] : concArr ?? '');
        const imp = this.money(Array.isArray(row.imp_insol) ? row.imp_insol[0] : (row.imp_insol ?? row[17] ?? 0));
        return `<tr>
          <td class="Estilo8" height="15">${this.esc(conc)}</td>
          <td align="right" class="Estilo8">${imp}</td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es" lang="es">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Servicio de Administracion Tributaria de Ica</title>
<style type="text/css">
@media print { BODY { font-size: 14pt; font-family: Arial; } }
@media screen { BODY { font-size: 12pt; font-family: Arial; } }
@media screen, print { BODY { color: #000000; } }
body { margin-left: 0px; margin-right: 0px; }
.Estilo6 { font-size: 12px }
.Estilo8 { font-size: 11px }
.Estilo4 { font-size: 16px; font-weight: bold; }
.Estilo3 { font-size: 18px; }
.Numerorec { font-size: 14px; font-weight: bold; }
.copia { z-index: 1; position: absolute; left: 65%; bottom: 89.7%; }
body,td,th { font-family: "Courier New", Courier, monospace; }
</style>
<script language="javascript">window.print(); window.close();</script>
</head>
<body>
<table width="100%" border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td height="5" colspan="6" class="Estilo6">Servicio de Administracion Tributaria de Ica<br>RUC: 20452454972<hr align="left" width="100%"></td>
    <td class="copia" align="left">${reimpre}</td>
  </tr>
  <tr>
    <td colspan="3" height="10"></td>
  </tr>
  <tr>
    <td class="Numerorec" height="15">Recibo:</td>
    <td colspan="2" class="Numerorec">${this.esc(numStr)}</td>
  </tr>
  <tr>
    <td width="86" class="Estilo8" height="15">Nombre:</td>
    <td colspan="2" class="Estilo8">${this.esc(nombres)}</td>
  </tr>
  <tr>
    <td class="Estilo8" height="15">Rubro:</td>
    <td colspan="2" class="Estilo8">${this.esc(concepto)}</td>
  </tr>
  <tr>
    <td class="Estilo8" height="15">RUC:</td>
    <td colspan="2" class="Estilo8"></td>
  </tr>
  <tr>
    <td height="23" colspan="2" class="Estilo8" style="border-top:1px #000 dotted; border-bottom:1px #000 dotted">Concepto de Pago</td>
    <td width="564" align="right" class="Estilo8" style="border-top:1px #000 dotted; border-bottom:1px #000 dotted">Importe de Pago</td>
  </tr>
  ${detalleRows}
  <tr>
    <td class="Estilo6" style="border-top:1px #000 dotted">&nbsp;</td>
    <td width="376" align="right" class="Estilo6" style="border-top:1px #000 dotted">Total Pago</td>
    <td class="Estilo4" style="border-top:1px #000 dotted" align="right">${this.money(monto)}</td>
  </tr>
  <tr>
    <td class="Estilo6">&nbsp;</td>
    <td width="376" align="right" class="Estilo6">Efectivo</td>
    <td class="Estilo3" align="right">${this.money(efectivo)}</td>
  </tr>
  <tr>
    <td class="Estilo6">&nbsp;</td>
    <td width="376" align="right" class="Estilo6">Vuelto</td>
    <td class="Estilo3" align="right">${this.money(vuelto)}</td>
  </tr>
  <tr>
    <td height="23" colspan="3" class="Estilo8" style="border-top:1px #000 dotted">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="3" class="Estilo6">El presente recibo tiene 90 dias de validez</td>
  </tr>
  <tr>
    <td colspan="3" class="Estilo8">${this.esc(fecPago)}</td>
  </tr>
  <tr>
    <td colspan="3" class="Estilo8" align="left">${this.esc(nombCajero)}</td>
  </tr>
</table>
</body>
</html>`;
  }

  private notFoundHtml(numIngr: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo no encontrado</title></head><body><p>No se encontro el recibo nro: <b>${this.esc(numIngr)}</b>.</p></body></html>`;
  }

}
