import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import { SearchPredioDto, DEFAULT_TIPO_BUSQUEDA } from './dto/search-predio.dto';
import { CrearAlcabalaDto } from './dto/crear-alcabala.dto';
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
  CrearAlcabalaResult,
  BajaAlcabalaResult,
  SpPredioRow,
  PredioItem,
  PredioSearchResult,
} from './determinar-alcabala.types';
import { BajaAlcabalaDto } from './dto/baja-alcabala.dto';

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
  private readonly BUSCAR_PREDIOS = '3';
  private readonly BUSCAR_BAJA = '9';
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

  async searchPredios(dto: SearchPredioDto): Promise<PredioSearchResult> {
    const { codigo, anio, codPred, tipoBusqueda, nombres, paterno, materno, numDoc, razon } = dto;

    // Guard: @anio (year of the contract date) is required — do not hit the SP with an empty year.
    if (!anio || !anio.trim()) {
      return {
        success: false,
        data: [],
        error: 'El año del contrato (@anio) es obligatorio para buscar predios',
      };
    }

    try {
      const result = await this.db.executeProcedure<SpPredioRow>(
        this.SP_DJALCABALA,
        {
          buscar: this.BUSCAR_PREDIOS,
          codigo: codigo || '',
          anio: anio || '',
          codpred: codPred || '',
          nombres: nombres || '',
          paterno: paterno || '',
          materno: materno || '',
          num_doc: numDoc || '',
          razon: razon || '',
          tipo_busqueda: tipoBusqueda || DEFAULT_TIPO_BUSQUEDA,
        },
      );

      const data: PredioItem[] = (result.recordset || []).map((row: any) => ({
        codigo: String(col(row, 'codigo') ?? ''),
        nombres: String(col(row, 'nombres') ?? ''),
        codPred: String(col(row, 'cod_pred') ?? ''),
        anexo: String(col(row, 'anexo') ?? ''),
        subAnexo: String(col(row, 'sub_anexo') ?? ''),
        porcenPropiedad: String(col(row, 'porcen_propiedad') ?? ''),
        predial: String(col(row, 'predial') ?? ''),
        totalAutoavaluo: String(col(row, 'total_autoavaluo') ?? ''),
        tipoPred: String(col(row, 'tipo_pred') ?? ''),
        anno: String(col(row, 'anno') ?? ''),
        valTerreno: String(col(row, 'Val_Terreno') ?? ''),
      }));

      return { success: true, data };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] searchPredios SP error: ${err}`);
      return {
        success: false,
        data: [],
        error: 'Error al buscar predios del contribuyente',
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
        idRecibo: String(col(row, 'idrecibo') ?? ''),
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
        porcTransferencia: Number(col(row, 'porc_transfiere') ?? 0),
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

  async crear(
    dto: CrearAlcabalaDto,
    usuario: string,
    estacion: string,
  ): Promise<CrearAlcabalaResult> {
    const params: Record<string, any> = {
      buscar: '4',
      codigo_compra: dto.codigoCompra,
      nombres: dto.nombres,
      num_doc: dto.numDoc,
      // Nota: sp_DJAlcabala NO declara @direcc_fiscal/@direcc_fiscal1/@nombres1/@num_doc1;
      // las direcciones/nombres del comprador y vendedor se resuelven dentro del SP
      // via dbo.getDireccion/Rentas.getNombres a partir de @codigo_compra / @codigo_venta.
      codigo_venta: dto.codigoVenta,
      codpred: dto.codPred,
      aniopred: dto.anioPred,
      tipo_pred: dto.tipoPred,
      direccion_predio: dto.direccionPredio,
      // fecha como string ISO "YYYY-MM-DD": el SP la castea como date sin zona horaria.
      // new Date() introduciría un off-by-one en hosts con UTC negativo (corrompería @anio)
      fecha_contrato: dto.fechaContrato || '1900-01-01',
      contrato: dto.contrato,
      // transferencia es texto libre (puede traer separador de miles "100,000");
      // valor no numérico se envía como 0 (sin conversión silenciosa a 0 de inputs formateados)
      transferencia:
        Number(String(dto.transferencia ?? '').replace(/,/g, '').trim()) || 0,
      porc_transfiere: Number(dto.porcTransferencia) || 0,
      observacion: dto.observacion,
      monto_inafecto: dto.montoInafecto,
      monto_afecto: dto.montoAfecto,
      monto_alcabala: dto.montoAlcabala,
      autoavaluo: dto.autoavaluo,
      tasa_impuesto: 3, // 3% de alcabala (regla de negocio: montoAlcabala = montoAfecto × 3%)
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

  async darDeBaja(
    dto: BajaAlcabalaDto,
    usuario: string,
    estacion: string,
  ): Promise<BajaAlcabalaResult> {
    let idrecibo = dto.idrecibo;

    // When no receipt id was supplied, resolve it (and its estado) from the DJAlcabala row.
    if (!idrecibo) {
      try {
        const res = await this.db.queryWithParams<{ idrecibo: string; estado?: string }>(
          'SELECT idrecibo, estado FROM Alcabala.DJAlcabala WHERE id_alcabala = @id',
          { id: dto.idAlcabala },
        );
        const row = res.recordset?.[0];
        if (!row) {
          return {
            success: false,
            error: 'No se pudo resolver el idrecibo de la alcabala para la baja',
          };
        }
        idrecibo = Number(col(row, 'idrecibo') ?? 0);

        // Business rule: only ACTIVO (estado = '1') alcabalas can be deregistered.
        const estado = col(row, 'estado');
        if (Number(estado) !== 1) {
          return {
            success: false,
            error: 'Solo se puede dar de baja una alcabala en estado Activo.',
          };
        }
      } catch (err) {
        this.logger.error(
          `[DeterminarAlcabala] darDeBaja lookup error: ${err}`,
        );
        return {
          success: false,
          error: 'Error al resolver el recibo de la alcabala',
        };
      }

      if (!idrecibo) {
        return {
          success: false,
          error: 'No se pudo resolver el idrecibo de la alcabala para la baja',
        };
      }
    }

    const params: Record<string, any> = {
      buscar: this.BUSCAR_BAJA,
      codigo: dto.codigo,
      id_alcabala: dto.idAlcabala,
      idrecibo,
      observacion: dto.observacion,
      usuario,
      estacion,
    };

    try {
      await this.db.executeProcedure(this.SP_DJALCABALA, params);
      return { success: true };
    } catch (err) {
      this.logger.error(`[DeterminarAlcabala] darDeBaja SP error: ${err}`);
      return { success: false, error: 'Error al dar de baja la alcabala' };
    }
  }
}