import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { z, ZodError } from 'zod';
import {
  SearchConvenioEstadoDto,
  SearchConvenioEstadoSchema,
  CreateConvenioEstadoDto,
  CreateConvenioEstadoSchema,
  UpdateConvenioEstadoDto,
  UpdateConvenioEstadoSchema,
  SpConvenioEstadoRow,
  ConvenioEstado,
  PaginatedResponse,
} from './convenio-estado.types';

function mapRowToEntity(row: SpConvenioEstadoRow): ConvenioEstado {
  // `estado` (char(1)) es la PK lógica de Rentas.estado_convenio.
  // El SP no devuelve id/codigo separados: usamos `estado` como id y codigo.
  const estadoStr = String(row.estado);
  const nestado = String(row.nestado);
  return {
    id: estadoStr,
    codigo: estadoStr,
    descripcion: row.descripcion,
    activo: nestado === '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

@Injectable()
export class ConvenioEstadoService {
  private readonly logger = new Logger(ConvenioEstadoService.name);

  constructor(private readonly db: DatabaseService) {}

  // SP: [Rentas].[CondicionConvenio] sobre la tabla Rentas.estado_convenio
  // `estado` (char(1)) es la PK lógica (= el código del estado).
  // @busc mapping REAL (ver definición del SP):
  //   1 = evalua (params fraccionamiento)  — NO usado aquí
  //   2 = datos_convenio (string fijo)     — NO usado aquí
  //   3 = estado_convenio (SELECT estado, descripcion, nestado)  → LISTAR/BUSCAR
  //   4 = Insertar_estado_convenio (INSERT estado, descripcion)  → CREAR
  //   5 = Actualizar_estado_convenio (UPDATE descripcion, nestado WHERE estado) → EDITAR
  //   6 = Eliminar_estado_convenio (UPDATE nestado='2' WHERE estado) → ELIMINAR (soft)
  // El SP SOLO declara @busc,@codigo,@param,@estado,@descripcion,@nestado.
  // Para crear, el NUEVO código va en @estado (no en @codigo).

  async search(dto: SearchConvenioEstadoDto): Promise<PaginatedResponse<ConvenioEstado>> {
    let parsed: SearchConvenioEstadoDto;
    try {
      parsed = SearchConvenioEstadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages || 'Parámetros inválidos.' });
      }
      throw new BadRequestException({ success: false, error: 'Parámetros de búsqueda inválidos.' });
    }

    const { codigo, descripcion, activo, page, pageSize } = parsed;

    // Listar/buscar (busc=3). @estado filtra la columna estado (código); '' = todos.
    const rowsResult = await this.db.executeProcedure<any>(
      '[Rentas].[CondicionConvenio]',
      {
        busc: 3,
        codigo: '',
        param: 1,
        estado: codigo || '',
        descripcion: descripcion || '',
        nestado: activo || '',
      },
    );

    let data: ConvenioEstado[] = (rowsResult.recordset || []).map(mapRowToEntity);

    // Filtro de activo en memoria (el SP busc=3 no filtra por nestado).
    if (activo === '1') data = data.filter((d) => d.activo);
    else if (activo === '0') data = data.filter((d) => !d.activo);

    this.logger.log(`Filas obtenidas: ${data.length}`);

    const total = data.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    return { data, total, page, pageSize, totalPages };
  }

  // El SP no tiene "get by codigo" aislado. Filtramos busc=3 por @estado.
  private async findByEstado(estado: string): Promise<ConvenioEstado | null> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[CondicionConvenio]',
      { busc: 3, codigo: '', param: 1, estado, descripcion: '', nestado: '' },
    );
    const row = result.recordset?.[0];
    return row ? mapRowToEntity(row) : null;
  }

  async findById(id: string): Promise<ConvenioEstado | null> {
    return this.findByEstado(id);
  }

  async findByCodigo(codigo: string): Promise<ConvenioEstado | null> {
    return this.findByEstado(codigo);
  }

  async create(
    dto: CreateConvenioEstadoDto,
    operador: string,
    clientIp: string,
  ): Promise<{ success: true; message: string }> {
    let parsed: CreateConvenioEstadoDto;
    try {
      parsed = CreateConvenioEstadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages });
      }
      throw new BadRequestException({ success: false, error: 'Datos de entrada inválidos.' });
    }

    // Check uniqueness (busc=3 filtrando por estado)
    const existing = await this.findByCodigo(parsed.codigo);
    if (existing) {
      throw new ConflictException({ success: false, error: 'El código ya existe.' });
    }

    // Insertar (busc=4). El NUEVO código va en @estado.
    await this.db.executeProcedure(
      '[Rentas].[CondicionConvenio]',
      {
        busc: 4,
        codigo: '',
        param: 1,
        estado: parsed.codigo,
        descripcion: parsed.descripcion,
        nestado: parsed.activo,
      },
    );

    return { success: true, message: 'Estado de convenio creado correctamente.' };
  }

  async update(
    id: string,
    dto: UpdateConvenioEstadoDto,
    operador: string,
    clientIp: string,
  ): Promise<{ success: true; message: string }> {
    let parsed: UpdateConvenioEstadoDto;
    try {
      parsed = UpdateConvenioEstadoSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({ success: false, error: messages });
      }
      throw new BadRequestException({ success: false, error: 'Datos de entrada inválidos.' });
    }

    // Verify exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException({ success: false, error: 'Estado de convenio no encontrado.' });
    }

    // If codigo is being changed, check uniqueness
    if (parsed.codigo && parsed.codigo !== existing.codigo) {
      const conflict = await this.findByCodigo(parsed.codigo);
      if (conflict) {
        throw new ConflictException({ success: false, error: 'El nuevo código ya existe.' });
      }
    }

    // Editar (busc=5). @estado = código a editar (id). nestado = flag activo.
    // Nota: el SP actualiza descripcion y nestado WHERE estado=@estado.
    // El código (estado) NO se puede cambiar con busc=5; si cambia, lo dejamos igual.
    await this.db.executeProcedure(
      '[Rentas].[CondicionConvenio]',
      {
        busc: 5,
        codigo: '',
        param: 1,
        estado: id,
        descripcion: parsed.descripcion ?? existing.descripcion,
        nestado: parsed.activo ?? (existing.activo ? '1' : '0'),
      },
    );

    return { success: true, message: 'Estado de convenio actualizado correctamente.' };
  }

  async delete(id: string): Promise<{ success: true; message: string }> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException({ success: false, error: 'Estado de convenio no encontrado.' });
    }

    // Eliminar (busc=6) = soft delete: nestado='2' WHERE estado=@estado.
    await this.db.executeProcedure(
      '[Rentas].[CondicionConvenio]',
      { busc: 6, codigo: '', param: 1, estado: id, descripcion: '', nestado: '' },
    );

    return { success: true, message: 'Estado de convenio eliminado correctamente.' };
  }
}