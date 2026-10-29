import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  ContribuyenteHeader,
  ContribuyenteRow,
  GradualidadRow,
  InfraccionRow,
  MultaDetalle,
  MultaRow,
  MultasResult,
  PredioRow,
  SearchContribuyenteResult,
  TributoRow,
  UitRow,
  WriteResult,
} from './multa-tributaria.types';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import {
  GetAnnoDto,
  GetContribuyenteDto,
  GetDetalleDto,
  GetInfraccionDto,
  GetMultasDto,
  GetPrediosDto,
} from './dto/get-consultas.dto';
import { EliminarMultaDto, GrabarMultaDto } from './dto/grabar-multa.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpRow = Record<string, any>;

const str = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).trim();

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normaliza fechas a ISO `YYYY-MM-DD`.
 * Las consultas ya devuelven ISO con CONVERT(...,23); esto cubre Date y
 * `dd/mm/yyyy` por si algun SP auxiliar los devuelve.
 */
export function toIsoDate(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return s;
}

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
export class MultaTributariaService {
  private readonly logger = new Logger(MultaTributariaService.name);

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
        { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
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
        `[MultaTributaria] search error: ${error instanceof Error ? error.message : String(error)}`,
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

  /** Cabecera del contribuyente (store_caja_framework @msquery=17). */
  async getContribuyente(
    dto: GetContribuyenteDto,
  ): Promise<ContribuyenteHeader | null> {
    const result = await this.db.executeProcedure(
      'dbo.store_caja_framework',
      { msquery: 17, codigo: dto.codigo },
    );
    const row = result.recordset?.[0] as SpRow | undefined;
    if (!row) return null;
    return {
      codigo: str(row.codigo),
      nombres: str(row.nombres),
      numDoc: str(row.num_doc),
      direccion: str(row.direccion),
    };
  }

  /** Listado de multas del contribuyente. */
  async getMultas(dto: GetMultasDto): Promise<MultasResult> {
    const baseFrom = `
      FROM Rentas.Multas_Tributarias t WITH(NOLOCK)
      INNER JOIN Caja.Tipo_Ingresos_Det d WITH(NOLOCK)
        ON t.tipo = d.tipo AND t.tipo_rec = d.tipo_rec
      INNER JOIN Caja.MRecibos c WITH(NOLOCK)
        ON t.codigo = c.codigo AND t.id_multa = c.num_docu AND t.num_docu = c.idrecibo
      LEFT JOIN Contenedor.TipoRec r WITH(NOLOCK)
        ON t.tipo = r.tipo AND t.tipo_rec = r.tipo_rec
      WHERE t.codigo = @codigo`;

    try {
      const countResult = await this.db.queryWithParams<{ total: number }>(
        `SELECT COUNT(*) AS total ${baseFrom}`,
        { codigo: dto.codigo },
      );
      const total = num(countResult.recordset?.[0]?.total);

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

      const offset = (dto.page - 1) * dto.pageSize;
      const rowsResult = await this.db.queryWithParams<SpRow>(
        `SELECT
           t.codigo,
           nro_multa = RIGHT('0000000' + CAST(t.id_multa AS varchar(7)), 7),
           t.anno,
           fecha_multa = CONVERT(varchar(10), t.fecha_emision, 23),
           motivo = ISNULL(r.descrip2, '') + ' - ' + ISNULL(d.concepto, ''),
           monto = t.importe_original,
           estado_multa = t.estado_id,
           estado_recibo = c.estado,
           obligacion = CASE
             WHEN c.estado = '1' THEN 'PAGADO'
             WHEN c.estado = '0' AND c.ubica = 'EM' THEN 'DEBE'
             WHEN c.estado = '0' AND c.ubica LIKE '%FR%' THEN 'FRACC'
             WHEN c.estado = '2' THEN 'ANULADO'
           END,
           frac = CASE WHEN c.ubica LIKE '%FR%' THEN '1' ELSE '0' END,
           t.id_multa,
           t.motivo_eliminacion,
           t.operador_act,
           t.estacion_act,
           fecha_act = CONVERT(varchar(19), t.fecha_act, 120)
         ${baseFrom}
         ORDER BY t.id_multa DESC
         OFFSET @offset ROWS FETCH NEXT @take ROWS ONLY`,
        { codigo: dto.codigo, offset, take: dto.pageSize },
      );

      const data: MultaRow[] = (rowsResult.recordset ?? []).map((raw) => {
        const row = raw as SpRow;
        return {
          codigo: str(row.codigo),
          nroMulta: str(row.nro_multa),
          anio: str(row.anno),
          fecMulta: toIsoDate(row.fecha_multa),
          motivo: str(row.motivo),
          monto: num(row.monto),
          estadoMulta: str(row.estado_multa),
          estadoRecibo: str(row.estado_recibo),
          obligacion: str(row.obligacion),
          frac: str(row.frac),
          idMulta: str(row.id_multa),
          motivoEliminacion: str(row.motivo_eliminacion),
          operadorAct: str(row.operador_act),
          estacionAct: str(row.estacion_act),
          fechaAct: str(row.fecha_act),
        };
      });

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
        `[MultaTributaria] getMultas error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: 0,
        error: 'Error al consultar las multas del contribuyente',
      };
    }
  }

  /**
   * Predios del contribuyente para el anio.
   * `flagPredio` = 1 solo si existe una multa VIGENTE para ese predio/anio.
   * (El SP legacy ignora estado_id, por eso marcaba predios con multas
   * eliminadas.)
   */
  async getPredios(dto: GetPrediosDto): Promise<PredioRow[]> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT
         a.codigo,
         a.anno,
         a.cod_pred,
         a.anexo,
         a.sub_anexo,
         anexos = a.anexo + '-' + a.sub_anexo,
         direccion = Rentas.getDirpred(a.codigo, a.cod_pred, a.anexo, a.sub_anexo, a.anno),
         area_terreno = a.area_terreno,
         porcen_propiedad = a.porcen_propiedad,
         total_autoavaluo = ISNULL(a.total_autoavaluo, 0),
         tipo = CASE WHEN a.tipo_pred = '1' THEN 'PU' ELSE 'PR' END,
         flag_predio = CASE WHEN EXISTS (
           SELECT 1 FROM Rentas.Multas_Tributarias t WITH(NOLOCK)
           WHERE t.codigo = a.codigo AND t.cod_pred = a.cod_pred
             AND t.anexo = a.anexo AND t.sub_anexo = a.sub_anexo
             AND t.anno = a.anno AND t.estado_id = '1'
         ) THEN '1' ELSE '0' END
       FROM Rentas.MPUpred a WITH(NOLOCK)
       WHERE a.nestado = 1 AND a.codigo = @codigo AND a.anno = @anno
       ORDER BY a.cod_pred`,
      { codigo: dto.codigo, anno: dto.anno },
    );

    return (result.recordset ?? []).map((raw) => {
      const row = raw as SpRow;
      return {
        codigo: str(row.codigo),
        anno: str(row.anno),
        codPred: str(row.cod_pred),
        anexo: str(row.anexo),
        subAnexo: str(row.sub_anexo),
        anexos: str(row.anexos),
        direccion: str(row.direccion),
        areaTerreno: num(row.area_terreno),
        porcenPropiedad: num(row.porcen_propiedad),
        totalAutoavaluo: num(row.total_autoavaluo),
        tipo: str(row.tipo),
        flagPredio: str(row.flag_predio),
      };
    });
  }

  /** Combo de tributos (sp_MultasTributarias @msquery=5). */
  async getTributos(): Promise<TributoRow[]> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT tipo, tipo_rec, id = tipo + '*' + tipo_rec + '*30.82', concepto
       FROM Caja.Tipo_Ingresos_Det WITH(NOLOCK)
       WHERE estado = '1' AND tipo_rec = '30.82'
       ORDER BY concepto`,
    );
    return (result.recordset ?? []).map((raw) => {
      const row = raw as SpRow;
      return {
        tipo: str(row.tipo),
        tipoRec: str(row.tipo_rec),
        id: str(row.id),
        concepto: str(row.concepto),
      };
    });
  }

  /** Gradualidades activas (sp_MultasTributarias @msquery=6). */
  async getGradualidad(): Promise<GradualidadRow[]> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT id_table, concepto FROM Rentas.gradualidad WITH(NOLOCK)
       WHERE estado = '1' ORDER BY concepto`,
    );
    return (result.recordset ?? []).map((raw) => {
      const row = raw as SpRow;
      return { idTable: num(row.id_table), concepto: str(row.concepto) };
    });
  }

  /** UIT del anio (Rentas.sp_uit @busc=4). */
  async getUit(dto: GetAnnoDto): Promise<UitRow | null> {
    const result = await this.db.executeProcedure('Rentas.sp_uit', {
      busc: 4,
      anno: dto.anno,
    });
    const row = result.recordset?.[0] as SpRow | undefined;
    if (!row) return null;
    return {
      anno: str(row.anno),
      valorUit: num(row.valor_uit),
      impMinimo: num(row.imp_minimo),
      impMaximo: num(row.imp_maximo),
      costoEmis: num(row.costo_emis),
      costoAdic: num(row.costo_adic),
    };
  }

  /** Valores de UIT del anio (calculo.TblvalUIT). */
  async getValor(dto: GetAnnoDto): Promise<UitRow | null> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT anno, valor_uit, imp_minimo, imp_maximo, costo_emis, costo_adic
       FROM Calculo.TblvalUIT WITH(NOLOCK) WHERE anno = @anno`,
      { anno: dto.anno },
    );
    const row = result.recordset?.[0] as SpRow | undefined;
    if (!row) return null;
    return {
      anno: str(row.anno),
      valorUit: num(row.valor_uit),
      impMinimo: num(row.imp_minimo),
      impMaximo: num(row.imp_maximo),
      costoEmis: num(row.costo_emis),
      costoAdic: num(row.costo_adic),
    };
  }

  /** Detalle de una multa para editar (sp_MultasTributarias @msquery=11). */
  async getDetalle(dto: GetDetalleDto): Promise<MultaDetalle | null> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT
         t.codigo,
         t.anno,
         t.cod_pred,
         t.anexo,
         t.sub_anexo,
         uit = (SELECT valor_uit FROM Calculo.TblvalUIT WITH(NOLOCK) WHERE anno = t.anno),
         tributo = t.tributo + '*' + t.sub_tributo + '*30.82',
         gradualidad = t.gradualidad,
         insoluto = t.insoluto,
         derecho_emision = t.derecho_emision,
         fecha_emision = CONVERT(varchar(10), t.fecha_emision, 23),
         fecha_vencimiento = CONVERT(varchar(10), t.fecha_vencimiento, 23),
         t.glosa
       FROM Rentas.Multas_Tributarias t WITH(NOLOCK)
       WHERE t.codigo = @codigo AND t.id_multa = @idMulta`,
      { codigo: dto.codigo, idMulta: dto.idMulta },
    );
    const row = result.recordset?.[0] as SpRow | undefined;
    if (!row) return null;
    return {
      codigo: str(row.codigo),
      anno: str(row.anno),
      codPred: str(row.cod_pred),
      anexo: str(row.anexo),
      subAnexo: str(row.sub_anexo),
      uit: num(row.uit),
      tributo: str(row.tributo),
      gradualidad: num(row.gradualidad),
      insoluto: num(row.insoluto),
      derechoEmision: num(row.derecho_emision),
      fechaEmision: toIsoDate(row.fecha_emision),
      fechaVencimiento: toIsoDate(row.fecha_vencimiento),
      glosa: str(row.glosa),
    };
  }

  /** Grilla de infraccion para editar (sp_MultasTributarias @msquery=13). */
  async getInfraccion(dto: GetInfraccionDto): Promise<InfraccionRow | null> {
    const result = await this.db.queryWithParams<SpRow>(
      `SELECT
         t.anno,
         tributo_concepto = (
           SELECT concepto FROM Caja.Tipo_Ingresos_Det WITH(NOLOCK)
           WHERE tipo = t.tributo AND tipo_rec = t.sub_tributo
         ),
         gradualidad_concepto = (
           SELECT concepto FROM Rentas.gradualidad WITH(NOLOCK)
           WHERE id_table = t.gradualidad
         ),
         periodos = '01',
         fecha_vencimiento = CONVERT(varchar(10), t.fecha_vencimiento, 23),
         importe = t.insoluto,
         emision = t.derecho_emision,
         sub_total = t.importe_original,
         t.glosa,
         fecha_registro = CONVERT(varchar(10), t.fecha_registro, 23),
         t.tributo,
         t.sub_tributo,
         tipo = '30.82'
       FROM Rentas.Multas_Tributarias t WITH(NOLOCK)
       WHERE t.codigo = @codigo AND t.anno = @anno
         AND t.id_multa = @idMulta AND t.estado_id = '1'`,
      { codigo: dto.codigo, anno: dto.anno, idMulta: dto.idMulta },
    );
    const row = result.recordset?.[0] as SpRow | undefined;
    if (!row) return null;
    return {
      anno: str(row.anno),
      tributoConcepto: str(row.tributo_concepto),
      gradualidadConcepto: str(row.gradualidad_concepto),
      periodos: str(row.periodos),
      fechaVencimiento: toIsoDate(row.fecha_vencimiento),
      importe: num(row.importe),
      emision: num(row.emision),
      subTotal: num(row.sub_total),
      glosa: str(row.glosa),
      fechaRegistro: toIsoDate(row.fecha_registro),
      tributo: str(row.tributo),
      subTributo: str(row.sub_tributo),
      tipo: str(row.tipo),
    };
  }

  /** Fecha del servidor en ISO (store_caja_framework @msquery=19). */
  async getFecha(): Promise<string> {
    const result = await this.db.executeProcedure(
      'dbo.store_caja_framework',
      { msquery: 19 },
    );
    const row = result.recordset?.[0] as SpRow | undefined;
    return row ? toIsoDate(row.fecha) : toIsoDate(new Date());
  }

  /**
   * Alta (idMulta ausente) o edicion (idMulta presente) de multas.
   *
   * No se usa `Rentas.sp_MultasTributarias` para escribir porque su rama de
   * alta deja `Multas_Tributarias.num_docu = '1'`
   * (`select @LAST_RECIBO = max(@idrecibo)` usa el parametro, no el identity)
   * y eso rompe el INNER JOIN del listado. La transaccion replica el mismo
   * modelo de datos pero enlaza `num_docu` con `SCOPE_IDENTITY()`.
   *
   * Tampoco se pisa `fecha_emision` en la edicion (el SP la mandaba a
   * 1900-01-01 por no recibir el parametro).
   */
  async grabar(dto: GrabarMultaDto): Promise<WriteResult> {
    try {
      if (dto.idMulta) {
        return await this.updateMulta(dto, dto.idMulta);
      }
      return await this.insertMultas(dto);
    } catch (error) {
      this.logger.error(
        `[MultaTributaria] grabar error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al grabar la multa tributaria',
      };
    }
  }

  private async insertMultas(dto: GrabarMultaDto): Promise<WriteResult> {
    const params: Record<string, unknown> = {
      codigo: dto.codigo,
      anno: dto.anno,
      codPred: dto.codPred,
      anexo: dto.anexo,
      subAnexo: dto.subAnexo,
      operador: dto.operador,
      estacion: dto.estacion,
    };

    const blocks: string[] = [];
    dto.multas.forEach((item, index) => {
      const p = `p${index}`;
      params[`${p}_tipo`] = item.tipo;
      params[`${p}_tipoRec`] = item.tipoRec;
      params[`${p}_periodo`] = item.periodo;
      params[`${p}_importeOriginal`] = item.importeOriginal;
      params[`${p}_insoluto`] = item.insoluto;
      params[`${p}_derechoEmision`] = item.derechoEmision;
      params[`${p}_glosa`] = item.glosa;
      params[`${p}_fechaVencimiento`] = item.fechaVencimiento;
      params[`${p}_gradualidad`] = item.gradualidad;

      blocks.push(`
        INSERT INTO Rentas.Multas_Tributarias
          (municipio_id, codigo, anno, cod_pred, tipo, tipo_uso_id, documento_id,
           fecha_emision, fecha_vencimiento, fecha_interes, importe_original,
           insoluto, derecho_emision, reajuste, costas, gastos, total_debitos,
           estado_id, usuario_id, fecha_actualizacion, terminal, anno_documento,
           nro_documento_id, fecha_registro, tipo_acto_generar_id, area_uso,
           ant_contribuyente, ant_predio, ant_nro_recibo, ant_estado_cabecera,
           ant_estado_detalle, ant_estado_detalle_secundario, ant_monto_total,
           glosa, nombre_terminal, id_recibo, anexo, sub_anexo, tipo_rec,
           tipo_obligacion_id, periodo, num_docu, operador, estacion, tributo,
           sub_tributo, gradualidad)
        VALUES
          (1, @codigo, @anno, @codPred, '30.82', 1, 1,
           GETDATE(), @${p}_fechaVencimiento, '1900-01-01', @${p}_importeOriginal,
           @${p}_insoluto, @${p}_derechoEmision, 0, 0, 0, 0,
           '1', 1, GETDATE(), '', 1,
           1, GETDATE(), 1, 0,
           1, 1, 1, 1,
           1, 1, 0,
           @${p}_glosa, '', 1, @anexo, @subAnexo, '30.82',
           '', @${p}_periodo, '', @operador, @estacion, @${p}_tipo,
           @${p}_tipoRec, @${p}_gradualidad);

        DECLARE @id_multa_${index} INT = SCOPE_IDENTITY();

        INSERT INTO Caja.MRecibos
          (codigo, anno, cod_pred, anexo, sub_anexo, tipo_docu, num_docu, tipo,
           tipo_rec, periodo, imp_insol, fact_reaj, imp_reaj, fact_mora, mora,
           costo_emis, observacion, estado, ubica, fec_venc, fec_pago, num_ingr,
           operador, estacion, fech_ing)
        VALUES
          (@codigo, @anno, @codPred, @anexo, @subAnexo, '', CAST(@id_multa_${index} AS varchar(20)), '30.82',
           '30.82', @${p}_periodo, @${p}_insoluto, 1.00000, 0, 0, 0,
           @${p}_derechoEmision, @${p}_glosa, '0', 'EM', @${p}_fechaVencimiento, NULL, '0',
           @operador, @estacion, GETDATE());

        DECLARE @id_recibo_${index} INT = SCOPE_IDENTITY();

        UPDATE Rentas.Multas_Tributarias
        SET num_docu = CAST(@id_recibo_${index} AS varchar(20))
        WHERE id_multa = @id_multa_${index};

        INSERT INTO @creados (id_multa, id_recibo)
        VALUES (@id_multa_${index}, @id_recibo_${index});
      `);
    });

    const script = `
      SET NOCOUNT ON;
      SET XACT_ABORT ON;
      DECLARE @creados TABLE (id_multa INT, id_recibo INT);
      BEGIN TRY
        BEGIN TRANSACTION;
        ${blocks.join('\n')}
        COMMIT TRANSACTION;
        SELECT '1' AS resultado, 'SE GENERO LA MULTA CORRECTAMENTE' AS mensaje;
        SELECT id_multa, id_recibo FROM @creados;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT '0' AS resultado, ERROR_MESSAGE() AS mensaje;
      END CATCH
    `;

    const result = await this.db.queryWithParams<SpRow>(script, params);
    const first = result.recordsets?.[0]?.[0] as SpRow | undefined;
    if (!first || str(first.resultado) !== '1') {
      return {
        success: false,
        error: str(first?.mensaje) || 'No se pudo generar la multa',
      };
    }
    const createdRows = (result.recordsets?.[1] ?? []) as SpRow[];
    return {
      success: true,
      message: str(first.mensaje),
      created: createdRows.map((r) => ({
        idMulta: num(r.id_multa),
        idRecibo: num(r.id_recibo),
      })),
    };
  }

  private async updateMulta(
    dto: GrabarMultaDto,
    idMulta: string,
  ): Promise<WriteResult> {
    const item = dto.multas[0];
    const script = `
      SET NOCOUNT ON;
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Rentas.Multas_Tributarias
        SET anno = @anno,
            tributo = @tipo,
            sub_tributo = @tipoRec,
            fecha_vencimiento = @fechaVencimiento,
            importe_original = @importeOriginal,
            insoluto = @insoluto,
            derecho_emision = @derechoEmision,
            fecha_actualizacion = GETDATE(),
            glosa = @glosa,
            operador_act = @operador,
            estacion_act = @estacion,
            fecha_act = GETDATE()
        WHERE codigo = @codigo AND id_multa = @idMulta;

        IF @@ROWCOUNT = 0
          THROW 50001, 'La multa no existe', 1;

        UPDATE Caja.MRecibos
        SET anno = @anno,
            imp_insol = @insoluto,
            costo_emis = @derechoEmision,
            observacion = @glosa,
            fec_venc = @fechaVencimiento,
            operador = @operador,
            estacion = @estacion
        WHERE codigo = @codigo AND tipo = '30.82' AND tipo_rec = '30.82'
          AND num_docu = @idMulta;

        COMMIT TRANSACTION;
        SELECT '1' AS resultado, 'SE ACTUALIZO CORRECTAMENTE' AS mensaje;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT '0' AS resultado, ERROR_MESSAGE() AS mensaje;
      END CATCH
    `;

    const result = await this.db.queryWithParams<SpRow>(script, {
      codigo: dto.codigo,
      idMulta,
      anno: dto.anno,
      tipo: item.tipo,
      tipoRec: item.tipoRec,
      fechaVencimiento: item.fechaVencimiento,
      importeOriginal: item.importeOriginal,
      insoluto: item.insoluto,
      derechoEmision: item.derechoEmision,
      glosa: item.glosa,
      operador: dto.operador,
      estacion: dto.estacion,
    });

    const first = result.recordset?.[0] as SpRow | undefined;
    if (!first || str(first.resultado) !== '1') {
      return {
        success: false,
        error: str(first?.mensaje) || 'No se pudo actualizar la multa',
      };
    }
    return { success: true, message: str(first.mensaje) };
  }

  /**
   * Eliminacion logica: recibo estado='2' y multa estado_id='0'.
   * Respeta las mismas reglas del SP pero devuelve mensajes claros y maneja
   * el caso de recibo inexistente.
   */
  async eliminar(dto: EliminarMultaDto): Promise<WriteResult> {
    try {
      const script = `
        SET NOCOUNT ON;
        DECLARE @estado char(1), @ubica varchar(4);

        SELECT TOP 1 @estado = estado, @ubica = ubica
        FROM Caja.MRecibos WITH(NOLOCK)
        WHERE codigo = @codigo AND num_docu = @idMulta
          AND tipo = '30.82' AND tipo_rec = '30.82';

        IF @estado IS NULL
          SELECT '0' AS resultado, 'NO SE ENCONTRO EL RECIBO ASOCIADO A LA MULTA' AS mensaje;
        ELSE IF @estado = '2'
          SELECT '0' AS resultado, 'LA MULTA YA FUE ELIMINADA' AS mensaje;
        ELSE IF @estado = '1'
          SELECT '0' AS resultado, 'LA MULTA YA FUE PAGADA' AS mensaje;
        ELSE IF @ubica LIKE '%FR%'
          SELECT '0' AS resultado, 'LA MULTA HA SIDO FRACCIONADA' AS mensaje;
        ELSE IF @ubica <> 'EM'
          SELECT '0' AS resultado, 'LA MULTA NO SE PUEDE ELIMINAR (UBICACION ' + @ubica + ')' AS mensaje;
        ELSE
        BEGIN
          SET XACT_ABORT ON;
          BEGIN TRY
            BEGIN TRANSACTION;
            UPDATE Caja.MRecibos SET estado = '2'
            WHERE codigo = @codigo AND tipo = '30.82' AND tipo_rec = '30.82'
              AND num_docu = @idMulta;

            UPDATE Rentas.Multas_Tributarias
            SET estado_id = '0',
                motivo_eliminacion = @motivo,
                operador_act = @operador,
                estacion_act = @estacion,
                fecha_act = GETDATE()
            WHERE codigo = @codigo AND id_multa = @idMulta;

            COMMIT TRANSACTION;
            SELECT '1' AS resultado, 'SE ELIMINO LA MULTA CON EXITO' AS mensaje;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SELECT '0' AS resultado, ERROR_MESSAGE() AS mensaje;
          END CATCH
        END
      `;

      const result = await this.db.queryWithParams<SpRow>(script, {
        codigo: dto.codigo,
        idMulta: dto.idMulta,
        motivo: dto.motivo,
        operador: dto.operador,
        estacion: dto.estacion,
      });
      const first = result.recordset?.[0] as SpRow | undefined;
      if (!first || str(first.resultado) !== '1') {
        return {
          success: false,
          error: str(first?.mensaje) || 'No se pudo eliminar la multa',
        };
      }
      return { success: true, message: str(first.mensaje) };
    } catch (error) {
      this.logger.error(
        `[MultaTributaria] eliminar error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, error: 'Error al eliminar la multa' };
    }
  }
}
