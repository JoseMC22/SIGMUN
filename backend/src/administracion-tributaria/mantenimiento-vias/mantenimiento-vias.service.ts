import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import * as dns from 'dns';
import * as os from 'os';
import { DatabaseService } from '../../database/database.service';
import { SearchMantenimientoViasDto } from './dto/search-mantenimiento-vias.dto';
import {
  SpMViaRow,
  SpViaDetail,
  SpTipoVia,
  SpTipoUrbanizacion,
  SpUrbanizacion,
  SpZona,
  SpArancelRow,
  SpArancelDetalle,
  ViasRow,
  PaginatedResponse,
  ViaDetail,
  UrbanizacionRow,
  SpUrbanizacionDetail,
  SpUrbanizacionCRUDResult,
} from './dto/mantenimiento-vias.types';
import { SaveArancelDto } from './dto/save-arancel.dto';
import {
  CreateMantenimientoViaDto,
  UpdateMantenimientoViaDto,
} from './dto/create-mantenimiento-vias.dto';
import {
  CreateUrbanizacionDto,
  UpdateUrbanizacionDto,
} from './dto/create-urbanizacion.dto';

@Injectable()
export class MantenimientoViasService {
  private readonly logger = new Logger(MantenimientoViasService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchMantenimientoViasDto): Promise<PaginatedResponse<ViasRow>> {
    const { cod_via, nom_zona, nom_urba, nombre_via, nestado, page, pageSize } = dto;

    const result = await this.db.executeProcedure<SpMViaRow>(
      '[Rentas].[sp_Mant_Vias]',
      {
        busc: 1,
        cod_via: cod_via || '',
        nom_zona: nom_zona || '',
        nom_urba: nom_urba || '',
        nombre_via: nombre_via || '',
        nestado: nestado || '',
      },
    );

    const allRows = result.recordset ?? [];
    const total = allRows.length;

    // Paginación en memoria
    const start = (page - 1) * pageSize;
    const paginatedRows = allRows.slice(start, start + pageSize);

    const data: ViasRow[] = paginatedRows.map((row: SpMViaRow) => ({
      cod_via: row.cod_via ?? '',
      zona: row.zona ?? '',
      urba: row.urba ?? '',
      nombre_via: row.nombre_via ?? '',
      vcuadra: row.vcuadra ?? '',
      vlado: row.vlado ?? '',
      nestado: row.nestado ?? '',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  /** @busc=3  —  Obtener detalle de una vía por código */
  async findOne(cod_via: string): Promise<ViaDetail> {
    const result = await this.db.executeProcedure<SpViaDetail>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 3, cod_via },
    );

    const rows = result.recordset ?? [];
    if (rows.length === 0) {
      throw new NotFoundException(`Vía con código "${cod_via}" no encontrada`);
    }

    const row = rows[0];
    return {
      cod_via: row.cod_via ?? '',
      id_urba: row.id_urba ?? '',
      tipovia: row.tipovia ?? '',
      vcuadra: row.vcuadra ?? '',
      id_zona: row.id_zona ?? '',
      nombre_via: row.nombre_via ?? '',
      id_tipozona: row.id_tipozona ?? '',
      nestado: row.nestado === '0' ? 0 : 1,
      lado_via: row.lado_via ?? '',
      operador: row.operador ?? '',
      estacion: row.estacion ?? '',
      fech_ing: row.fech_ing ?? '',
    };
  }

  /** @busc=26 — Listar tipos de vía para combo */
  async getTiposVia(): Promise<SpTipoVia[]> {
    const result = await this.db.executeProcedure<SpTipoVia>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 26, cod_via: '', nom_zona: '', nom_urba: '', nombre_via: '', nestado: '' },
    );
    return result.recordset ?? [];
  }

