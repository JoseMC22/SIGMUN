import { Injectable, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import {
  CertificadoDetalle,
  CertificadoRow,
  CollectionResponse,
  ContribuyenteHeader,
  ContribuyenteRow,
  DetalleRow,
  ItemResponse,
  SearchContribuyenteResult,
  TipoDeudaRow,
  TipoPeriodoRow,
} from './certificado-no-adeudo.types';
import {
  CertificadosDto,
  ContribuyenteDto,
  DetalleCertificadoDto,
  PrediosDto,
} from './dto/certificado.dto';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpRow = Record<string, any>;

/** Normaliza valores del SP a texto; ignora valores no serializables. */
const str = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();
  return '';
};

const num = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Convierte las fechas de los SP a ISO. Acepta `dd/mm/yyyy` y
 * `dd/mm/yyyy hh:mm:ss`; devuelve una cadena vacia si el valor no es valido.
 */
function toIsoDateTime(value: unknown): string {
  if (typeof value !== 'string') return '';

  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return '';
  }

  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (match[4] === undefined) return date;

  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59) return '';

  return `${date}T${match[4]}:${match[5]}:${match[6]}`;
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

function mapCertificado(row: SpRow): CertificadoRow {
  return {
    idTbl: str(row.ID_TBL),
    idRecibo: str(row.IDRECIBO),
    codigo: str(row.CODIGO),
    certNro: str(row.CERT_NRO),
    certAnio: str(row.CERT_ANIO),
    tipoDeuda: str(row.TIPO_DEUDA),
    tipoDeudaDescripcion: str(row.des_tipo_deuda),
    tipoPeriodo: str(row.TIPO_PERIODO),
    tipoPeriodoDescripcion: str(row.des_tipo_periodo),
    observacion: str(row.OBSERVACION),
    cantImpresion: str(row.CANT_IMPRESION),
    impresion: str(row.IMPRESION),
    fechaImpresion: toIsoDateTime(row.FEC_IMPRESION),
    estado: str(row.ESTADO),
    estImprime: str(row.est_imprime),
    numCertif: str(row.numcertif),
  };
}

function mapCertificadoDetalle(row: SpRow): CertificadoDetalle {
  return {
    idTbl: str(row.ID_TBL),
    idRecibo: str(row.IDRECIBO),
    codigo: str(row.CODIGO),
    certNro: str(row.CERT_NRO),
    certAnio: str(row.CERT_ANIO),
    tipoDeuda: str(row.TIPO_DEUDA),
    tipoPeriodo: str(row.TIPO_PERIODO),
    observacion: str(row.OBSERVACION),
    cantImpresion: str(row.CANT_IMPRESION),
    impresion: str(row.IMPRESION),
    fechaImpresion: toIsoDateTime(row.FEC_IMPRESION),
    estado: str(row.ESTADO),
    anioDeuda: str(row.anio_deuda),
    numCertif: str(row.numcertif),
  };
}

function mapContribuyenteHeader(row: SpRow): ContribuyenteHeader {
  return {
    codigo: str(row.codigo),
    nombres: str(row.nombres),
    numDoc: str(row.num_doc),
    direccion: str(row.direccion),
  };
}

function mapTipoDeuda(row: SpRow): TipoDeudaRow {
  return {
    tipo: str(row.tipo),
    detalle: str(row.detalle),
  };
}

function mapTipoPeriodo(row: SpRow): TipoPeriodoRow {
  return {
    idTbl: num(row.id_tbl),
    detalle: str(row.detalle),
  };
}

function mapDetalle(row: SpRow, esVehiculo: boolean): DetalleRow {
  if (esVehiculo) {
    return {
      codigo: str(row.codigo),
      anio: str(row.Anio),
      codPred: str(row.num_placa),
      anexo: str(row.anexo),
      subAnexo: str(row.subanexo),
      anexos: '',
      direccion: '',
      detalles: [
        str(row.nombre_categoria),
        str(row.nombre_marca),
        str(row.nombre_modelo),
      ].join(' | '),
      tipo: '',
      areaTerreno: 0,
      porcenPropiedad: 0,
      totalAutoavaluo: 0,
      chekeado: 'chekeado' in row ? str(row.chekeado) : '0',
    };
  }

  return {
    codigo: str(row.codigo),
    anio: str(row.anno),
    codPred: str(row.cod_pred),
    anexo: str(row.anexo),
    subAnexo: str(row.sub_anexo),
    anexos: str(row.anexos),
    direccion: str(row.direccion),
    detalles: '',
    tipo: str(row.tipo),
    areaTerreno: num(row.area_terreno),
    porcenPropiedad: num(row.porcen_propiedad),
    totalAutoavaluo: num(row.total_autoavaluo),
    chekeado: 'chekeado' in row ? str(row.chekeado) : '0',
  };
}

