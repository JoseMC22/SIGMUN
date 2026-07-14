import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchCartasRequerimientoDto } from './dto/search-cartas-requerimiento.dto';
import {
  CartasRequerimientoRow,
  ContribuyenteInfo,
  CartaRequerimientoItem,
  PaginatedResponse,
  TAAnioOption,
  MotivoOption,
  CartaReqPredio,
  Fiscalizador,
  CartaById,
} from './cartas-requerimiento.types';

// ── Pure pagination helper ──

export function calculatePaginationParams(page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  return { inicio: String(inicio), final: String(final) };
}

// ── Service ──

@Injectable()
export class CartasRequerimientoService {
  private readonly SP_CONTRIBUYENTE = 'SP_FISCA_CONTRIBUYENTE';
  private readonly SP_CARTA_REQ = 'SP_FISCA_CARTA_REQ';
  private readonly SP_T_ANIO = 'SP_FISCA_T_ANIO';
  private readonly SP_MOTIVO = 'SP_FISCA_MOTIVO';
  private readonly SP_FISCALIZADORES = 'SP_FISCA_FISCALIZADORES';
  private readonly logger = new Logger(CartasRequerimientoService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchCartasRequerimientoDto): Promise<PaginatedResponse<CartasRequerimientoRow>> {
    const { searchType, searchValue, page, pageSize } = dto;
    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Build filter params based on searchType
    const codigo = searchType === 'codigo' ? searchValue : '';
    const nomCompletoContrib = searchType === 'nombre' ? searchValue : '';

    // Total count (@mquery='11' — returns single row with count value)
    const totalResult = await this.db.executeProcedure<any>(
      this.SP_CONTRIBUYENTE,
      { mquery: '11', codigo, nomCompletoContrib },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    this.logger.log(`[CartasRequerimiento] count raw: ${JSON.stringify(totalRow)}, total=${total}, page=${page}, pageSize=${pageSize}, totalPages=${Math.ceil(total / pageSize)}`);

    // Paginated rows (@mquery='10')
    const rowsResult = await this.db.executeProcedure<any>(
      this.SP_CONTRIBUYENTE,
      { mquery: '10', codigo, nomCompletoContrib, inicio, final },
    );

    const data = (rowsResult.recordset || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      contribuyente: row.contribuyente ?? '',
      direccionFiscal: row.direccionFiscal ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getContribuyente(codigo: string): Promise<ContribuyenteInfo | null> {
    const result = await this.db.executeProcedure<any>(
      this.SP_CONTRIBUYENTE,
      { mquery: '12', codigo },
    );
    const row = result.recordset?.[0];
    if (!row) return null;
    return {
      codigo: row.codigo ?? '',
      nombreCompleto: [row.nombres, row.paterno, row.materno]
        .filter(Boolean)
        .join(' '),
    };
  }

  async searchCartas(
    codigo: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<CartaRequerimientoItem>> {
    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Total count (@mquery='5')
    const totalResult = await this.db.executeProcedure<any>(
      this.SP_CARTA_REQ,
      { mquery: '5', codContrib: codigo },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    // Paginated data (@mquery='4')
    const rowsResult = await this.db.executeProcedure<any>(
      this.SP_CARTA_REQ,
      { mquery: '4', codContrib: codigo, inicio, final },
    );

    const data = (rowsResult.recordset || []).map((row: any) => ({
      idCarta: row.idCarta ?? 0,
      nroCarta: row.nroCarta ?? '',
      anio: row.anio ?? '',
      dia: row.dia ?? '',
      mes: row.mes ?? '',
      year: row.ye ?? '',
      detalle: row.detalle ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getTAAnio(): Promise<TAAnioOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_T_ANIO, { mquery: '7' });
    return (result.recordset || []).map((row: any) => {
      const anio = row.anio ?? row.id ?? '';
      return { value: String(anio), label: String(anio) };
    });
  }

  async getMotivo(): Promise<MotivoOption[]> {
    const result = await this.db.executeProcedure<any>(this.SP_MOTIVO, { mquery: '7' });
    return (result.recordset || []).map((row: any) => ({
      value: String(row.idMotivo ?? ''),
      label: String(row.detalle ?? ''),
    }));
  }

  async getCartaReqPredios(codigo: string, anno: string, idCarta?: number): Promise<CartaReqPredio[]> {
    const params: any = { mquery: '10', codigo, anno };
    if (idCarta) params.idCarta = String(idCarta);
    const result = await this.db.executeProcedure<any>(this.SP_CARTA_REQ, params);
    return (result.recordset || []).map((row: any) => ({
      codPred: row.cod_pred ?? '',
      anexo: row.anexo ?? '',
      subAnexo: row.sub_anexo ?? '',
      dirPredio: row.dirPredio ?? '',
      confirmado: row.confirmado ?? 0,
      nuevaDir: row.nueva_dir ?? 0,
    }));
  }

  async getCartaById(idCarta: number): Promise<CartaById | null> {
    const result = await this.db.executeProcedure<any>(
      this.SP_CARTA_REQ,
      { mquery: '6', idCarta: String(idCarta) },
    );
    const row = result.recordset?.[0];
    if (!row) return null;

    // Build date from fi_dia, fi_mes, fi_anio columns
    let fechaEmision = '';
    const dia = row.fi_dia;
    const mes = row.fi_mes;
    const anioFecha = row.fi_anio;
    if (dia && mes && anioFecha) {
      const dd = String(dia).padStart(2, '0');
      const mm = String(mes).padStart(2, '0');
      fechaEmision = `${anioFecha}-${mm}-${dd}`;
    }

    const contribuyente = [row.nombres, row.paterno, row.materno]
      .filter(Boolean)
      .join(' ');

    return {
      idCarta: row.idCarta ?? 0,
      nroCarta: row.nroCarta ?? '',
      anio: row.anio ?? '',
      codigo: row.codigo ?? '',
      contribuyente,
      fechaEmision,
      horaInspec: row.horaInspec ?? '',
      idMotivo: String(row.idMotivo ?? ''),
      anioDesde: String(row.anioDesde ?? ''),
      anno: String(row.anio ?? ''),
    };
  }

  async getFiscalizadores(idCarta?: number): Promise<Fiscalizador[]> {
    if (idCarta) {
      // Edit mode: SP_FISCA_CARTA_REQ @mquery=11 returns fiscalizadores with seleccionado flag
      const result = await this.db.executeProcedure<any>(
        this.SP_CARTA_REQ,
        { mquery: '11', idCarta: String(idCarta) },
      );
      return (result.recordset || []).map((row: any) => ({
        codigo: row.id_usuario ?? '',
        nombre: row.nombres ?? '',
        seleccionado: row.seleccionado ?? 0,
      }));
    }
    // Create mode: SP_FISCA_FISCALIZADORES @mquery=6 returns all fiscalizadores
    const result = await this.db.executeProcedure<any>(this.SP_FISCALIZADORES, { mquery: '6' });
    return (result.recordset || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      nombre: row.fiscalizador ?? '',
    }));
  }
}
