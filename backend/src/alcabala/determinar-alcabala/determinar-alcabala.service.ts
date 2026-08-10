import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import { SearchPredioDto } from './dto/search-predio.dto';
import { CrearAlcabalaDto } from './dto/crear-alcabala.dto';
import {
  SpMContribuyenteRow,
  SpAlcabalasByContribuyenteRow,
  SpDetalleAlcabalaRow,
  SpPredioRow,
  ContribuyenteItem,
  PredioItem,
  AlcabalaItem,
  DetalleAlcabalaItem,
  ContribuyenteSearchResult,
  PredioSearchResult,
  AlcabalasResult,
  DetalleAlcabalaResult,
  CrearAlcabalaResult,
  UitResult,
  TipoCambioResult,
} from './determinar-alcabala.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

// ── Tipo de predio text → SP code (1 Urbano, 2 Rústico) ──

function mapTipoPredToCode(tipoPred: string): string {
  if (!tipoPred) return '';
  const normalized = tipoPred
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.includes('rustic') ? '2' : '1';
}

@Injectable()
export class DeterminarAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_DJALCABALA = 'Alcabala.sp_DJAlcabala';
  private readonly logger = new Logger(DeterminarAlcabalaService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async searchContribuyente(
    dto: SearchContribuyenteDto,
  ): Promise<ContribuyenteSearchResult> {
    const { tipoBusqueda, busqueda, paterno, materno, nombres, page, pageSize } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams: Record<string, string> = {
      codigo: '',
      nombres: '',
      paterno: '',
      materno: '',
      num_doc: '',
      tipo_busqueda: tipoBusqueda,
      razon: '',
      cod_pred: '',
      checkfrac: '0',
    };

    if (tipoBusqueda === 'N') {
      // Nombre: 3 campos separados, siempre se envían al SP
      baseParams.paterno = paterno || '';
      baseParams.materno = materno || '';
      baseParams.nombres = nombres || '';
    } else {
      // C, R, D, P, V: un solo campo
      const fieldMap: Record<string, string> = {
        C: 'codigo',
        R: 'razon',
        D: 'num_doc',
        P: 'direccion',
        V: 'placa',
      };
      const fieldName = fieldMap[tipoBusqueda] || 'codigo';
      if (busqueda) baseParams[fieldName] = busqueda;
    }

    try {
      // First: get total count
      const totalResult = await this.db.executeProcedure<any>(
        this.SP_MCONTRIBUYENTE,
        { ...baseParams, busc: 6 },
      );
      const totalRow = totalResult.recordset?.[0];
      const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

      // Second: get rows with pagination
      const rowsResult = await this.db.executeProcedure<SpMContribuyenteRow>(
        this.SP_MCONTRIBUYENTE,
        { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
      );

      const data: ContribuyenteItem[] = (
        rowsResult.recordset || []
      ).map((row: any) => ({
        codigo: String(col(row, 'codigo') ?? ''),
        paterno: String(col(row, 'paterno') ?? ''),
        materno: String(col(row, 'materno') ?? ''),
        nombres: String(col(row, 'nombres') ?? ''),
        numDoc: String(col(row, 'num_doc') ?? ''),
        direccion: String(col(row, 'DireFis') ?? ''),
        row: Number(col(row, 'ROW') ?? 0),
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
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] searchContribuyente SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al buscar contribuyentes',
      };
    }
  }

  async getAlcabalasByContribuyente(
    codigo: string,
  ): Promise<AlcabalasResult> {
    try {
      const result = await this.db.executeProcedure<SpAlcabalasByContribuyenteRow>(
        this.SP_DJALCABALA,
        {
          buscar: '6',
          codigo: codigo,
        },
      );

      const data: AlcabalaItem[] = (result.recordset || []).map((row: any) => ({
        idAlcabala: Number(col(row, 'id_alcabala') ?? 0),
        fechaRegistro: String(col(row, 'fecharegistro') ?? ''),
        montoAlcabala: Number(col(row, 'monto_alcabala') ?? 0),
        codPred: String(col(row, 'codpred') ?? ''),
        anioPred: String(col(row, 'aniopred') ?? ''),
        codigoVenta: String(col(row, 'codigo_venta') ?? ''),
        estado: String(col(row, 'estado') ?? ''),
      }));

      return {
        success: true,
        data,
      };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] getAlcabalasByContribuyente SP error: ${err}`);
      return {
        success: false,
        data: [],
        error: 'Error al consultar alcabalas del contribuyente',
      };
    }
  }

  async getDetalleAlcabala(
    idAlcabala: number,
  ): Promise<DetalleAlcabalaResult> {
    try {
      const result = await this.db.executeProcedure<SpDetalleAlcabalaRow>(
        this.SP_DJALCABALA,
        {
          buscar: '8',
          id_alcabala: idAlcabala,
        },
      );

      const row = result.recordset?.[0];
      if (!row) {
        return {
          success: false,
          data: null,
          error: 'Alcabala no encontrada',
        };
      }

      // SP returns comma-separated pairs: "comprador,vendedor"
      const split = (val: string): [string, string] => {
        const parts = val.split(',').map((s: string) => s.trim());
        return [parts[0] ?? '', parts[1] ?? ''];
      };

      const [nombresC, nombresV] = split(String(col(row, 'nombres') ?? ''));
      const [documentoC, documentoV] = split(String(col(row, 'documento') ?? ''));
      const [numDocC, numDocV] = split(String(col(row, 'num_doc') ?? ''));
      const [direccC, direccV] = split(String(col(row, 'direcc_fiscal') ?? ''));
      const [distC, distV] = split(String(col(row, 'distrito') ?? ''));
      const [provC, provV] = split(String(col(row, 'provincia') ?? ''));
      const [dptoC, dptoV] = split(String(col(row, 'departamento') ?? ''));

      const data: DetalleAlcabalaItem = {
        codigoCompra: String(col(row, 'codigo_compra') ?? ''),
        anio: String(col(row, 'anio') ?? ''),
        nombres: nombresC,
        documento: documentoC,
        numDoc: numDocC,
        direccFiscal: direccC,
        distrito: distC,
        provincia: provC,
        departamento: dptoC,
        codigoVenta: String(col(row, 'codigo_venta') ?? ''),
        nombres1: nombresV,
        documento1: documentoV,
        numDoc1: numDocV,
        direccFiscal1: direccV,
        distrito1: distV,
        provincia1: provV,
        departamento1: dptoV,
        codPred: String(col(row, 'codpred') ?? ''),
        anioPred: String(col(row, 'aniopred') ?? ''),
        fechaContrato: String(col(row, 'fecha_contrato') ?? ''),
        transferencia: String(col(row, 'transferencia') ?? ''),
        observacion: String(col(row, 'observacion') ?? ''),
        contrato: String(col(row, 'contrato') ?? ''),
        montoAlcabala: Number(col(row, 'monto_alcabala') ?? 0),
        autoavaluo: Number(col(row, 'autoavaluo') ?? 0),
        direccionPredio: String(col(row, 'direccion_predio') ?? ''),
        montoInafecto: Number(col(row, 'monto_inafecto') ?? 0),
        montoAfecto: Number(col(row, 'monto_afecto') ?? 0),
        anexo: String(col(row, 'anexo') ?? ''),
        subAnexo: String(col(row, 'sub_anexo') ?? ''),
        flagCheck: String(col(row, 'flag_check') ?? ''),
        observacionFlag: String(col(row, 'observacion_flag') ?? ''),
        nombre: String(col(row, 'nombre') ?? ''),
        direccion: String(col(row, 'direccion') ?? ''),
        dni: String(col(row, 'dni') ?? ''),
        tipodoc: String(col(row, 'tipodoc') ?? ''),
        usuario: String(col(row, 'usuario') ?? ''),
        estacion: String(col(row, 'estacion') ?? ''),
        fechaIng: String(col(row, 'fecha_ing') ?? ''),
        flagInafecto: String(col(row, 'flag_inafecto') ?? ''),
        tipoPred: String(col(row, 'tipo_pred') ?? ''),
      };

      return {
        success: true,
        data,
      };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] getDetalleAlcabala SP error: ${err}`);
      return {
        success: false,
        data: null,
        error: 'Error al obtener detalle de alcabala',
      };
    }
  }

  async searchPredio(
    dto: SearchPredioDto,
  ): Promise<PredioSearchResult> {
    const { codigo, codPred, anio, tipoBusqueda, page, pageSize } = dto;

    try {
      const result = await this.db.executeProcedure<SpPredioRow>(
        this.SP_DJALCABALA,
        {
          buscar: '3',
          codigo: codigo || '',
          codpred: codPred || '',
          anio: anio || '',
          tipo_busqueda: tipoBusqueda || 'c',
        },
      );

      const rows = result.recordset || [];

      const data: PredioItem[] = rows.map((row: any) => ({
        codigo: String(col(row, 'codigo') ?? ''),
        nombres: String(col(row, 'nombres') ?? ''),
        codPred: String(col(row, 'cod_pred') ?? ''),
        porcenPropiedad: Number(col(row, 'porcen_propiedad') ?? 0),
        numDoc: String(col(row, 'num_doc') ?? ''),
        direccFiscal: String(col(row, 'direcc_fiscal') ?? ''),
        direccionPredio: String(col(row, 'predial') ?? ''),
        anexo: String(col(row, 'anexo') ?? ''),
        subAnexo: String(col(row, 'sub_anexo') ?? ''),
        totalAutoavaluo: Number(col(row, 'total_autoavaluo') ?? 0),
        tipoPred: String(col(row, 'tipo_pred') ?? ''),
        anno: String(col(row, 'anno') ?? ''),
        row: Number(col(row, 'ROW') ?? 0),
      }));

      const total = data.length;
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

      return {
        success: true,
        data,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] searchPredio SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al buscar predios',
      };
    }
  }

  async getUit(anio: string): Promise<UitResult> {
    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_DJALCABALA,
        {
          buscar: '1',
          anio,
        },
      );

      const row = result.recordset?.[0];
      // The SP column name for buscar='1' is not confirmed — read the UIT
      // value defensively: valor_uit → uit → first column of the row.
      const uit = row
        ? String(
            col(row, 'valor_uit') ??
              col(row, 'uit') ??
              Object.values(row)[0] ??
              '',
          )
        : '';

      return { success: true, uit };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] getUit SP error: ${err}`);
      return { success: false, uit: '', error: 'Error al obtener la UIT' };
    }
  }

  async getTipoCambio(fecha: string): Promise<TipoCambioResult> {
    try {
      const partes = fecha.split('-');
      if (partes.length !== 3 || !/^\d{4}$/.test(partes[0])) {
        return { success: false, error: 'Fecha debe ser aaaa-mm-dd' };
      }
      const anio = partes[0];
      const mes = String(parseInt(partes[1], 10) - 1); // SUNAT espera 0-11
      const dia = partes[2];
      const fechaLocal = `${dia}/${partes[1]}/${anio}`;

      const url =
        'https://e-consulta.sunat.gob.pe/cl-at-ittipcam/tcS01Alias/listarTipoCambio';
      const reqBody = JSON.stringify({
        anio,
        mes,
        token: this.config.get<string>('SUNAT_TOKEN') ?? '',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        return {
          success: false,
          error: `Error HTTP ${response.status} al consultar SUNAT`,
        };
      }

      const text = await response.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: `Respuesta inválida de SUNAT: ${text.slice(0, 200)}`,
        };
      }

      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          error: 'No se encontraron tipos de cambio para ese mes',
        };
      }

      const item = data.find(
        (r: any) =>
          String(r.codTipo) === 'V' && String(r.fecPublica) === fechaLocal,
      );

      if (item && item.valTipo != null) {
        return { success: true, venta: String(item.valTipo) };
      }

      const fallback = data.find((r: any) => String(r.codTipo) === 'V');
      if (fallback && fallback.valTipo != null) {
        return { success: true, venta: String(fallback.valTipo) };
      }

      return { success: false, error: 'No se encontró tipo de cambio venta' };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] getTipoCambio SUNAT error: ${err}`);
      return {
        success: false,
        error: `Error al consultar SUNAT: ${err instanceof Error ? err.message : 'desconocido'}`,
      };
    }
  }

  async crear(
    dto: CrearAlcabalaDto,
    usuario: string,
    estacion: string,
  ): Promise<CrearAlcabalaResult> {
    const params: Record<string, any> = {
      buscar: '4',
      codigo_compra: dto.codigoCompra,
      nombre: dto.nombres1,
      num_doc: dto.numDoc,
      codigo_venta: dto.codigoVenta,
      dni: dto.numDoc1,
      direccion: dto.direccFiscal1,
      codpred: dto.codPred,
      aniopred: dto.anioPred,
      tipo_pred: mapTipoPredToCode(dto.tipoPred),
      direccion_predio: dto.direccionPredio,
      fecha_contrato: dto.fechaContrato,
      contrato: dto.contrato,
      transferencia: dto.transferencia,
      observacion: dto.observacion,
      monto_inafecto: dto.montoInafecto,
      monto_afecto: dto.montoAfecto,
      monto_alcabala: dto.montoAlcabala,
      autoavaluo: dto.autoavaluo,
      anexo: dto.anexo,
      sub_anexo: dto.subAnexo,
      usuario,
      estacion,
    };

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_DJALCABALA,
        params,
      );

      const row = result.recordset?.[0];
      if (row) {
        const idAlcabala = Number(col(row, 'id_alcabala') ?? 0);
        return { success: true, idAlcabala };
      }

      return { success: true, idAlcabala: 0 };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] crear SP error: ${err}`);
      return { success: false, error: 'Error al crear alcabala' };
    }
  }
}