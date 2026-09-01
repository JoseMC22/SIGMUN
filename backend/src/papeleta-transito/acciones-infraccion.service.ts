import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../database/database.service';
import {
  NuevaInfraccionDto,
  GenerarGravamenDto,
  GenerarNoAdeudoDto,
  ImprimirRecordPendienteDto,
  FraccionarPapeletaDto,
  VerFraccionamientoDto,
  ImportarExcelDto,
  CargarDetalleInfraccionDto,
  BuscarResolucionSancionDto,
  GrabarResolucionSancionDto,
  BuscarCambioEstadoDto,
  GrabarCambioEstadoDto,
  GenerarLiquidacionDto,
  RecordPendienteData,
  RecordPendienteRow,
  FraccionamientoRow,
  ImportarResult,
  ConsultaPropietarioDto,
  ConsultaConductorDto,
  ConsultaPlacaDto,
  ConsultaPoliciaDto,
  ConsultaLugarDto,
  BuscarEnvioCoactivoDto,
  GrabarEnvioCoactivoDto,
  ConsultaInfraccionesDto,
  InfraccionMultaRow,
  PropietarioRow,
  ConductorRow,
  PlacaRow,
  PoliciaRow,
  LugarRow,
  SearchPagedResult,
  ReporteEstadoCuentaDto,
  ReporteCertificadoNoAdeudoDto,
  ReporteGravamenDto,
  ReporteResolucionSancionDto,
} from './dto/acciones-infraccion.dto';

@Injectable()
export class AccionesInfraccionService {
  private readonly logger = new Logger(AccionesInfraccionService.name);

  constructor(private readonly db: DatabaseService) { }

  /**
   * Registra una nueva infracción.
   * Legacy: Papeleta01Controller::grabarpapeletaAction
   * Step 1: papeleta.estado_papeleta @msquery=2 → obtener días de plazo
   * Step 2: papeleta.estado_papeleta @msquery=3 → calcular fecha vencimiento
   * Step 3: papeleta.ingreso_papeleta @msquery=1 (nuevo) o 2 (modificar)
   */
  /**
   * Normalizes any date input (ISO string, JS Date, DD/MM/YYYY, YYYY-MM-DD)
   * to an 8-character string YYYYMMDD for SQL Server datetime compatibility.
   */
  private formatYYYYMMDD(dateVal: unknown): string {
    if (!dateVal) return '';

    // Si viene como Date object desde mssql (ej. 2026-08-28 00:00:00 UTC), usar métodos UTC
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const y = dateVal.getUTCFullYear();
      const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getUTCDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }

    const str = String(dateVal).trim();
    if (!str) return '';

    // Extraer solo la parte de la fecha (YYYY-MM-DD o DD/MM/YYYY) descartando hora/UTC
    const cleanStr = str.split('T')[0].split(' ')[0].trim();

    const slashParts = cleanStr.split('/');
    if (slashParts.length === 3) {
      let [d, m, y] = slashParts;
      if (d.length === 4) [y, m, d] = [d, m, y];
      return `${y.trim()}${m.trim().padStart(2, '0')}${d.trim().padStart(2, '0')}`;
    }

    const dashParts = cleanStr.split('-');
    if (dashParts.length === 3) {
      let [y, m, d] = dashParts;
      if (y.length !== 4 && d.length === 4) [y, m, d] = [d, m, y];
      return `${y.trim()}${m.trim().padStart(2, '0')}${d.trim().padStart(2, '0')}`;
    }

