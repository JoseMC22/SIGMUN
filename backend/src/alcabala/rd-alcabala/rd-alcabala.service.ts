import { Injectable, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import { SearchPendientesDto } from './dto/search-pendientes.dto';
import { GenerarRdDto } from './dto/generar-rd.dto';
import {
  SpMContribuyenteSearchRow,
  SpPendienteAlcabalaRow,
  SpImprimeAlcabalaRow,
  ContribuyenteSearchResult,
  ContribuyenteSearchItem,
  PendienteAlcabalaItem,
  PendienteAlcabalaResult,
  GenerarRdResult,
} from './rd-alcabala.types';

@Injectable()
export class RdAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_PENDIENTES = 'Caja.sp_EstCta_Rentasalcabala_proyectado';
  private readonly SP_GENERA_RD = 'Rentas.sp_Genera_RD_ALCABALA';
  private readonly SP_IMPRIME_ALCABALA = 'Rentas.sp_Imprime_alcabala';
  private readonly logger = new Logger(RdAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async searchContribuyente(
    dto: SearchContribuyenteDto,
  ): Promise<ContribuyenteSearchResult> {
    const { tipoBusqueda, codigo, nombres, paterno, materno, razonSocial, numDoc, page, pageSize } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams = {
      codigo: codigo || '',
      nombres: nombres || '',
      paterno: paterno || '',
      materno: materno || '',
      num_doc: numDoc || '',
      tipo_busqueda: tipoBusqueda || '',
      razon: razonSocial || '',
      cod_pred: '',
      checkfrac: '0',
    };

    const totalResult = await this.db.executeProcedure<any>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 6 },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    const rowsResult = await this.db.executeProcedure<SpMContribuyenteSearchRow>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
    );

    const data: ContribuyenteSearchItem[] = (
      rowsResult.recordset || []
    ).map((row) => ({
      codigo: row.codigo ?? '',
      paterno: row.paterno ?? '',
      materno: row.materno ?? '',
      nombres: row.nombres ?? '',
      numDoc: row.num_doc ?? '',
      direccion: row.DireFis ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async searchPendientes(
    dto: SearchPendientesDto,
  ): Promise<PendienteAlcabalaResult> {
    const { codigo, annos, tipos, tiporec, perio, predio, estado, fechaProyectada } = dto;

    const spParams: Record<string, any> = {
      codigo: codigo || '',
      annos: annos || '',
      tipos: tipos || '',
      tiporec: tiporec || '',
      perio: perio || '',
      predio: predio || '',
      estado: estado || '',
      fecha_proyectada: fechaProyectada || '',
    };

    try {
      this.logger.log(`[RdAlcabala] searchPendientes calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<SpPendienteAlcabalaRow>(
        this.SP_PENDIENTES,
        spParams,
      );
      const rawRows = result.recordset || [];
      this.logger.log(`[RdAlcabala] searchPendientes SP returned ${rawRows.length} rows`);

      const data: PendienteAlcabalaItem[] = rawRows.map((row) => {
        const impInsol = Number(row.imp_insol ?? 0);
        const impReaj = Number(row.imp_reaj ?? 0);
        const mora = Number(row.mora ?? 0);
        const costoEmis = Number(row.costo_emis ?? 0);
        const total = impReaj + mora + costoEmis;

        // Devolver TODOS los campos del SP para el @dataxml
        return {
          // Campos de dominio (para la UI)
          tributo: row.tipo_docu ?? '',
          anio: String(row.anno ?? ''),
          predio: String(row.cod_pred ?? ''),
          anexo: String(row.anexo ?? ''),
          subanexo: String(row.sub_anexo ?? ''),
          periodo: String(row.periodo ?? ''),
          impInsol,
          impReaj,
          factorMora: Number(row.fact_mora ?? 0),
          interes: mora,
          costoEmis,
          total,
          estado: String(row.estado ?? ''),
          observacion: String(row.observacion ?? ''),
          idrecibo: String(row.idrecibo ?? ''),
          codigo: String(row.codigo ?? ''),

          // Campos crudos del SP (para @dataxml en generarRD)
          tipo: row.tipo ?? '',
          tipo_docu: row.tipo_docu ?? '',
          num_docu: row.num_docu ?? '',
          tipo_rec: row.tipo_rec ?? '',
          imp_insol: impInsol,
          costo_emis: costoEmis,
          fact_reaj: Number(row.fact_reaj ?? 0),
          imp_reaj: impReaj,
          fact_mora: Number(row.fact_mora ?? 0),
          imp_mora: mora,
          fec_venc: row.fec_venc ?? '',
          num_ingr: row.num_ingr ?? '',
          operador: row.operador ?? '',
          estacion: row.estacion ?? '',
          fech_ing: row.fech_ing ?? '',
          fec_pago: row.fec_pago ?? '',
          des_tipo: row.des_tipo ?? '',
          cod_pred: row.cod_pred ?? '',
          sub_anexo: row.sub_anexo ?? '',
        };
      });

      return {
        success: true,
        data,
        total: data.length,
      };
    } catch (err) {
      this.logger.error(`[RdAlcabala] searchPendientes SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar pendientes de alcabala',
      };
    }
  }

  /**
   * Construye el @dataxml como XML para Caja.fn_Mrecibo(@dataxml)
   * Formato esperado: <row attr="value" ... /> (XQuery con .nodes('//row') y .value('@attr'))
   */
  private buildDataXml(registro: GenerarRdDto['registros'][0]): string {
    const attrs: [string, string][] = [
      ['num_ingr', registro.num_ingr || '0'],
      ['idrecibo', registro.idrecibo || ''],
      ['montotal', registro.montotal || '0'],
      ['codigo', registro.codigo || ''],
      ['anno', registro.anio || ''],
      ['cod_pred', registro.cod_pred || ''],
      ['anexo', registro.anexo || ''],
      ['sub_anexo', registro.sub_anexo || ''],
      ['tipo_rec', registro.tipo_rec || ''],
      ['periodo', registro.periodo || ''],
      ['imp_insol', registro.imp_insol || '0'],
      ['fact_reaj', registro.fact_reaj || '0'],
      ['imp_reaj', registro.imp_reaj || '0'],
      ['fact_mora', registro.fact_mora || '0'],
      ['imp_mora', registro.imp_mora || '0'],
      ['costo_emis', registro.costo_emis || '0'],
      ['observacion', registro.observacion || ''],
      ['operador', registro.operador || ''],
      ['estacion', registro.estacion || ''],
      ['fech_ing', registro.fech_ing || ''],
    ];

    const xmlAttrs = attrs
      .map(([k, v]) => `${k}="${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}"`)
      .join(' ');

    return `<row ${xmlAttrs} />`;
  }

  async generarRD(dto: GenerarRdDto): Promise<GenerarRdResult> {
    const { registros } = dto;

    if (!registros || registros.length === 0) {
      return {
        success: false,
        error: 'Debe seleccionar al menos un registro',
      };
    }

    // Defaults para operador/estacion (tomados del primer registro o valores por defecto)
    const defaultOperador = registros[0]?.operador || 'sistema';
    const defaultEstacion = registros[0]?.estacion || 'web';

    try {
      const results: SpImprimeAlcabalaRow[] = [];

      for (const registro of registros) {
        // === PASO 1: Llamar sp_Genera_RD_ALCABALA para obtener OUTPUT params ===
        const dataXml = this.buildDataXml(registro);

        this.logger.log(`[RdAlcabala] Calling ${this.SP_GENERA_RD} with dataxml length=${dataXml.length}`);
        this.logger.log(`[RdAlcabala] @dataxml value: ${dataXml}`);

        let numVal: string;
        let anoVal: string;

        try {
          const genResult = await this.db.executeProcedure<any>(
            this.SP_GENERA_RD,
            {
              codigo: registro.codigo || '',
              nombre: registro.nombre || '',
              dirfiscal: registro.dirfiscal || '',
              num_doc: registro.num_doc || '',
              dataxml: dataXml,
              fech_proyectado: '',
              operador: registro.operador || defaultOperador,
              estacion: registro.estacion || defaultEstacion,
              id_usuario: registro.operador || defaultOperador,
              num_val: '',
              ano_val: '',
              id_valor: '',
            },
          );

          // El SP devuelve los valores en el recordset (no OUTPUT params)
          this.logger.log(`[RdAlcabala] ${this.SP_GENERA_RD} result keys: recordset=${JSON.stringify(genResult.recordset?.length)}, recordsets=${JSON.stringify(genResult.recordsets?.length)}, output=${JSON.stringify(genResult.output)}, rowsAffected=${JSON.stringify(genResult.rowsAffected)}`);

          // Probar todas las posibles ubicaciones del resultado
          const row = genResult.recordset?.[0]
            ?? genResult.recordsets?.[0]?.[0]
            ?? null;

          this.logger.log(`[RdAlcabala] ${this.SP_GENERA_RD} resolved row: ${JSON.stringify(row)}`);

          if (!row) {
            this.logger.error(`[RdAlcabala] ${this.SP_GENERA_RD} returned no rows for idrecibo=${registro.idrecibo}`);
            continue;
          }

          numVal = String(row.num_val ?? '');
          anoVal = String(row.ano_val ?? '');

          this.logger.log(`[RdAlcabala] ${this.SP_GENERA_RD} result: num_val='${numVal}', ano_val='${anoVal}'`);

          if (!numVal || !anoVal) {
            this.logger.error(`[RdAlcabala] ${this.SP_GENERA_RD} returned empty values for idrecibo=${registro.idrecibo}`);
            continue;
          }
        } catch (err) {
          this.logger.error(`[RdAlcabala] ${this.SP_GENERA_RD} error for idrecibo=${registro.idrecibo}: ${err}`);
          continue; // Skip this registro on error
        }

        // === PASO 2: Llamar sp_Imprime_alcabala con los valores del OUTPUT ===
        const printParams = {
          buscar: 1,
          id_valor: '08',
          num_val: numVal,
          ano_val: anoVal,
        };

        const sqlLog = `exec ${this.SP_IMPRIME_ALCABALA} @buscar=${printParams.buscar},@id_valor='${printParams.id_valor}',@num_val='${printParams.num_val}',@ano_val='${printParams.ano_val}'`;
        this.logger.log(`[RdAlcabala] SP Call: ${sqlLog}`);

        try {
          const printResult = await this.db.executeProcedure<any>(
            this.SP_IMPRIME_ALCABALA,
            printParams,
          );

          this.logger.log(`[RdAlcabala] ${this.SP_IMPRIME_ALCABALA} returned recordset length=${printResult.recordset?.length ?? 0}`);

          const row = printResult.recordset?.[0];
          if (row) {
            this.logger.log(`[RdAlcabala] SP Result: id_valor=${row.id_valor} num_val=${row.num_val} ano_val=${row.ano_val} tributo=${row.tributo} codigo=${row.codigo} nombre=${row.nombre}`);
            results.push({
              id_valor: row.id_valor ?? '',
              num_val: row.num_val ?? '',
              ano_val: row.ano_val ?? '',
              tributo: row.tributo ?? '',
              numerOP: row.numerOP ?? '',
              fec_val: row.fec_val ?? '',
              fecvaln: row.fecvaln ?? '',
              fec_valn: row.fec_valn ?? '',
              codigo: row.codigo ?? '',
              nombre: row.nombre ?? '',
              num_doc: row.num_doc ?? '',
              dirfiscal: row.dirfiscal ?? '',
              idrecibo: Number(row.idrecibo ?? 0),
              anio_fiscal: row.anio_fiscal ?? '',
              valortotal: Number(row.valortotal ?? 0),
              monto_afecto: Number(row.monto_afecto ?? 0),
              monto_inafecto: Number(row.monto_inafecto ?? 0),
              tasa: row.tasa ?? '',
              monto_alcabala: Number(row.monto_alcabala ?? 0),
              mora: Number(row.mora ?? 0),
              total: Number(row.total ?? 0),
              codpred: row.codpred ?? '',
              direccion_predio: row.direccion_predio ?? '',
              fechacontrato: row.fechacontrato ?? '',
              fono: row.fono ?? '',
            });
          }
        } catch (err) {
          this.logger.error(`[RdAlcabala] ${this.SP_IMPRIME_ALCABALA} error for num_val=${numVal}: ${err}`);
        }
      }

      if (results.length === 0) {
        return {
          success: false,
          error: 'No se pudo generar el reporte de RD. Verifique que los registros seleccionados tengan datos válidos.',
        };
      }

      return {
        success: true,
        message: `RD generada exitosamente para ${results.length} registro(s)`,
        data: results,
      };
    } catch (err) {
      this.logger.error(`[RdAlcabala] generarRD error: ${err}`);
      return {
        success: false,
        error: 'Error al generar la RD de Alcabala',
      };
    }
  }
}