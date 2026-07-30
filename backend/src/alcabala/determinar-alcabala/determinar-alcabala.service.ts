import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import {
  SpMContribuyenteRow,
  SpAlcabalasByContribuyenteRow,
  SpDetalleAlcabalaRow,
  ContribuyenteItem,
  AlcabalaItem,
  DetalleAlcabalaItem,
  ContribuyenteSearchResult,
  AlcabalasResult,
  DetalleAlcabalaResult,
} from './determinar-alcabala.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

@Injectable()
export class DeterminarAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly SP_DJALCABALA = 'Alcabala.sp_DJAlcabala';
  private readonly logger = new Logger(DeterminarAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

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
}