    return cleanStr.replace(/\D/g, '').slice(0, 8);
  }

  private toSqlDate(dateVal: unknown): Date | null {
    const yyyymmdd = this.formatYYYYMMDD(dateVal);
    if (yyyymmdd.length === 8) {
      const y = parseInt(yyyymmdd.slice(0, 4), 10);
      const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
      const d = parseInt(yyyymmdd.slice(6, 8), 10);
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }
    return null;
  }

  private formatInputDate(dateVal: unknown): string {
    const yyyymmdd = this.formatYYYYMMDD(dateVal);
    if (yyyymmdd.length === 8) {
      return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
    }
    return '';
  }

  async nuevaInfraccion(dto: NuevaInfraccionDto, usuario?: string): Promise<{ success: boolean; message: string }> {
    try {
      const NumCorr = '01';
      const estado = '1';
      const query = dto.operacion === 0 ? 1 : 2;
      const fechaSql = this.toSqlDate(dto.fechaAplicacion);
      const userFinal = (usuario && usuario.trim() !== '') ? usuario.trim() : (dto.responsable || 'JMOZO');

      // Step 1: Obtener días de plazo
      const diasResult = await this.db.executeProcedure(
        'papeleta.estado_papeleta',
        { msquery: '2', fecapli: fechaSql },
      );
      const adquiDias = diasResult.recordset?.[0] ? Object.values(diasResult.recordset[0])[0] : 0;

      // Step 2: Calcular fecha vencimiento
      const fechaResult = await this.db.executeProcedure(
        'papeleta.estado_papeleta',
        { msquery: '3', fecapli: fechaSql, Adquidias: adquiDias },
      );
      const fecVenciRaw = fechaResult.recordset?.[0] ? Object.values(fechaResult.recordset[0])[0] : fechaSql;
      const fecVenciSql = this.toSqlDate(fecVenciRaw);

      // Step 3: Grabar infracción
      const placaClean = (dto.placa ?? '').trim().replace(/\s+/g, '');
      const numPapelRaw = (dto.numeroPapel ?? '').trim();
      const numPapelPadded = /^\d+$/.test(numPapelRaw) ? numPapelRaw.padStart(6, '0') : numPapelRaw;

      const params: Record<string, unknown> = {
        msquery: query,
        xcodplac: placaClean,
        xtxtseriepapel: (dto.seriePapel ?? '').trim(),
        xtxtnumeropapel: numPapelPadded,
        txttalopapel: (dto.taloPapel ?? '').trim(),
        xtxtoficio: (dto.oficio ?? '').trim(),
        xtxtfecapli: fechaSql,
        xtxthormin: (dto.horaMin ?? '').trim(),
        xtxtfecvenci: fecVenciSql,
        xtxtcodinfr: (dto.codigoInfraccion ?? '').trim(),
        xtxtimporte: dto.importe,
        xtxtdetalleinfra: (dto.detalleInfraccion ?? '').trim(),
        xtxtdosaje: (dto.dosaje ?? '').trim(),
        xtxtgrado: (dto.grado ?? '').trim(),
        xchkretener: dto.retener,
        xidlugar: (dto.idLugar ?? '').trim(),
        xtxtlugar: (dto.lugar ?? '').trim(),
        xtxtreferencia: (dto.referencia ?? '').trim(),
        xtxtcodigoprop: (dto.codigoPropietario ?? '').trim(),
        xchkpresento: dto.presento,
        xtnomprop: (dto.nombrePropietario ?? '').replace(/[\t\r\n]+/g, ' ').trim(),
        xtxttpro: (dto.tipoProp ?? '').trim(),
        xtxtdireccprop: (dto.direccionProp ?? '').trim(),
        xtxtcodigocond: (dto.codigoConductor ?? '').trim(),
        xtxtnomcond: (dto.nombreConductor ?? '').replace(/[\t\r\n]+/g, ' ').trim(),
        xtxtlcond: (dto.licenciaConductor ?? '').trim(),
        xtxtdirecccond: (dto.direccionConductor ?? '').trim(),
        xtxtidplaca: (dto.idPlaca ?? '').trim(),
        xtxtcipauto: (dto.cipAuto ?? '').trim(),
        xtxtdetalle: (dto.detalle ?? '').trim(),
        xnumcorr: NumCorr,
        xidusuario: userFinal,
        xestacion: 'NIMAGEN01',
        xfech_ingreso: (() => { const n = new Date(); return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`; })(),
        xestado: estado,
        txtnumeroinfraccion: (dto.papeleta ?? '').trim(),
        responsable: userFinal,
      };

      // Parámetros opcionales para M.40A/B/C
      if (
        dto.codigoInfraccion === 'M.40A' ||
        dto.codigoInfraccion === 'M.40B' ||
        dto.codigoInfraccion === 'M.40C'
      ) {
        params.xnroinfrac = dto.meses ?? '';
        params.xresolucion = dto.resolucion ?? '';
        params.xobservaresolucion = dto.observaResolucion ?? '';
        params.xfecharesolucion = dto.fechaResolucion ?? '';
      }

      const result = await this.db.executeProcedure('papeleta.ingreso_papeleta', params);
      const row = result.recordset?.[0];
      const vals = row ? Object.values(row) : [];
      const code = String(vals[0] ?? '');
      const mensaje = String(vals[1] ?? (vals[0] ? String(vals[0]) : 'Registrado'));

      if (code === 'XXX' || mensaje.includes('No tiene Acceso')) {
        this.logger.warn(`Infracción no grabada por SP: ${mensaje}`);
        return { success: false, message: mensaje };
      }

      this.logger.log(`Infracción grabada exitosamente: ${dto.placa} - ${dto.codigoInfraccion} por ${userFinal}`);
      return { success: true, message: mensaje };
    } catch (error) {
      this.logger.error('Error al grabar infracción:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al registrar la infracción.',
      };
    }
  }

  /**
   * Genera gravamen no registrado.
   * Legacy: Papeleta01Controller::generargravamenAction
   * SP: papeleta.sp_Imprime_Certificadogravamen (@buscar=1, @ninfrac, @numingr, @operador)
   */
  async generarGravamen(dto: GenerarGravamenDto): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_Certificadogravamen',
        {
          buscar: 1,
          ninfrac: parseInt(dto.ninfrac, 10),
          numingr: dto.numingr,
          operador: dto.operador,
        },
      );

      const data = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';

      this.logger.log(`Gravamen generado para infracción ${dto.ninfrac}, resultado: ${data}`);
      if (data.trim().toUpperCase() === 'TRUE') {
        return { success: true, data: 'TRUE', message: 'TRUE' };
      } else {
        return {
          success: false,
          data,
          message: 'El N° de Recibo ingresado no corresponde a un pago de Gravamen registrado en el sistema (tipo 25.01). Verifique el número de recibo.',
        };
      }
    } catch (error) {
      this.logger.error('Error al generar gravamen:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al generar el gravamen.',
      };
    }
  }

  /**
   * Genera certificado de no adeudo.
   * Legacy: Papeleta01Controller::generarnoadeudoAction
   * SP: papeleta.sp_Imprime_Certificadonoadeudo (@buscar=1, @ninfrac, @numingr, @operador)
   */
  async generarNoAdeudo(dto: GenerarNoAdeudoDto): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const ninfracInt = parseInt(dto.ninfrac, 10) || 0;
      const numingr = dto.numingr ?? '';
      const operador = dto.operador ?? '';

      // 1. Verificar si ya existe en papeleta.Certificadonoadeudopape
      const existeRes = await this.db.query(
        `SELECT COUNT(codigo) AS cant FROM papeleta.Certificadonoadeudopape (NOLOCK) WHERE IDRECIBO = @numingr`,
        { numingr },
      );
      const cant = (existeRes.recordset?.[0] as any)?.cant ?? 0;

      if (cant > 0) {
        return { success: true, data: 'TRUE', message: 'Certificado ya registrado.' };
      }

      // 2. Obtener correlativo max cert_nro
      const maxRes = await this.db.query(
        `SELECT RIGHT('000000' + CONVERT(VARCHAR(6), ISNULL(MAX(CONVERT(INT, cert_nro)), 0) + 1), 6) AS contador FROM papeleta.Certificadonoadeudopape (NOLOCK)`,
      );
      const contador = (maxRes.recordset?.[0] as any)?.contador || '000001';

      // 3. Insertar
      await this.db.query(
        `INSERT INTO papeleta.Certificadonoadeudopape(IDRECIBO, CODIGO, CERT_NRO, CERT_ANIO, FEC_IMPRESION, ESTADO, USU_REG, FEC_REG, ESTACION_REG)
         SELECT @numingr, codigocond, @contador, YEAR(GETDATE()), GETDATE(), 1, @operador, GETDATE(), @operador
         FROM papeleta.tramctas (NOLOCK)
         WHERE indice = @ninfrac`,
        { numingr, contador, operador, ninfrac: ninfracInt },
      );

      this.logger.log(`Certificado no adeudo registrado para infracción ${dto.ninfrac} (cert_nro: ${contador})`);
      return { success: true, data: 'TRUE', message: 'Certificado registrado exitosamente.' };
    } catch (error) {
      this.logger.error('Error al generar certificado de no adeudo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al generar certificado de no adeudo.',
      };
    }
  }

  /**
   * Consulta gravamen sin placa registrada (botón del toolbar).
   * Legacy: Papeleta01Controller::consultargravamensinplacaAction
   * SP: papeleta.sp_Imprime_Certificadogravamensinplaca (@buscar=3, @codplaca)
   */
  async gravamenSinPlaca(codplaca: string): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_Certificadogravamensinplaca',
        {
          buscar: 3,
          codplaca,
        },
      );

      const data = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';

      this.logger.log(`Gravamen sin placa consultado para placa: ${codplaca}`);
      return { success: true, data, message: data || 'Gravamen sin placa generado exitosamente.' };
    } catch (error) {
      this.logger.error('Error al generar gravamen sin placa:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al generar el gravamen sin placa.',
      };
    }
  }

  /**
   * Genera el registro de gravamen sin placa (botón Imprimir/+Gravamen del modal).
   * Legacy: Papeleta01Controller::generargravamensinplacaAction
   * SP: papeleta.sp_Imprime_Certificadogravamensinplaca (@buscar=1, @codplaca, @numingr, @operador)
   */
  async generarGravamenSinPlaca(dto: { codplaca: string; numingr: string; operador: string }): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_Certificadogravamensinplaca',
        {
          buscar: 1,
          codplaca: dto.codplaca,
          numingr: dto.numingr,
          operador: dto.operador,
        },
      );

      const resText = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';

      if (resText.trim() === 'TRUE') {
        return { success: true, data: resText, message: 'TRUE' };
      } else {
        return { success: false, message: resText || 'Error al validar recibo o generar gravamen.' };
      }
    } catch (error) {
      this.logger.error('Error al generar gravamen sin placa (buscar=1):', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar la solicitud.',
      };
    }
  }

  /**
   * Obtiene datos del record pendiente para impresión.
   * Legacy: Papeleta01Controller::reportedepapeletaAction
   * SP: papeleta.sp_Imprime_EstCta_record (@buscar=0, @placa, @conductor, @dni, @estado)
   */
  async imprimirRecordPendiente(
    dto: ImprimirRecordPendienteDto,
  ): Promise<{ success: boolean; data?: RecordPendienteData; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_EstCta_record',
        {
          buscar: 0,
          placa: dto.placa,
          conductor: dto.conductor,
          dni: dto.dni,
          estado: dto.estado,
        },
      );

      const rows = result.recordset;
      if (!rows || rows.length === 0) {
        return { success: false, message: 'No se encontró record pendiente para esta infracción.' };
      }

      let totalDescuento = 0;
      let importeTotal = 0;

      const dataRows: RecordPendienteRow[] = rows.map((row: any) => {
        const papeleta = String(row.numnpap ?? row.num_docu ?? row.papeleta ?? row[0] ?? '').trim();
        const placa = String(row.cod_pred ?? row.placa ?? row[1] ?? '').trim();
        const infraccion = String(row.codinfr ?? row.infraccion ?? row[2] ?? '').trim();
        const fecha = String(row.fecapli ?? row.fecha ?? row[3] ?? '').trim();
        const infractor = String(row.nomcond ?? row.infractor ?? row[11] ?? '').trim();
        const propietario = String(row.nompropie ?? row.propietario ?? row[5] ?? '').trim();
        const codigo = String(row.codigocond ?? row.codigo ?? row[17] ?? '').trim();

        const valor = Number(row.imp_insol ?? row.valor ?? row[6] ?? 0);
        const descuento = Number(row.dscto ?? row.descuento ?? row[15] ?? 0);
        // imp_reaj en el SP equivale a la Deuda final con Descuento aplicado (18.70)
        const total = Number(row.imp_reaj ?? row.total ?? row[8] ?? (valor - descuento));

        totalDescuento += descuento;
        importeTotal += total;

        return {
          papeleta,
          placa,
          infraccion,
          fecha,
          infractor,
          propietario,
          valor,
          descuento,
          total,
          codigo,
        };
      });

      const data: RecordPendienteData = {
        rows: dataRows,
        totalDescuento,
        totalCostas: 0,
        importeTotal,
      };

      this.logger.log(`Record pendiente obtenido para placa ${dto.placa}`);
      return { success: true, data, message: 'Record pendiente obtenido.' };
    } catch (error) {
      this.logger.error('Error al obtener record pendiente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener el record pendiente.',
      };
    }
  }

  /**
   * Fracciona una papeleta en cuotas.
   * Legacy flow:
   *   1. [Rentas].[CondicionConvenio] @busc=1, @codigo, @param → verificar condiciones
   *   2. Rentas.CuotasConvenio → calcular cuotas
   *   3. Rentas.GeneraConveniopape → grabar convenio
   */
  async fraccionarPapeleta(
    dto: FraccionarPapeletaDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Construir XML <row ... /> tal como en FraccionarpapeController.php generaconvenioAction
      let dxml = '';
      if (dto.varxml) {
        try {
          const rowsData = JSON.parse(dto.varxml);
          if (Array.isArray(rowsData)) {
            for (const item of rowsData) {
              dxml += '<row ';
              for (const [k, v] of Object.entries(item)) {
                dxml += `${k}="${v}" `;
              }
              dxml += '/>';
            }
          } else {
            dxml = dto.varxml;
          }
        } catch {
          dxml = dto.varxml;
        }
      }

      const result = await this.db.executeProcedure(
        'Rentas.GeneraConveniopape',
        {
          codigo: dto.codigo,
          cuotas: dto.cuotas,
          operador: dto.codResp ?? 'ADMIN',
          estacion: 'ESTACION',
          total_deuda: dto.totalDeuda,
          total_inici: dto.totalInicial,
          fec_gen: dto.fechaGeneracion,
          fec_cuo: dto.fechaCuota,
          condicion_id: dto.condicionId ?? 0,
          varxml: dxml,
          CodResp: dto.codResp ?? dto.codigo,
          TipoDeuda: dto.tipoDeuda ?? 'PIT',
          CodPropVeh: dto.codPropVeh ?? '',
        },
      );

      const resultado = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';
      const success = resultado.toUpperCase().includes('CORRECTO') || (resultado.length > 0 && !resultado.toLowerCase().includes('error'));

      this.logger.log(`Fraccionamiento grabado: código ${dto.codigo}, ${dto.cuotas} cuotas -> ${resultado}`);
      return {
        success,
        message: success ? `Fraccionamiento registrado: ${resultado}` : resultado || 'Error al fraccionar.',
      };
    } catch (error) {
      this.logger.error('Error al fraccionar papeleta:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al fraccionar la papeleta.',
      };
    }
  }

  /**
   * Calcula cuotas de fraccionamiento.
   * SP: Rentas.CuotasConvenio
   */
  async calcularCuotas(
    cuotas: number,
    totalDeuda: number,
    totalInicial: number,
    fecGen: string,
    fecCuo: string,
  ): Promise<{ success: boolean; data?: FraccionamientoRow[]; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.CuotasConvenio',
        {
          cuotas,
          total_deuda: totalDeuda,
          total_inici: totalInicial,
          fec_gen: fecGen,
          fec_cuo: fecCuo,
        },
      );

      const rows: FraccionamientoRow[] = (result.recordset ?? []).map((row: any) => {
        const isArr = Array.isArray(row);
        const getVal = (idx: number, key: string) => {
          if (isArr) return row[idx];
          if (row[key] !== undefined) return row[key];
          const keys = Object.keys(row);
          if (keys[idx] !== undefined) return row[keys[idx]];
          return '';
        };

        return {
          cuota: String(getVal(0, 'cuota') ?? ''),
          anno: String(getVal(1, 'anno') ?? ''),
          totalDeuda: String(getVal(2, 'total_deuda') ?? ''),
          cuotaIni: String(getVal(3, 'cuota_ini') ?? ''),
          saldoDeuda: String(getVal(4, 'saldo_deuda') ?? ''),
          montoCuota: String(getVal(5, 'monto_cuota') ?? ''),
          intereses: String(getVal(6, 'intereses') ?? ''),
          cuotaTotal: String(getVal(7, 'cuota_total') ?? ''),
          totalFrac: String(getVal(8, 'total_frac') ?? ''),
          cuotas: String(getVal(9, 'cuotas') ?? ''),
          fecGen: String(getVal(10, 'fec_gen') ?? ''),
        };
      });

      return { success: true, data: rows, message: 'Cuotas calculadas.' };
    } catch (error) {
      this.logger.error('Error al calcular cuotas:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al calcular cuotas.',
      };
    }
  }

  /**
   * Verifica condiciones de fraccionamiento para un contribuyente.
   * SP: [Rentas].[CondicionConvenio] @busc=1, @codigo, @param
   */
  async verificarCondicionFraccionamiento(
    codigo: string,
    param: string,
  ): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        '[Rentas].[CondicionConvenio]',
        { busc: 1, codigo, param },
      );

      const data = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';
      return { success: true, data, message: 'Condición verificada.' };
    } catch (error) {
      this.logger.error('Error al verificar condición fraccionamiento:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al verificar condición.',
      };
    }
  }

  /**
   * Obtiene la lista de fraccionamientos de un contribuyente.
   * Legacy: FraccionarController::consultafraccAction
   * SP: [Rentas].[ImprimeConvenio] (@buscar=4, @codigo)
   */
  async verFraccionamiento(
    dto: VerFraccionamientoDto,
  ): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      // 1. Obtener datos del contribuyente
      const contriRes = await this.db.executeProcedure(
        'Rentas.sp_rentasmain',
        { buscar: 3, codigo: dto.codigo },
      );
      const contriRow = contriRes.recordset?.[0];
      const nombre = contriRow ? String(Object.values(contriRow)[1] ?? '') : '';

      // 2. Obtener historial de fraccionamientos del contribuyente
      const result = await this.db.executeProcedure(
        '[Rentas].[ImprimeConvenio]',
        { buscar: 4, codigo: dto.codigo },
      );

      const rows = (result.recordset ?? []).map((row: any) => {
        const isArr = Array.isArray(row);
        const getVal = (idx: number, key: string) => {
          if (isArr) return row[idx];
          if (row[key] !== undefined) return row[key];
          const keys = Object.keys(row);
          if (keys[idx] !== undefined) return row[keys[idx]];
          return '';
        };

        return {
          convenio: String(getVal(5, 'convenio') ?? ''),
          anio: String(getVal(4, 'anno') ?? ''),
          cuotas: Number(getVal(11, 'cuotas')) || 0,
          monto: Number(getVal(7, 'monto')) || 0,
          estado: String(getVal(16, 'estado') ?? ''),
          usuario: String(getVal(19, 'usuario') ?? ''),
          fecha: String(getVal(21, 'fecha') ?? ''),
        };
      });

      this.logger.log(`Fraccionamientos consultados para código ${dto.codigo}: ${rows.length} encontrado(s)`);
      return {
        success: true,
        data: {
          codigo: dto.codigo,
          nombre,
          rows,
        },
        message: 'Fraccionamientos obtenidos.',
      };
    } catch (error) {
      this.logger.error('Error al obtener fraccionamiento:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener el fraccionamiento.',
      };
    }
  }

  /**
   * Obtiene los datos del convenio para la ventana "Detalle de Fraccionamiento" (Resolución/Anulación)
   * Legacy: FraccionarController::resolfraccAction (@buscar=5) y resolcuotasAction (@buscar=6)
   */
  async resolucionFraccionamiento(
    codigo: string,
    convenio: string,
  ): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      // 1. Datos generales de la resolución/convenio (@buscar=5)
      const resGeneral = await this.db.executeProcedure('[Rentas].[ImprimeConvenio]', {
        buscar: 5,
        codigo,
        convenio,
      });

      const rowG = resGeneral.recordset?.[0] ?? {};
      const getValG = (idx: number, key: string) => {
        if (Array.isArray(rowG)) return rowG[idx];
        if (rowG[key] !== undefined) return rowG[key];
        const keys = Object.keys(rowG);
        if (keys[idx] !== undefined) return rowG[keys[idx]];
        return '';
      };

      const montoTotalFracc = Number(getValG(3, 'txtFracc')) || Number(getValG(3, 'total_fracc')) || Number(Object.values(rowG)[3]) || 0;
      const cuotaInicial = Number(getValG(7, 'txtInicial')) || Number(getValG(7, 'cuota_ini')) || Number(Object.values(rowG)[7]) || 0;
      const numCuotas = Number(getValG(6, 'txtNumero')) || Number(getValG(6, 'num_cuotas')) || Number(Object.values(rowG)[6]) || 0;
      const estadoConvenioDesc = String(getValG(9, 'lblEstadoConvenio')) || String(getValG(9, 'estado_desc')) || String(Object.values(rowG)[9] ?? 'En Solicitud');
      const estadoConvenioCode = String(getValG(14, 'hdEstadoConvenio')) || String(Object.values(rowG)[14] ?? '1');
      const nroRecibo = String(getValG(13, 'hdNroRecibo')) || String(Object.values(rowG)[13] ?? '');
      const fechaConvenio = String(getValG(12, 'txtFecha')) || String(getValG(12, 'fec_gen')) || String(Object.values(rowG)[12] ?? new Date().toLocaleDateString('es-PE'));

      const porcentajeInicial = montoTotalFracc > 0 ? (cuotaInicial * 100) / montoTotalFracc : 30;
      const saldo = montoTotalFracc - cuotaInicial;

      // 2. Detalle de cuotas (@buscar=6)
      const resCuotas = await this.db.executeProcedure('[Rentas].[ImprimeConvenio]', {
        buscar: 6,
        codigo,
        convenio,
      });

      const cuotas = (resCuotas.recordset ?? []).map((row: any) => {
        const isArr = Array.isArray(row);
        const getVal = (idx: number, key: string) => {
          if (isArr) return row[idx];
          if (row[key] !== undefined) return row[key];
          const keys = Object.keys(row);
          if (keys[idx] !== undefined) return row[keys[idx]];
          return '';
        };

        const impInsol = Number(getVal(1, 'imp_insol')) || 0;
        const reaj = Number(getVal(2, 'reaj')) || 0;

        return {
          periodo: String(getVal(0, 'periodo') ?? ''),
          impInsol,
          reaj,
          fechaVencimiento: String(getVal(3, 'fecha_v') ?? ''),
          nroRecibo: String(getVal(4, 'nro_recibo') ?? ''),
          total: impInsol + reaj,
        };
      });

      return {
        success: true,
        data: {
          codigo,
          convenio,
          fechaConvenio,
          montoTotalFracc,
          cuotaInicial,
          porcentajeInicial,
          saldo,
          numCuotas,
          estadoConvenio: estadoConvenioDesc,
          estadoConvenioCode,
          nroRecibo,
          cuotas,
        },
        message: 'Detalle de resolución obtenido.',
      };
    } catch (error) {
      this.logger.error('Error al obtener resolución de fraccionamiento:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener resolución.',
      };
    }
  }

  /**
   * Retorna los registros ya cargados en la tabla temporal de importación.
   * Legacy: Papeleta01Controller::gridxlsAction
   * SP: papeleta.sp_importarxls @buscar=2
   */
  async gridImportarExcel(): Promise<{ success: boolean; data?: Record<string, unknown>[]; message: string }> {
    try {
      const result = await this.db.executeProcedure('papeleta.sp_importarxls', { buscar: 2 });
      const rows: Record<string, unknown>[] = (result.recordset ?? []) as Record<string, unknown>[];
      return { success: true, data: rows, message: `${rows.length} registro(s) encontrado(s).` };
    } catch (error) {
      this.logger.error('Error al obtener grid importación Excel:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener registros de importación.',
      };
    }
  }

  /**
   * Importa registros desde archivo de texto (CSV) a la BD.
   * Legacy: Papeleta01Controller::xlsgrabarAction
   * SP: papeleta.sp_importarxls
   *   @buscar=1: init (registrar archivo)
   *   @buscar=3: insertar cada fila
   */
  async importarExcel(dto: ImportarExcelDto): Promise<{ success: boolean; data?: ImportarResult; message: string }> {
    const resultados: ImportarResult = {
      exitosos: 0,
      fallidos: 0,
      mensajes: [],
    };

    try {
      // Step 1: Inicializar importación (@buscar=1)
      const initResult = await this.db.executeProcedure(
        'papeleta.sp_importarxls',
        {
          buscar: 1,
          xls_original: 'importacion_api.txt',
          xls_type: 'text/plain',
          estado: 1,
          operador: 'API',
          estacion: 'SIGMUN-API',
        },
      );
      const nombreArchivo = initResult.recordset?.[0] ? String(Object.values(initResult.recordset[0])[1] ?? '') : '';

      // Step 2: Insertar cada fila (@buscar=3)
      for (const [idx, reg] of dto.registros.entries()) {
        try {
          await this.db.executeProcedure(
            'papeleta.sp_importarxls',
            {
              buscar: 3,
              id: reg.id ?? '',
              licencia: reg.licencia ?? '',
              conductor: reg.conductor ?? '',
              doc: reg.doc ?? '',
              domicilio: reg.domicilio ?? '',
              fecha: reg.fecha ?? '',
              papeleta: reg.papeleta ?? '',
              infracc: (reg.infracc ?? '').replace('-', '.'),
              placa: (reg.placa ?? '').replace('-', ''),
              marca: reg.marca ?? '',
              oficio: reg.oficio ?? '',
              estado: 1,
              operador: 'API',
              estacion: 'SIGMUN-API',
            },
          );
          resultados.exitosos++;
        } catch (err) {
          resultados.fallidos++;
          resultados.mensajes.push(
            `Fila ${idx + 1}: ${err instanceof Error ? err.message : 'Error desconocido'}`,
          );
        }
      }

      this.logger.log(
        `Importación completada: ${resultados.exitosos}/${dto.registros.length} insertados`,
      );

      return {
        success: true,
        data: resultados,
        message: `Importación completada: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos.`,
      };
    } catch (error) {
      this.logger.error('Error general en importación Excel:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error durante la importación.',
      };
    }
  }

  /**
   * Carga el detalle completo de una infracción (solo lectura o editable).
   * Legacy: Papeleta01Controller::detpapeletaAction / ingpapeletaAction
   * SP: papeleta.consulta_infrac (@msquery=1, @infra)
   */
  async cargarDetalleInfraccion(
    dto: CargarDetalleInfraccionDto,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.consulta_infrac',
        { msquery: '1', infra: dto.ninfrac },
      );

      const row = result.recordset?.[0];
      if (!row) {
        return { success: false, message: 'No se encontró la infracción.' };
      }

      // Map positional columns from SP result to named fields
      const vals = Object.values(row);
      const data: Record<string, unknown> = {
        id: String(dto.ninfrac).trim(),
        numeroInfraccion: String(dto.ninfrac).trim(),
        seriePapel: String(vals[0] ?? ''),
        numeroPapel: String(vals[1] ?? ''),
        oficio: String(vals[2] ?? ''),
        fechaAplicacion: this.formatInputDate(vals[3]),
        hora: String(vals[4] ?? '').split(':')[0] ?? '',
        minuto: String(vals[4] ?? '').split(':')[1] ?? '',
        codigoInfraccion: String(vals[5] ?? ''),
        importe: vals[6],
        detalleInfraccion: String(vals[7] ?? ''),
        dosaje: String(vals[8] ?? ''),
        grado: String(vals[9] ?? ''),
        retener: vals[10],
        idLugar: String(vals[11] ?? ''),
        lugar: String(vals[12] ?? ''),
        referencia: String(vals[13] ?? ''),
        codigoPropietario: String(vals[14] ?? ''),
        presento: vals[15],
        nombrePropietario: String(vals[16] ?? ''),
        rucPropietario: String(vals[17] ?? ''),
        direccionPropietario: String(vals[18] ?? ''),
        tipoPropiedad: String(vals[19] ?? ''),
        codigoConductor: String(vals[20] ?? ''),
        nombreConductor: String(vals[21] ?? ''),
        rucConductor: String(vals[22] ?? ''),
        licenciaConductor: String(vals[23] ?? ''),
        direccionConductor: String(vals[24] ?? ''),
        idPlaca: String(vals[25] ?? ''),
        numeroPlaca: String(vals[26] ?? ''),
        tipoVehiculo: String(vals[27] ?? ''),
        anioVehiculo: String(vals[28] ?? ''),
        marcaVehiculo: String(vals[29] ?? ''),
        colorVehiculo: String(vals[30] ?? ''),
        placaSecundaria: String(vals[31] ?? ''),
        cipAuto: String(vals[32] ?? ''),
        detalle: String(vals[33] ?? ''),
        usuario: String(vals[34] ?? ''),
        estacion: String(vals[35] ?? ''),
        fechaIngreso: this.formatInputDate(vals[36]),
        fechaVencimiento: this.formatInputDate(vals[37]),
        taloPapel: String(vals[38] ?? ''),
        responsable: String(vals[39] ?? ''),
        estadoAnterior: String(vals[40] ?? ''),
      };

      this.logger.log(`Detalle de infracción cargado: ${dto.ninfrac}`);
      return { success: true, data, message: 'Detalle cargado.' };
    } catch (error) {
      this.logger.error('Error al cargar detalle de infracción:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al cargar el detalle.',
      };
    }
  }

  /**
   * Busca datos para la Resolución de Sanción (notificar).
   * Legacy: Papeleta01Controller::papeletanotificarAction
   * SP: papeleta.ingreso_papeleta (@msquery=5)
   */
  async buscarResolucionSancion(
    dto: BuscarResolucionSancionDto,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.ingreso_papeleta',
        { msquery: '5', txtnumeroinfraccion: dto.ninfrac },
      );

      const row = result.recordset?.[0];
      if (!row) {
        return { success: false, message: 'No se encontraron datos para la Resolución de Sanción.' };
      }

      const vals = Object.values(row);
      const data: Record<string, unknown> = {
        seriePapel: String(vals[1] ?? ''),
        taloPapel: String(vals[2] ?? ''),
        numeroPapel: String(vals[3] ?? ''),
        oficio: String(vals[4] ?? ''),
        fechaPapeleta: String(vals[5] ?? ''),
        codigoInfraccion: String(vals[6] ?? ''),
        fechaNotificacion: String(vals[7] ?? ''),
        resolucion: String(vals[8] ?? ''),
        observaciones: String(vals[9] ?? ''),
      };

      this.logger.log(`Resolución de Sanción buscada: ${dto.ninfrac}`);
      return { success: true, data, message: 'Datos cargados.' };
    } catch (error) {
      this.logger.error('Error al buscar resolución de sanción:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al buscar resolución.',
      };
    }
  }

  /**
   * Graba la notificación de Resolución de Sanción.
   * Legacy: Papeleta01Controller::notificarpapeletaAction
   * SP: papeleta.ingreso_papeleta (@msquery=6)
   */
  async grabarResolucionSancion(
    dto: GrabarResolucionSancionDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.ingreso_papeleta',
        {
          msquery: '6',
          txtnumeroinfraccion: dto.ninfrac,
          numeronot: dto.numero,
          fechanoti: dto.fecha,
          obsnoti: dto.obs.toUpperCase(),
        },
      );

      const row = result.recordset?.[0];
      const mensaje = row ? String(Object.values(row)[1] ?? 'Registrado') : 'Registrado';

      this.logger.log(`Resolución de Sanción grabada: ${dto.ninfrac}`);
      return { success: true, message: mensaje };
    } catch (error) {
      this.logger.error('Error al grabar resolución de sanción:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al grabar la resolución.',
      };
    }
  }

  /**
   * Lista los estados disponibles para cambio de estado.
   * Legacy: Papeleta01Controller::papeletaestadosAction (@msquery=7)
   * SP: papeleta.ingreso_papeleta (@msquery=7)
   */
  async listarEstados(): Promise<{ success: boolean; data?: Array<{ id: string; nombre: string }>; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.ingreso_papeleta',
        { msquery: '7' },
      );

      const rows = result.recordset ?? [];
      const data = rows.map((row: any) => {
        const vals = Object.values(row);
        return {
          id: String(vals[0] ?? ''),
          nombre: String(vals[1] ?? ''),
        };
      });

      return { success: true, data, message: 'Estados cargados.' };
    } catch (error) {
      this.logger.error('Error al listar estados:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al listar estados.',
      };
    }
  }

  /**
   * Busca datos actuales de cambio de estado de una infracción.
   * Legacy: Papeleta01Controller::papeletaestadosAction (@msquery=9)
   * SP: papeleta.ingreso_papeleta (@msquery=9)
   */
  async buscarCambioEstado(
    dto: BuscarCambioEstadoDto,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; message: string }> {
    try {
      // La llamada al SP (msquery=9) devuelve columnas sin alias en posiciones 7, 8 y 9,
      // lo que hace que el driver mssql las colisione bajo la clave "" y se pierdan.
      // Se ejecuta la misma query del bloque mostrarcambios con alias explícitos.
      const result = await this.db.query<any>(
        `SELECT TOP 1
          t.indice           AS indice,
          t.numapap          AS numapap,
          t.talonario        AS talonario,
          t.numnpap          AS numnpap,
          t.numcorr          AS numcorr,
          CONVERT(VARCHAR(10), t.fecapli, 103) AS fecapli,
          t.codinfr          AS codinfr,
          CASE WHEN CONVERT(VARCHAR(10), ISNULL(n.fecha, CONVERT(DATETIME,'01/01/1900')), 103) = '01/01/1900'
               THEN '' ELSE CONVERT(VARCHAR(10), ISNULL(n.fecha, CONVERT(DATETIME,'01/01/1900')), 103)
          END                AS fechanot,
          ISNULL(n.numero,'') AS numero,
          ISNULL(n.obs,'')    AS obs,
          n.idestado         AS idestado,
          n.usuario          AS usuario,
          n.ws               AS ws,
          ISNULL(CONVERT(VARCHAR(10), n.fechaingr, 103) + ' ' + CONVERT(VARCHAR(8), n.fechaingr, 108), '') AS fechaingr
        FROM papeleta.tramctas t
        LEFT OUTER JOIN papeleta.notificacion n
          ON t.Indice = n.indice AND n.estado = '1'
        WHERE t.Indice = @txtnumeroinfraccion
        ORDER BY n.id DESC`,
        { txtnumeroinfraccion: dto.ninfrac },
      );

      const row = result.recordset?.[0];
      if (!row) {
        return { success: false, message: 'No se encontraron datos de estado.' };
      }

      const r = row as Record<string, any>;

      const fechaModiFormateada = String(r.fechaingr ?? '');

      const data: Record<string, unknown> = {
        seriePapel: String(r.numapap ?? ''),
        taloPapel: String(r.talonario ?? ''),
        numeroPapel: String(r.numnpap ?? ''),
        oficio: String(r.numcorr ?? ''),
        fechaPapeleta: String(r.fecapli ?? ''),
        codigoInfraccion: String(r.codinfr ?? ''),
        fechaNotificacion: this.formatInputDate(r.fechanot),
        resolucion: String(r.numero ?? ''),
        observaciones: String(r.obs ?? ''),
        estadoActual: String(r.idestado ?? ''),
        idEstado: String(r.idestado ?? ''),
        usuario: String(r.usuario ?? ''),
        estacion: String(r.ws ?? ''),
        fechaModificacion: fechaModiFormateada,
      };

      this.logger.log(`Cambio de estado buscado: ${dto.ninfrac}`);
      return { success: true, data, message: 'Datos de estado cargados.' };
    } catch (error) {
      this.logger.error('Error al buscar cambio de estado:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al buscar estado.',
      };
    }
  }

  /**
   * Graba el cambio de estado de una infracción.
   * Legacy: Papeleta01Controller::estadoscambiopapeletaAction
   * SP: papeleta.ingreso_papeleta (@msquery=8)
   */
  async grabarCambioEstado(
    dto: GrabarCambioEstadoDto,
    usuario?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userFinal = usuario && usuario.trim() !== '' ? usuario.trim() : 'SISTEMAS';
      const estacion = process.env.COMPUTERNAME || process.env.HOSTNAME || 'SERVER';

      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const fechIngresoStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      let fechanotiStr = '01/01/1900';
      if (dto.fecha && dto.fecha.trim() !== '') {
        const parts = dto.fecha.split('-');
        if (parts.length === 3) {
          fechanotiStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          fechanotiStr = dto.fecha;
        }
      }

      const numInfracInt = parseInt(dto.ninfrac, 10);
      const numeronot = dto.numero ?? '';
      const obsnoti = (dto.obs ?? '').toUpperCase();
      const tipoestado = dto.tipoestado;

      // 1. UPDATE papeleta.tramctas
      await this.db.query(
        `UPDATE papeleta.tramctas
         SET estado = @tipoestado,
             fecha_modifica = GETDATE(),
             usuario_modifica = @xidusuario,
             ws_modifica = @xestacion
         WHERE indice = @txtnumeroinfraccion`,
        { tipoestado, xidusuario: userFinal, xestacion: estacion, txtnumeroinfraccion: numInfracInt },
      );

      // 2. INSERT INTO papeleta.notificacion
      await this.db.query(
        `INSERT INTO papeleta.notificacion(indice, numero, fecha, obs, usuario, ws, fechaingr, idestado)
         VALUES (@txtnumeroinfraccion, @numeronot, CONVERT(DATETIME, @fechanoti, 103), @obsnoti, @xidusuario, @xestacion, CONVERT(DATETIME, @fech_ingreso, 103), @tipoestado)`,
        {
          txtnumeroinfraccion: numInfracInt,
          numeronot,
          fechanoti: fechanotiStr,
          obsnoti,
          xidusuario: userFinal,
          xestacion: estacion,
          fech_ingreso: fechIngresoStr,
          tipoestado,
        },
      );

      // 3. UPDATES segun tipoestado
      if (tipoestado === '29') {
        await this.db.query(
          `UPDATE caja.mrecibos
           SET tipo = '10.86', tipo_rec = '11.16'
           FROM caja.mrecibos m
           INNER JOIN papeleta.tramctas t ON m.num_docu = LTRIM(RTRIM(t.numapap)) + '-' + LTRIM(RTRIM(t.talonario)) + '-' + LTRIM(RTRIM(t.numnpap))
           WHERE m.tipo_rec IN ('10.86', '25.30') AND t.indice = @txtnumeroinfraccion AND m.estado <> '1'`,
          { txtnumeroinfraccion: numInfracInt },
        );
      } else if (tipoestado === '11') {
        await this.db.query(
          `UPDATE caja.mrecibos
           SET estado = '2'
           FROM caja.mrecibos m
           INNER JOIN papeleta.tramctas t ON m.num_docu = LTRIM(RTRIM(t.numapap)) + '-' + LTRIM(RTRIM(t.talonario)) + '-' + LTRIM(RTRIM(t.numnpap))
           WHERE m.tipo_rec IN ('10.86', '25.30') AND t.indice = @txtnumeroinfraccion AND m.estado <> '1'`,
          { txtnumeroinfraccion: numInfracInt },
        );
      } else if (tipoestado === '8' || tipoestado === '28') {
        await this.db.query(
          `UPDATE caja.mrecibos
           SET estado = '2', observacion = @numeronot
           FROM caja.mrecibos m
           INNER JOIN papeleta.tramctas t ON m.num_docu = LTRIM(RTRIM(t.numapap)) + '-' + LTRIM(RTRIM(t.talonario)) + '-' + LTRIM(RTRIM(t.numnpap))
           WHERE m.tipo_rec IN ('10.86', '25.30') AND t.indice = @txtnumeroinfraccion AND m.estado <> '1'`,
          { numeronot, txtnumeroinfraccion: numInfracInt },
        );
      } else if (tipoestado === '2') {
        await this.db.query(
          `UPDATE caja.mrecibos
           SET estado = '17', observacion = @numeronot
           FROM caja.mrecibos m
           INNER JOIN papeleta.tramctas t ON m.num_docu = LTRIM(RTRIM(t.numapap)) + '-' + LTRIM(RTRIM(t.talonario)) + '-' + LTRIM(RTRIM(t.numnpap))
           WHERE m.tipo_rec IN ('10.86', '25.30') AND t.indice = @txtnumeroinfraccion AND m.estado <> '1'`,
          { numeronot, txtnumeroinfraccion: numInfracInt },
        );
      }

      this.logger.log(`Cambio de estado grabado: ${dto.ninfrac}`);
      return { success: true, message: 'Estado cambiado exitosamente' };
    } catch (error) {
      this.logger.error('Error al grabar cambio de estado:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al cambiar estado.',
      };
    }
  }

  /**
   * Genera una liquidación para impresión de Estado de Cuenta.
   * Legacy: Papeletatransito01Controller::rptliquidacionAction
   * Step 1: [Caja].[sp_Imprime_EstCta_pape] (@buscar=2) - prepara datos
   * Step 2: [Caja].[pa_liquidacion] (@msquery=1) - cabecera
   * Step 3: [Caja].[pa_liquidacion] (@msquery=2) - detalle (por cada fila)
   */
  async generarLiquidacion(
    dto: GenerarLiquidacionDto,
  ): Promise<{ success: boolean; nliqui?: string; message: string }> {
    try {
      // Step 1: Get data from report SP
      // Must match EXACTLY the SP signature — all 14 params with correct types
      let infracLimpia = (dto.infraccion ?? '').replace(/\s+/g, '');
      const parts = infracLimpia.split('-');
      if (parts.length === 3 && /^\d+$/.test(parts[2])) {
        infracLimpia = `${parts[0]}-${parts[1]}-${parts[2].padStart(6, '0')}`;
      }
      const spParams = {
        buscar: 2,
        codigo: dto.codigo,
        resumen: 1,
        detalle: 0,
        agrupar: 0,
        annos: '',
        tipos: '*10.86*,*25.30*,*30.98*,*46.34*',
        tiporec: '',
        perio: '',
        predio: '',
        estado: '0',
        criterio: 0,
        vehiculo: '',
        fracciona: `*${infracLimpia}*`,
      };
      const spTypes = {
        buscar: mssql.Int,
        codigo: mssql.VarChar(20),
        resumen: mssql.Int,
        detalle: mssql.Int,
        agrupar: mssql.Int,
        annos: mssql.NVarChar(2000),
        tipos: mssql.NVarChar(2000),
        tiporec: mssql.NVarChar(2000),
        perio: mssql.NVarChar(2000),
        predio: mssql.NVarChar(2000),
        estado: mssql.VarChar(1),
        criterio: mssql.Int,
        vehiculo: mssql.NVarChar(2000),
        fracciona: mssql.NVarChar(2000),
      };

      this.logger.log(
        `[liquidacion] Calling sp_Imprime_EstCta_pape | codigo=${dto.codigo} infraccion=${dto.infraccion} usuario=${dto.usuario}`,
      );
      const dataResult = await this.db.executeProcedure(
        '[Caja].[sp_Imprime_EstCta_pape]',
        spParams,
        spTypes,
      );

      const rows = dataResult.recordset ?? [];
      const allResultSets = dataResult.recordsets ?? [];
      this.logger.log(
        `[liquidacion] sp_Imprime_EstCta_pape → recordset: ${rows.length} rows, recordsets: ${allResultSets.length} sets | codigo=${dto.codigo} infraccion=${dto.infraccion}`,
      );
      if (allResultSets.length > 1) {
        this.logger.log(`[liquidacion] recordsets lengths: ${allResultSets.map((r: any) => r.length).join(', ')}`);
      }
      if (rows.length === 0 && allResultSets.length > 1) {
        this.logger.log(`[liquidacion] Using recordsets[1] instead (first set empty)`);
      }
      const effectiveRows = rows.length > 0 ? rows : (allResultSets.length > 1 ? allResultSets[1] ?? [] : []);
      if (!effectiveRows || effectiveRows.length === 0) {
        return { success: false, message: 'No se encontraron datos para la liquidación.' };
      }

      // Build texto parameter (concatenation of params for observation)
      const texto = `${dto.codigo}%1%0%0%*10.86*,*25.30*,*30.98*,*46.34*%0%*${infracLimpia}*%[Caja].[sp_Imprime_EstCta_pape]`;

      const dtz = new Date().toLocaleDateString('es-PE');

      // Step 2: Create liquidation header (@msquery=1)
      // SP signature: @msquery int, @codigo char(7), @monto decimal(18,2), @observacion nvarchar(4000),
      //               @usuario varchar(50), @terminal varchar(50), @fec_venci varchar(30)
      // OUTPUT: @nliqui varchar(14), @idliqui int
      let nliqui = '';
      let idliqui = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstRow = effectiveRows[0] as any;
      const monto = Number(firstRow.total_deuda ?? firstRow.total ?? firstRow.saldo ?? 0);
      this.logger.log(`[liquidacion] Step 2 pa_liquidacion(@msquery=1) | monto=${monto} codigo=${dto.codigo}`);

      const headerResult = await this.db.executeProcedure(
        '[Caja].[pa_liquidacion]',
        {
          msquery: 1,
          codigo: dto.codigo,
          monto,
          usuario: dto.usuario || 'JMOZO',
          terminal: 'NIMAGEN01',
          observacion: texto,
          fec_venci: dtz,
        },
        {
          msquery: mssql.Int,
          codigo: mssql.VarChar(20),
          monto: mssql.Float,
          usuario: mssql.VarChar(50),
          terminal: mssql.VarChar(50),
          observacion: mssql.NVarChar(4000),
          fec_venci: mssql.VarChar(30),
        },
      );

      const headerRow = headerResult.recordset?.[0];
      this.logger.log(
        `[liquidacion] Step 2 result: ${JSON.stringify(headerRow ?? {})}`,
      );
      if (headerRow) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hr = headerRow as any;
        nliqui = String(hr.nliqui ?? Object.values(hr)[0] ?? '');
        idliqui = String(hr.idliqui ?? Object.values(hr)[1] ?? '');
      }

      if (!nliqui) {
        return { success: false, message: 'No se pudo generar el número de liquidación.' };
      }

      // Step 3: Insert details (@msquery=2)
      // SP signature: @secuencia int, @numero varchar(15), @idrecibo int, @anno char(4),
      //               @cod_pre varchar(20), @tipo char(5), @tipo_rec char(5), @periodo char(2),
      //               @imp_insol decimal(18,2), @imp_mora decimal(18,2), @idlq int,
      //               @costemi decimal(18,2), @fact_mora decimal(18,5), @descuento decimal(18,2)
      let re = 1;
      for (const dataRow of effectiveRows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = dataRow as any;
        const codPre = String(item.cod_pred ?? item.num_docu ?? dto.infraccion).trim();
        const annoVal = String(item.anno ?? new Date().getFullYear().toString()).trim();
        const tipoVal = String(item.tipo ?? '10.86').trim();
        const tipoRecVal = String(item.tipo_rec ?? tipoVal).trim();
        const impInsol = Number(item.imp_insol ?? 0);
        const impMora = Number(item.mora ?? 0);
        const descVal = Number(item.descuento ?? 0);
        const idReciboVal = Number(item.idrecibo) || Number(dto.idrecibo) || 0;

        await this.db.executeProcedure(
          '[Caja].[pa_liquidacion]',
          {
            msquery: 2,
            secuencia: re,
            numero: nliqui,
            idrecibo: idReciboVal,
            anno: annoVal,
            cod_pre: codPre,
            anexo: '',
            sub_anexo: '',
            tipo: tipoVal,
            tipo_rec: tipoRecVal,
            periodo: '01',
            imp_insol: impInsol,
            imp_mora: impMora,
            idlq: Number(idliqui) || 0,
            costemi: Number(item.costo_emis ?? 0),
            fact_mora: 0,
            descuento: descVal,
          },
          {
            msquery: mssql.Int,
            secuencia: mssql.Int,
            numero: mssql.VarChar(15),
            idrecibo: mssql.Int,
            anno: mssql.VarChar(10),
            cod_pre: mssql.VarChar(20),
            anexo: mssql.VarChar(10),
            sub_anexo: mssql.VarChar(10),
            tipo: mssql.VarChar(10),
            tipo_rec: mssql.VarChar(10),
            periodo: mssql.VarChar(5),
            imp_insol: mssql.Decimal(18, 2),
            imp_mora: mssql.Decimal(18, 2),
            idlq: mssql.Int,
            costemi: mssql.Decimal(18, 2),
            fact_mora: mssql.Decimal(18, 5),
            descuento: mssql.Decimal(18, 2),
          },
        );
        re++;
      }

      if (nliqui) {
        this.logger.log(`Liquidación generada: ${nliqui} para infracción ${dto.infraccion}`);
        return { success: true, nliqui, message: 'Liquidación generada.' };
      }

      return { success: false, message: 'Ocurrió un error al generar la Liquidación.' };
    } catch (error) {
      this.logger.error('Error al generar liquidación:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al generar la liquidación.',
      };
    }
  }

  /**
   * Búsqueda paginada de propietarios.
   * Legacy: Papeletatransito01Controller::consultapropieAction
   * SP: papeleta.consultapropie (@msquery=1 count, @msquery=2 rows)
   */
  async consultaPropietario(
    dto: ConsultaPropietarioDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<PropietarioRow>; message: string }> {
    try {
      const { propieta, page, limit } = dto;
      const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
      const end = limit * page;

      const countResult = await this.db.executeProcedure(
        'papeleta.consultapropie',
        { msquery: '1', propie: propieta },
      );
      const total = Number(Object.values(countResult.recordset?.[0] ?? {})[0] ?? 0);

      const rowsResult = await this.db.executeProcedure(
        'papeleta.consultapropie',
        { msquery: '2', propie: propieta, start, end },
      );

      const rows: PropietarioRow[] = (rowsResult.recordset ?? []).map((row: any) => {
        const v = Object.values(row);
        return {
          idpropie: String(v[0] ?? ''),
          propietario: String(v[1] ?? ''),
          docu: String(v[2] ?? ''),
          tarjeta: String(v[3] ?? ''),
          direccion: String(v[4] ?? ''),
        };
      });

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaPropietario:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de propietario.' };
    }
  }

  /**
   * Búsqueda paginada de conductores.
   * Legacy: Papeletatransito01Controller::consultaconducAction
   * SP: papeleta.consultaconduc (@msquery=1 count, @msquery=2 rows)
   */
  async consultaConductor(
    dto: ConsultaConductorDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<ConductorRow>; message: string }> {
    try {
      const { conductor, dni, page, limit } = dto;
      const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
      const end = limit * page;

      const countResult = await this.db.executeProcedure(
        'papeleta.consultaconduc',
        { msquery: '1', conduc: conductor, dni },
      );
      const total = Number(Object.values(countResult.recordset?.[0] ?? {})[0] ?? 0);

      const rowsResult = await this.db.executeProcedure(
        'papeleta.consultaconduc',
        { msquery: '2', conduc: conductor, dni, start, end },
      );

      const rows: ConductorRow[] = (rowsResult.recordset ?? []).map((row: any) => {
        const v = Object.values(row);
        return {
          idconduc: String(v[0] ?? ''),
          conductor: String(v[1] ?? ''),
          docu: String(v[2] ?? ''),
          licencia: String(v[3] ?? ''),
          direccion: String(v[4] ?? ''),
        };
      });

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaConductor:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de conductor.' };
    }
  }

  /**
   * Búsqueda paginada de placas.
   * Legacy: Papeletatransito01Controller::consultaplacaAction
   * SP: papeleta.proc_placa (@msquery=6 count, @msquery=7 rows)
   */
  async consultaPlaca(
    dto: ConsultaPlacaDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<PlacaRow>; message: string }> {
    try {
      const { placa, page, limit } = dto;
      const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
      const end = limit * page;

      const countResult = await this.db.executeProcedure(
        'papeleta.proc_placa',
        { msquery: '6', codplaca: placa },
      );
      const total = Number(Object.values(countResult.recordset?.[0] ?? {})[0] ?? 0);

      const rowsResult = await this.db.executeProcedure(
        'papeleta.proc_placa',
        { msquery: '7', codplaca: placa, start, end },
      );

      const rows: PlacaRow[] = (rowsResult.recordset ?? []).map((row: any) => {
        const v = Object.values(row);
        return {
          idtramplac: String(v[0] ?? ''),
          codplac: String(v[1] ?? '').trim(),
          codplacSec: String(v[10] ?? '').trim(),
          tipvehi: String(v[2] ?? ''),
          codmarc: String(v[3] ?? ''),
          codcolo: String(v[4] ?? ''),
          desvehi: String(v[13] ?? ''),
          desmarc: String(v[14] ?? ''),
          aniofab: String(v[12] ?? ''),
          descolor: String(v[15] ?? ''),
        };
      });

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaPlaca:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de placa.' };
    }
  }

  /**
   * Búsqueda paginada de policías por CIP.
   * Legacy: Papeletatransito01Controller::consultapoliciaAction
   * SP: papeleta.proc_placa (@msquery=8 count, @msquery=9 rows)
   */
  async consultaPolicia(
    dto: ConsultaPoliciaDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<PoliciaRow>; message: string }> {
    try {
      const { cip, page, limit } = dto;
      const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
      const end = limit * page;

      const countResult = await this.db.executeProcedure(
        'papeleta.proc_placa',
        { msquery: '8', cip },
      );
      const total = Number(Object.values(countResult.recordset?.[0] ?? {})[0] ?? 0);

      const rowsResult = await this.db.executeProcedure(
        'papeleta.proc_placa',
        { msquery: '9', cip, start, end },
      );

      const rows: PoliciaRow[] = (rowsResult.recordset ?? []).map((row: any) => {
        const v = Object.values(row);
        return {
          id: String(v[0] ?? ''),
          ncip: String(v[1] ?? ''),
          datos: String(v[2] ?? ''),
        };
      });

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaPolicia:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de policía.' };
    }
  }

  /**
   * Búsqueda paginada de lugares de infracción.
   * Legacy: Papeletatransito01Controller::consultalugarAction
   * SP: papeleta.lugar_infrac (@msquery=1 count, @msquery=2 rows)
   */
  async consultaLugar(
    dto: ConsultaLugarDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<LugarRow>; message: string }> {
    try {
      const { cmbtipolugar, nlugar, cmbtipocalle, ncalle, page, limit } = dto;
      const start = page > 1 ? (page - 1) * limit + 1 : (page - 1) * limit;
      const end = limit * page;

      // Si cmbtipocalle o cmbtipolugar vienen vacíos "", pasar 0 para evitar 'Error converting data type varchar to int.'
      const tvia = cmbtipocalle && cmbtipocalle.trim() !== '' ? Number(cmbtipocalle) || 0 : 0;
      const tjunta = cmbtipolugar && cmbtipolugar.trim() !== '' ? Number(cmbtipolugar) || 0 : 0;
      const via = ncalle ?? '';
      const junta = nlugar ?? '';

      const countResult = await this.db.executeProcedure(
        'papeleta.lugar_infrac',
        { msquery: 1, tvia, via, tjunta, junta },
      );
      const total = Number(Object.values(countResult.recordset?.[0] ?? {})[0] ?? 0);

      const rowsResult = await this.db.executeProcedure(
        'papeleta.lugar_infrac',
        { msquery: 2, tvia, via, tjunta, junta, start, end },
      );

      const rows: LugarRow[] = (rowsResult.recordset ?? []).map((row: any) => {
        const v = Object.values(row);
        return {
          id: String(v[0] ?? ''),
          tvia: String(v[1] ?? ''),
          via: String(v[2] ?? ''),
          tlugar: String(v[3] ?? ''),
          lugar: String(v[4] ?? ''),
        };
      });

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaLugar:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de lugar.' };
    }
  }

  /**
   * Busca datos para envío a coactivo.
   * Legacy: Papeletatransito01Controller::papeletacoactivoAction
   * SP: papeleta.envioacoactivo (@msquery=1, @txtnumeroinfraccion)
   */
  async buscarEnvioCoactivo(
    dto: BuscarEnvioCoactivoDto,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.envioacoactivo',
        { msquery: '1', txtnumeroinfraccion: dto.ninfrac },
      );

      const row = result.recordset?.[0];
      if (!row) {
        return { success: false, message: 'No se encontraron datos para el envío a coactivo.' };
      }

      const vals = Object.values(row);
      const data: Record<string, unknown> = {
        seriePapel: String(vals[1] ?? ''),
        taloPapel: String(vals[2] ?? ''),
        numeroPapel: String(vals[3] ?? ''),
        oficio: String(vals[4] ?? ''),
        fechaPapeleta: String(vals[5] ?? ''),
        codigoInfraccion: String(vals[6] ?? ''),
      };

      this.logger.log(`Datos envío coactivo buscados: ${dto.ninfrac}`);
      return { success: true, data, message: 'Datos cargados.' };
    } catch (error) {
      this.logger.error('Error al buscar datos envío coactivo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al buscar datos envío coactivo.',
      };
    }
  }

  /**
   * Graba el envío a coactivo.
   * Legacy: Papeletatransito01Controller::grabarenviarcoactivoAction
   * SP: papeleta.envioacoactivo (@msquery=2)
   */
  async grabarEnvioCoactivo(
    dto: GrabarEnvioCoactivoDto,
    idusuario: string,
    estacion: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const now = new Date();
      const fech_ingreso = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const result = await this.db.executeProcedure(
        'papeleta.envioacoactivo',
        {
          msquery: '2',
          txtnumeroinfraccion: dto.ninfrac,
          xidusuario: idusuario,
          xestacion: estacion,
          xfech_ingreso: fech_ingreso,
          xobservacion: (dto.observacion ?? '').toUpperCase(),
        },
      );

      const row = result.recordset?.[0];
      const mensaje = row ? String(Object.values(row)[1] ?? 'Enviado a Coactivo') : 'Enviado a Coactivo';

      this.logger.log(`Envío a coactivo grabado: ${dto.ninfrac}`);
      return { success: true, message: mensaje };
    } catch (error) {
      this.logger.error('Error al grabar envío a coactivo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al enviar a coactivo.',
      };
    }
  }

  /**
   * Consulta escala de infracciones / multas.
   * Legacy: Papeleta01Controller::infraccionAction / Papeletatransito01Controller::infraccionAction
   * SP: papeleta.consulta_infrac (@msquery=4 para total, @msquery=5 para lista)
   */
  async consultaInfracciones(
    dto: ConsultaInfraccionesDto,
  ): Promise<{ success: boolean; data?: SearchPagedResult<InfraccionMultaRow>; message: string }> {
    try {
      const { busqueda, page = 1, limit = 15 } = dto;
      const term = (busqueda ?? '').trim();
      const start = (page - 1) * limit + 1;
      const end = page * limit;
      const anioActual = new Date().getFullYear().toString();

      // 1. Obtener conteo total (@msquery = '4')
      const countRes = await this.db.executeProcedure('papeleta.consulta_infrac', {
        msquery: '4',
        filtro: term,
        anio: anioActual,
      });
      const total = countRes.recordset?.[0] ? Number(Object.values(countRes.recordset[0])[0] ?? 0) : 0;

      // 2. Obtener filas paginadas (@msquery = '5')
      const dataRes = await this.db.executeProcedure('papeleta.consulta_infrac', {
        msquery: '5',
        filtro: term,
        anio: anioActual,
        start,
        end,
      });

      const rows: InfraccionMultaRow[] = (dataRes.recordset ?? []).map((r: any, idx: number) => ({
        id: String(r.row ?? idx + 1),
        codigo: String(r.tif_infracc ?? r.codigo ?? ''),
        tenor: String(r.tinf_des ?? r.tenor ?? ''),
        porcentaje: String(r.porcentaje ?? '0'),
        vehiculo: String(r.desvehi ?? 'TODOS'),
        uit: String(r.uit ?? '5500.00'),
        monto: String(r.valor ?? r.monto ?? '0.00'),
      }));

      return { success: true, data: { total, rows }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error en consultaInfracciones:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error en búsqueda de multas.' };
    }
  }

  /**
   * Registra una nueva calle y junta (Lugar de infracción).
   * Legacy: Papeletatransito01Controller::grabarjucaAction
   * SP: papeleta.lugar_infrac (@msquery=5)
   */
  async grabarJuca(dto: {
    cmbtipocallen: string;
    txtncallen: string;
    cmbtipolugarn: string;
    txtnlugarn: string;
  }): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const result = await this.db.executeProcedure('papeleta.lugar_infrac', {
        msquery: '5',
        tvia: dto.cmbtipocallen,
        via: dto.txtncallen.toUpperCase(),
        tjunta: dto.cmbtipolugarn,
        junta: dto.txtnlugarn.toUpperCase(),
      });

      const msg = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? 'Registrado') : 'Registrado';
      return { success: true, data: msg, message: msg };
    } catch (error) {
      this.logger.error('Error en grabarJuca:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error al registrar calle/junta.' };
    }
  }

  /**
   * Registra o actualiza un conductor/propietario.
   * Legacy: Papeletatransito01Controller::grabarconproAction
   * SP: papeleta.nuevoingreso
   */
  async grabarConPro(dto: {
    tipoper?: string;
    cmbtipoper?: string;
    txtaprz: string;
    txtapmater?: string;
    txtnombre?: string;
    txtdniruc: string;
    txtnlicencia?: string;
    txtntarjeta?: string;
    txtdomicilio?: string;
    txtdnumero?: string;
    txtdmanzana?: string;
    txtdlote?: string;
    txtidlugar?: string;
    idconductor?: string;
    txtemail?: string;
    usuario?: string;
    estacion?: string;
  }): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const mquery = !dto.idconductor ? '1' : '2';
      const result = await this.db.executeProcedure('papeleta.nuevoingreso', {
        mquery,
        tipoing: (dto.tipoper ?? 'DNI').toUpperCase(),
        tipoper: dto.cmbtipoper ?? '1',
        aprz: (dto.txtaprz ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        apmater: (dto.txtapmater ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        nombre: (dto.txtnombre ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        dniruc: (dto.txtdniruc ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        nlicencia: (dto.txtnlicencia ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        ntarjeta: (dto.txtntarjeta ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        domicilio: (dto.txtdomicilio ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        dnumero: (dto.txtdnumero ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        dmanzana: (dto.txtdmanzana ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        dlote: (dto.txtdlote ?? '').replace(/[\t\r\n]+/g, ' ').trim().toUpperCase(),
        idlugar: (dto.txtidlugar ?? '').trim().toUpperCase(),
        xidusuario: (dto.usuario ?? 'SIGMUN').trim().toUpperCase(),
        xestacion: (dto.estacion ?? 'SYSTEM').trim().toUpperCase(),
        idconductor: (dto.idconductor ?? '').trim(),
        email: (dto.txtemail ?? '').replace(/[\t\r\n]+/g, '').trim().toLowerCase(),
      });

      // El SP papeleta.nuevoingreso devuelve "mensaje/C" (conductor) o "mensaje/P" (propietario),
      // o "Error..." cuando no se pudo grabar (p.ej. DNI ya ingresado).
      const raw = result.recordset?.[0] ? String(Object.values(result.recordset[0])[0] ?? '') : '';
      if (!raw || raw.toUpperCase().startsWith('ERROR')) {
        return { success: false, message: raw || 'No se pudo registrar la persona.' };
      }
      const msg = raw.split('/')[0]?.trim() || 'Registrado exitosamente';
      return { success: true, data: msg, message: msg };
    } catch (error) {
      this.logger.error('Error en grabarConPro:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error al registrar persona.' };
    }
  }

  /**
   * Obtiene combos de Tipo de Vía y Tipo de Lugar desde papeleta.lugar_infrac.
   * Legacy: Papeletatransito01Controller::lugarpapeAction (@msquery=3 para tlugar, @msquery=4 para tvia)
   */
  async obtenerCombosLugar(): Promise<{
    success: boolean;
    data?: {
      tiposVia: Array<{ id: string; descripcion: string }>;
      tiposLugar: Array<{ id: string; descripcion: string }>;
    };
    message: string;
  }> {
    try {
      // 1. Tipos de Vía (@msquery = '4')
      const viaRes = await this.db.executeProcedure('papeleta.lugar_infrac', { msquery: '4' });
      const tiposVia = (viaRes.recordset ?? []).map((r: any) => ({
        id: String(Object.values(r)[0] ?? ''),
        descripcion: String(Object.values(r)[1] ?? ''),
      })).filter((item: any) => item.id !== '00' && item.id !== '');

      // 2. Tipos de Lugar (@msquery = '3')
      const lugarRes = await this.db.executeProcedure('papeleta.lugar_infrac', { msquery: '3' });
      const tiposLugar = (lugarRes.recordset ?? []).map((r: any) => ({
        id: String(Object.values(r)[0] ?? ''),
        descripcion: String(Object.values(r)[1] ?? ''),
      })).filter((item: any) => item.id !== '00' && item.id !== '');

      return {
        success: true,
        data: { tiposVia, tiposLugar },
        message: 'OK',
      };
    } catch (error) {
      this.logger.error('Error al obtener combos de lugar:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al cargar combos de lugar.',
      };
    }
  }

  // ── Reportes: obtener datos estructurados para plantillas HTML ────────────

  /**
   * Obtiene datos del Estado de Cuenta para la plantilla HTML del reporte.
   * SP: papeleta.sp_Imprime_EstCta_record (@buscar=0, @placa, @conductor, @dni, @estado)
   */
  async obtenerDatosReporteEstadoCuenta(dto: ReporteEstadoCuentaDto): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      let infracLimpia = (dto.ninfrac ?? '').replace(/\s+/g, '');
      const parts = infracLimpia.split('-');
      if (parts.length === 3 && /^\d+$/.test(parts[2])) {
        infracLimpia = `${parts[0]}-${parts[1]}-${parts[2].padStart(6, '0')}`;
      }

      // Consultar estado en caja.mrecibos igual que AUTOLIQUIDADOR pitService.ts
      let estadoFiltro = '0';
      if (infracLimpia) {
        try {
          const estRes = await this.db.query(
            `SELECT TOP 1 estado FROM caja.mrecibos (NOLOCK) WHERE num_docu = '${infracLimpia}'`,
          );
          const estRow = estRes.recordset?.[0] as any;
          if (estRow && estRow.estado != null) {
            estadoFiltro = String(estRow.estado).trim();
          }
        } catch {
          // fallback
        }
      }

      const spParams = {
        buscar: 2,
        codigo: dto.codigo ?? '',
        resumen: 1,
        detalle: 0,
        agrupar: 0,
        annos: '',
        tipos: '*10.86*,*25.30*,*30.98*,*46.34*',
        tiporec: '',
        perio: '',
        predio: '',
        estado: estadoFiltro,
        criterio: 0,
        vehiculo: '',
        fracciona: infracLimpia ? `*${infracLimpia}*` : '',
      };

      const spTypes = {
        buscar: mssql.Int,
        codigo: mssql.Char(7),
        resumen: mssql.Int,
        detalle: mssql.Int,
        agrupar: mssql.Int,
        annos: mssql.NVarChar(2000),
        tipos: mssql.NVarChar(2000),
        tiporec: mssql.NVarChar(2000),
        perio: mssql.NVarChar(2000),
        predio: mssql.NVarChar(2000),
        estado: mssql.VarChar(1),
        criterio: mssql.Int,
        vehiculo: mssql.NVarChar(2000),
        fracciona: mssql.NVarChar(2000),
      };

      const result = await this.db.executeProcedure(
        '[Caja].[sp_Imprime_EstCta_pape]',
        spParams,
        spTypes,
      );

      const rows = result.recordset ?? [];
      const allResultSets = result.recordsets ?? [];
      const effectiveRows = rows.length > 0 ? rows : (allResultSets.length > 1 ? allResultSets[1] ?? [] : []);

      this.logger.log(
        `Reporte EstadoCuenta ([Caja].[sp_Imprime_EstCta_pape]): ${effectiveRows.length} filas para ninfrac=${dto.ninfrac} (codigo=${dto.codigo})`,
      );
      return { success: true, data: effectiveRows, message: 'OK' };
    } catch (error) {
      this.logger.error('Error al obtener datos de Estado de Cuenta:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener datos del Estado de Cuenta.',
      };
    }
  }

  /**
   * Obtiene datos del Certificado de No Adeudo para la plantilla HTML del reporte.
   * SP: papeleta.sp_Imprime_Certificadonoadeudo (@buscar=2, @ninfrac, @numingr, @operador)
   */
  async obtenerDatosReporteCertificado(dto: ReporteCertificadoNoAdeudoDto): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const ninfracInt = parseInt(dto.ninfrac, 10) || 0;
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_Certificadonoadeudo',
        {
          buscar: 2,
          ninfrac: ninfracInt,
          numingr: dto.numingr ?? '',
          operador: dto.operador ?? '',
        },
        {
          buscar: mssql.Int,
          ninfrac: mssql.Int,
          numingr: mssql.VarChar(15),
          operador: mssql.VarChar(50),
        },
      );
      const rows = result.recordset ?? [];
      this.logger.log(`Reporte Certificado NoAdeudo: ${rows.length} fila(s) para ninfrac=${dto.ninfrac}`);
      const data = (rows[0] ?? null) as any;
      if (data?.fecha) {
        data.fecha = this.traducirMesEnFecha(String(data.fecha));
      }
      return { success: true, data, message: 'OK' };
    } catch (error) {
      this.logger.error('Error al obtener datos del Certificado de No Adeudo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener datos del Certificado de No Adeudo.',
      };
    }
  }

  /**
   * Obtiene datos del Certificado de Gravamen para la plantilla HTML del reporte.
   * SP: papeleta.sp_Imprime_Certificadogravamen (@buscar=2, @ninfrac, @numingr, @operador)
   */
  async obtenerDatosReporteGravamen(dto: ReporteGravamenDto): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.sp_Imprime_Certificadogravamen',
        {
          buscar: 2,
          ninfrac: parseInt(dto.ninfrac, 10),
          numingr: dto.numingr,
          operador: dto.operador,
        },
      );
      const rows = result.recordset ?? [];
      this.logger.log(`Reporte Gravamen: ${rows.length} fila(s) para ninfrac=${dto.ninfrac}`);
      return { success: true, data: rows, message: 'OK' };
    } catch (error) {
      this.logger.error('Error al obtener datos del Certificado de Gravamen:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener datos del Certificado de Gravamen.',
      };
    }
  }

  /**
   * Obtiene datos de la Resolución de Sanción para la plantilla HTML del reporte.
   * SP: papeleta.rpt_reslsanc (@idtramctas, @xidusuario, @xestacion)
   */
  async obtenerDatosReporteResolucionSancion(dto: ReporteResolucionSancionDto): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const result = await this.db.executeProcedure(
        'papeleta.rpt_reslsanc',
        {
          idtramctas: dto.idtramctas,
          xidusuario: dto.usuario,
          xestacion: dto.estacion,
        },
      );
      const rows = result.recordset ?? [];
      this.logger.log(`Reporte ResolucionSancion: ${rows.length} fila(s) para idtramctas=${dto.idtramctas}`);
      return { success: true, data: rows[0] ?? null, message: 'OK' };
    } catch (error) {
      this.logger.error('Error al obtener datos de la Resolución de Sanción:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener datos de la Resolución de Sanción.',
      };
    }
  }

  /**
   * Combos de Tipo de Vehículo, Marca y Color para el formulario de placa.
   * Legacy: Papeletatransito01Controller::formuplacaAction
   * SP: papeleta.proc_placa (@msquery=2 tipos vehículo, @msquery=3 marcas, @msquery=4 colores)
   */
  async obtenerCombosPlaca(): Promise<{
    success: boolean;
    data?: {
      tipos: Array<{ id: string; descripcion: string }>;
      marcas: Array<{ id: string; descripcion: string }>;
      colores: Array<{ id: string; descripcion: string }>;
    };
    message: string;
  }> {
    try {
      const toCombo = (rows: any[]): Array<{ id: string; descripcion: string }> =>
        (rows ?? []).map((r: any) => {
          const v = Object.values(r);
          return { id: String(v[0] ?? ''), descripcion: String(v[1] ?? '') };
        }).filter((item: any) => item.id !== '' && item.id !== '0' && item.id !== '00');

      const [tiposRes, marcasRes, coloresRes] = await Promise.all([
        this.db.executeProcedure('papeleta.proc_placa', { msquery: '2' }),
        this.db.executeProcedure('papeleta.proc_placa', { msquery: '3' }),
        this.db.executeProcedure('papeleta.proc_placa', { msquery: '4' }),
      ]);

      return {
        success: true,
        data: {
          tipos: toCombo(tiposRes.recordset ?? []),
          marcas: toCombo(marcasRes.recordset ?? []),
          colores: toCombo(coloresRes.recordset ?? []),
        },
        message: 'OK',
      };
    } catch (error) {
      this.logger.error('Error en obtenerCombosPlaca:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error al obtener combos de placa.' };
    }
  }

  /**
   * Registra o actualiza una placa.
   * Legacy: Papeletatransito01Controller::grabarplacaAction
   * SP: papeleta.sp_placareg (@mquery=1 nuevo, @mquery=2 modificar, @mquery=4 cambio de placa)
   */
  async grabarPlaca(dto: {
    mquery?: number;
    idtramplac?: number;
    codplac: string;
    codplac1?: string;
    tipvehi?: string;
    codmarc?: string;
    codcolo?: string;
    aniofab?: string;
    formalidad?: string;
    codigo?: string;
    estado?: string;
    usuario?: string;
    estacion?: string;
    fechIngreso?: string;
  }): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const mquery = dto.mquery ?? 1;
      const result = await this.db.executeProcedure('papeleta.sp_placareg', {
        mquery,
        xidtramplac: String(dto.idtramplac ?? '0'),
        xcodplac: (dto.codplac ?? '').trim().toUpperCase(),
        xcodplac1: (dto.codplac1 ?? '').trim().toUpperCase(),
        xtipvehi: dto.tipvehi ?? '1',
        xcodmarc: dto.codmarc ?? '',
        xcodcolo: dto.codcolo ?? '',
        xusuario: (dto.usuario ?? 'SIGMUN').trim().toUpperCase(),
        xestacion: (dto.estacion ?? 'SYSTEM').trim().toUpperCase(),
        xfech_ingreso: dto.fechIngreso ?? new Date().toISOString(),
        codigo: dto.codigo ?? '0',
        xestado: dto.estado ?? '1',
        xformal: (dto.formalidad ?? 'Informal').trim(),
        [`xa\u00f1of`]: (dto.aniofab ?? '').trim(),
      });

      // El SP sp_placareg devuelve "select '','Registro Ingresado'".
      // El driver mssql agrupa las columnas anónimas como { '': ['', 'Registro Ingresado'] }.
      const firstVal = Object.values(result.recordset?.[0] ?? {})[0];
      const raw = String(Array.isArray(firstVal) ? (firstVal[1] ?? firstVal[0] ?? '') : (firstVal ?? ''));
      if (!raw || raw.toUpperCase().startsWith('ERROR')) {
        return { success: false, message: raw || 'No se pudo registrar la placa.' };
      }
      return { success: true, data: raw, message: raw };
    } catch (error) {
      this.logger.error('Error en grabarPlaca:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error al registrar placa.' };
    }
  }

  /**
   * Traduce el nombre del mes en inglés a español en strings con formato
   * "D del mes de MonthName de YYYY" (producido por SQL Server DateName en inglés).
   */
  private traducirMesEnFecha(fecha: string): string {
    const meses: Record<string, string> = {
      January: 'Enero', February: 'Febrero', March: 'Marzo',
      April: 'Abril', May: 'Mayo', June: 'Junio',
      July: 'Julio', August: 'Agosto', September: 'Setiembre',
      October: 'Octubre', November: 'Noviembre', December: 'Diciembre',
    };
    return fecha.replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
      (mes) => meses[mes] ?? mes,
    );
  }
}