@Injectable()
export class CertificadoNoAdeudoService {
  private readonly logger = new Logger(CertificadoNoAdeudoService.name);

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
        const data = (exportResult.recordset ?? []).map((row) =>
          mapContribuyente(row as SpRow),
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
        {
          ...baseParams,
          busc: 5,
          inicio: String(inicio),
          final: String(final),
        },
      );
      const data = (rowsResult.recordset ?? []).map((row) =>
        mapContribuyente(row as SpRow),
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
        `[CertificadoNoAdeudo] search error: ${error instanceof Error ? error.message : String(error)}`,
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

  /** Certificados registrados del contribuyente. */
  async getCertificados(
    dto: CertificadosDto,
  ): Promise<CollectionResponse<CertificadoRow>> {
    try {
      const result = await this.db.executeProcedure(
        'Certificado.sp_Certificado',
        { busc: 1, codigo: dto.codigo },
        { codigo: mssql.Char(7) },
      );
      const data = (result.recordset ?? []).map((row) =>
        mapCertificado(row as SpRow),
      );

      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getCertificados error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar los certificados',
      };
    }
  }

  /** Detalle de un certificado por numero y anio. */
  async getDetalle(
    dto: DetalleCertificadoDto,
  ): Promise<ItemResponse<CertificadoDetalle>> {
    try {
      const result = await this.db.executeProcedure(
        'Certificado.sp_Certificado',
        { busc: 2, cert_nro: dto.certNro, cert_anio: dto.certAnio },
        { cert_anio: mssql.Char(4) },
      );
      const row = result.recordset?.[0] as SpRow | undefined;
      if (!row) {
        return { success: false, error: 'Certificado no encontrado' };
      }

      return { success: true, data: mapCertificadoDetalle(row) };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getDetalle error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar el detalle del certificado',
      };
    }
  }

  /** Cabecera del contribuyente (store_caja_framework @msquery=17). */
  async getContribuyente(
    dto: ContribuyenteDto,
  ): Promise<ItemResponse<ContribuyenteHeader>> {
    try {
      const result = await this.db.executeProcedure(
        'dbo.store_caja_framework',
        { msquery: 17, codigo: dto.codigo },
        { codigo: mssql.VarChar(7) },
      );
      const row = result.recordset?.[0] as SpRow | undefined;
      if (!row) {
        return { success: false, error: 'Contribuyente no encontrado' };
      }

      return { success: true, data: mapContribuyenteHeader(row) };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getContribuyente error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar el contribuyente',
      };
    }
  }

  /** Tipos de deuda habilitados para el certificado. */
  async getTiposDeuda(): Promise<CollectionResponse<TipoDeudaRow>> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 1 },
      );
      const data = (result.recordset ?? []).map((row) =>
        mapTipoDeuda(row as SpRow),
      );

      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getTiposDeuda error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar los tipos de deuda',
      };
    }
  }

  /** Periodos habilitados para el certificado. */
  async getTiposPeriodo(): Promise<CollectionResponse<TipoPeriodoRow>> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 2 },
      );
      const data = (result.recordset ?? []).map((row) =>
        mapTipoPeriodo(row as SpRow),
      );

      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getTiposPeriodo error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar los tipos de periodo',
      };
    }
  }

  /** Anios tributarios disponibles, desde el anio actual hasta 1992. */
  getAniosDeuda(): string[] {
    const anioActual = new Date().getFullYear();
    const anios: string[] = [];
    for (let anio = anioActual; anio >= 1992; anio -= 1) {
      anios.push(String(anio));
    }
    return anios;
  }

  /** Predios o vehiculos disponibles para el contribuyente y anio. */
  async getPredios(dto: PrediosDto): Promise<CollectionResponse<DetalleRow>> {
    const esVehiculo = dto.tipoDeuda === '00.30';
    const esEdicion = dto.idTbl !== undefined;

    try {
      const result = esEdicion
        ? await this.db.executeProcedure(
            'Certificado.sp_Certificado',
            {
              busc: esVehiculo ? 4 : 3,
              codigo: dto.codigo,
              anno: dto.anio,
              id_tbl: dto.idTbl,
            },
            {
              codigo: mssql.VarChar(7),
              anno: mssql.Char(4),
              id_tbl: mssql.Int,
            },
          )
        : await this.db.executeProcedure(
            'Rentas.sp_Multatributaria',
            {
              busc: esVehiculo ? 5 : 2,
              codigo: dto.codigo,
              anno: dto.anio,
            },
            { codigo: mssql.VarChar(7), anno: mssql.Char(4) },
          );

      const data = (result.recordset ?? []).map((row) =>
        mapDetalle(row as SpRow, esVehiculo),
      );

      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[CertificadoNoAdeudo] getPredios error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: 'Error al consultar los predios del contribuyente',
      };
    }
  }
}