  /** @busc=17 — Listar todas las urbanizaciones (llenado inicial de tabla) */
  async getUrbanizacionesTable(): Promise<UrbanizacionRow[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 17, cod_via: '', nom_zona: '', nom_urba: '', nombre_via: '', nestado: '' },
    );
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        id_urba: String(vals[0] ?? ''),
        tipourb: String(vals[1] ?? ''),
        nombabr: String(vals[2] ?? ''),
        nombre: String(vals[3] ?? ''),
        estado: String(vals[4] ?? ''),
      };
    });
  }

  /** @busc=18 — Buscar urbanizaciones con filtros */
  async searchUrbanizaciones(params: {
    tipo?: string;     // @tipovia
    nombre?: string;   // @nombre_via
    nestado?: string;  // @nestado
  }): Promise<UrbanizacionRow[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mant_Vias]',
      {
        busc: 17,
        tipovia: params.tipo || '',
        nombre_via: (params.nombre || '').toUpperCase(),
        nestado: params.nestado || '',
      },
    );
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        id_urba: String(vals[0] ?? ''),
        tipourb: String(vals[1] ?? ''),
        nombabr: String(vals[2] ?? ''),
        nombre: String(vals[3] ?? ''),
        estado: String(vals[4] ?? ''),
      };
    });
  }

  /** @busc=23 — Listar urbanizaciones para combo (columna calculada sin alias) */
  async getUrbanizaciones(): Promise<SpUrbanizacion[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 23, cod_via: '', nom_zona: '', nom_urba: '', nombre_via: '', nestado: '' },
    );
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row) as string[];
      return {
        id_urba: vals[0] ?? '',
        nombres: vals[1] ?? '',
      };
    });
  }

  /** @busc=20 — Listar tipos de urbanización */
  async getTiposUrbanizacion(): Promise<SpTipoUrbanizacion[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 20, cod_via: '', nom_zona: '', nom_urba: '', nombre_via: '', nestado: '' },
    );
    // @busc=20 devuelve: tipourb, nombre (2 columnas, no 3)
    return (result.recordset ?? []).map((row: any) => {
      const vals = Object.values(row);
      return {
        id: String(vals[0] ?? ''),      // tipourb
        abrev: String(vals[1] ?? ''),   // nombre (sin abrev separada en el SP)
        nombre: String(vals[1] ?? ''),  // nombre
      };
    });
  }

  /** @busc=7 — Listar zonas para combo */
  async getZonas(): Promise<SpZona[]> {
    const result = await this.db.executeProcedure<SpZona>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 7, cod_via: '', nom_zona: '', nom_urba: '', nombre_via: '', nestado: '' },
    );
    return result.recordset ?? [];
  }

  /** @busc=9  —  Listar aranceles de una vía */
  async getAranceles(cod_via: string): Promise<SpArancelRow[]> {
    const result = await this.db.executeProcedure<SpArancelRow>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 9, cod_via },
    );
    return result.recordset ?? [];
  }

  /** @busc=12  —  Obtener detalle de un arancel por id_tbl */
  async getArancelDetalle(cod_via: string, id_tbl: string): Promise<SpArancelDetalle> {
    const result = await this.db.executeProcedure<SpArancelDetalle>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 12, cod_via, id_tbl },
    );
    const rows = result.recordset ?? [];
    if (rows.length === 0) {
      throw new NotFoundException(`Arancel id_tbl "${id_tbl}" no encontrado`);
    }
    return rows[0];
  }

  /** @busc=11 (create) / @busc=13 (update)  —  Guardar arancel */
  async saveArancel(
    dto: SaveArancelDto,
    operador?: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const idTbl = String(dto.id_tbl ?? '');
    const isUpdate = idTbl.length > 0;
    try {
      await this.db.executeProcedure('[Rentas].[sp_Mant_Vias]', {
        busc: isUpdate ? 13 : 11,
        cod_via: dto.cod_via,
        id_tbl: idTbl,
        anno: dto.anno,
        arancel: dto.arancel,
        nestado: dto.nestado,
        operador: operador || dto.operador || '',
        estacion: clientIp || dto.estacion || '',
      });
    } catch (error: any) {
      // SQL Server duplicate key: 2627 (constraint) / 2601 (index)
      if (error?.number === 2627 || error?.number === 2601) {
        throw new ConflictException(
          `Ya existe un arancel registrado para el año ${dto.anno} en esta vía.`,
        );
      }
      throw error;
    }
    return { message: isUpdate ? 'Arancel actualizado correctamente' : 'Arancel registrado correctamente' };
  }

  /** @busc=8  —  Crear nueva vía */
  async create(
    dto: CreateMantenimientoViaDto,
    operador?: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    await this.db.executeProcedure('[Rentas].[sp_Mant_Vias]', {
      busc: 8,
      id_urba: dto.id_urba,
      tipovia: dto.tipovia,
      vcuadra: dto.vcuadra,
      id_zona: dto.id_zona,
      nombre_via: dto.nombre_via,
      id_tipozona: dto.id_tipozona,
      nestado: dto.nestado,
      operador: operador || dto.operador || '',
      estacion: dto.estacion || clientIp || '',
      vlado: dto.vlado,
    });

    return { message: 'Vía registrada correctamente' };
  }

  /** @busc=4  —  Actualizar vía existente */
  async update(
    cod_via: string,
    dto: UpdateMantenimientoViaDto,
    operador?: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    await this.db.executeProcedure('[Rentas].[sp_Mant_Vias]', {
      busc: 4,
      cod_via,
      id_urba: dto.id_urba,
      tipovia: dto.tipovia,
      vcuadra: dto.vcuadra,
      id_zona: dto.id_zona,
      nombre_via: dto.nombre_via,
      id_tipozona: dto.id_tipozona,
      nestado: dto.nestado,
      estacion: dto.estacion || clientIp || '',
      vlado: dto.vlado,
    });

    // El SP @busc=4 no modifica operador ni estacion, así que los actualizamos por separada
    if (operador) {
      await this.db.query(
        'UPDATE Rentas.Mvias SET operador = @operador WHERE cod_via = @cod_via',
        { operador, cod_via },
      );
    }

    // Actualizar estacion con el valor del payload (nombre de la PC del cliente)
    const estacion = dto.estacion || '';
    if (estacion) {
      try {
        await this.db.query(
          'UPDATE Rentas.Mvias SET estacion = @estacion WHERE cod_via = @cod_via',
          { estacion, cod_via },
        );
        console.error('[update] ESTACION_UPDATED:', estacion);
      } catch (err: any) {
        console.error('[update] ESTACION_UPDATE_ERROR:', err?.message ?? err);
      }
    }

    return { message: 'Vía actualizada correctamente' };
  }

  // ── Urbanizaciones CRUD ───────────────────────────────────

  /** @busc=16  —  Crear urbanización */
  async createUrbanizacion(
    dto: CreateUrbanizacionDto,
    operador?: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    // SP @busc=16 espera: @tipovia, @nombre_via, @operador, @estacion
    await this.db.executeProcedure('[Rentas].[sp_Mant_Vias]', {
      busc: 16,
      tipovia: dto.tipourb,
      nombre_via: dto.nombre,
      operador: operador || dto.operador || '',
      estacion: dto.estacion || clientIp || '',
    });

    return { message: 'Urbanización registrada correctamente' };
  }

  /** @busc=21  —  Obtener detalle de urbanización */
  async getUrbanizacion(id_urba: string): Promise<SpUrbanizacionDetail> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_Mant_Vias]',
      { busc: 21, id_urba },
    );

    const rows = result.recordset ?? [];
    if (rows.length === 0) {
      throw new NotFoundException(`Urbanización con id "${id_urba}" no encontrada`);
    }

    // Mapeo por posición — @busc=21 devuelve 7 columnas:
    //   vals[0]=id_urba, vals[1]=tipourb, vals[2]=nombres, vals[3]=nestado,
    //   vals[4]=operador, vals[5]=estacion, vals[6]=fech_ing
    const vals = Object.values(rows[0]) as string[];
    console.error('[getUrbanizacion] RAW vals:', JSON.stringify(vals));
    const rawFechIng = vals[6];
    let fech_ing = '';
    if (rawFechIng) {
      // SQL Server devuelve datetime como string "Thu Jun 25 2026 02:43:30 GMT-0500"
      // Formatear a dd/mm/yyyy hh:mm:ss
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      };
      const match = String(rawFechIng).match(
        /(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+GMT([+-]\d{4})/,
      );
      if (match) {
        // groups: [0]=full, [1]=DayOfWeek, [2]=Month, [3]=Day, [4]=Year, [5]=HH, [6]=MM, [7]=SS, [8]=GMT offset
        const monthStr = match[2];
        const dayNum = parseInt(match[3], 10);
        const yearNum = parseInt(match[4], 10);
        const hhNum = parseInt(match[5], 10);
        const miNum = parseInt(match[6], 10);
        const ssNum = parseInt(match[7], 10);
        const gmtOffset = match[8]; // ej: -0500
        const offsetHours = parseInt(gmtOffset.substring(0, 3), 10); // -5
        const offsetMinutes = parseInt(gmtOffset.substring(0, 1) + gmtOffset.substring(3, 5), 10); // 0
        const totalOffsetMinutes = offsetHours * 60 + offsetMinutes;
        // Convertir a UTC
        const monthIndex = parseInt(months[monthStr] || '01', 10) - 1;
        const utcDate = new Date(Date.UTC(yearNum, monthIndex, dayNum, hhNum, miNum, ssNum));
        utcDate.setMinutes(utcDate.getMinutes() - totalOffsetMinutes);
        const dd = String(utcDate.getUTCDate()).padStart(2, '0');
        const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = utcDate.getUTCFullYear();
        const hhUtc = String(utcDate.getUTCHours()).padStart(2, '0');
        const miUtc = String(utcDate.getUTCMinutes()).padStart(2, '0');
        const ssUtc = String(utcDate.getUTCSeconds()).padStart(2, '0');
        fech_ing = `${dd}/${mm}/${yyyy} ${hhUtc}:${miUtc}:${ssUtc}`;
      } else {
        fech_ing = String(rawFechIng);
      }
    }
    const detail = {
      id_urba: String(vals[0] ?? ''),
      tipourb: String(vals[1] ?? ''),
      nombre: String(vals[2] ?? ''),
      nestado: String(vals[3] ?? ''),
      operador: String(vals[4] ?? ''),
      estacion: String(vals[5] ?? ''),
      fech_ing,
    };
    console.error('[getUrbanizacion] MAPPED:', JSON.stringify(detail));
    return detail;
  }

  /** @busc=22  —  Actualizar urbanización */
  async updateUrbanizacion(
    id_urba: string,
    dto: UpdateUrbanizacionDto,
    operador?: string,
    clientIp?: string,
  ): Promise<{ message: string }> {
    const operadorFinal = operador || dto.operador || '';
    const spParams: Record<string, any> = {
      busc: 22,
      id_urba: id_urba || '',
      tipovia: dto.tipourb || '',
      nombre_via: dto.nombre || '',
      nestado: dto.nestado || '',
      operador: operadorFinal,
    };
    console.error('[updateUrbanizacion] SP_PARAMS:', JSON.stringify(spParams, null, 2));
    console.error('[updateUrbanizacion] CHECK_EMPTY:', {
      id_urba_empty: !spParams.id_urba,
      tipovia_empty: !spParams.tipovia,
      nombre_via_empty: !spParams.nombre_via,
      nestado_empty: !spParams.nestado,
      operador_empty: !spParams.operador,
    });
    await this.db.executeProcedure('[Rentas].[sp_Mant_Vias]', spParams);

    // Actualizar estacion en tabla MCurba con el nombre de la PC del cliente
    const estacion = dto.estacion || '';
    if (estacion) {
      try {
        await this.db.query(
          'UPDATE Rentas.MCurba SET estacion = @estacion WHERE id_urba = @id_urba',
          { estacion, id_urba },
        );
        console.error('[updateUrbanizacion] ESTACION_UPDATED:', estacion);
      } catch (err: any) {
        console.error('[updateUrbanizacion] ESTACION_UPDATE_ERROR:', err?.message ?? err);
      }
    }

    return { message: 'Urbanización actualizada correctamente' };
  }
}
