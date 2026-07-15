import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CrearUitDto } from './dto/crear-uit.dto';
import { EditarUitDto } from './dto/editar-uit.dto';
import { UitResponse } from './dto/uit-response.dto';

@Injectable()
export class MantenimientoService {
  private readonly logger = new Logger(MantenimientoService.name);
  private static readonly SP_UIT = '[Rentas].[sp_uit]';

  constructor(private readonly db: DatabaseService) {}

  async obtenerAnnos(): Promise<{ annos: number[] }> {
    try {
      const result = await this.db.executeProcedure<{ anno: number }>(
        MantenimientoService.SP_UIT,
        { busc: 1 },
      );

      const annos = (result.recordset ?? []).map((r) => r.anno);
      return { annos };
    } catch (error) {
      this.logger.error('Error al obtener años UIT', error);
      throw error;
    }
  }

  async buscarPorAnno(anno: number): Promise<{ data: UitResponse[] }> {
    try {
      const result = await this.db.executeProcedure<UitResponse>(
        MantenimientoService.SP_UIT,
        { busc: 2, anno: String(anno) },
      );

      const records = result.recordset ?? [];

      if (records.length === 0) {
        throw new NotFoundException(
          `No se encontraron registros para el año ${anno}`,
        );
      }

      return { data: records };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al buscar UIT para año ${anno}`, error);
      throw error;
    }
  }

  async crear(dto: CrearUitDto): Promise<{ message: string; anno: number }> {
    try {
      const existente = await this.db.executeProcedure<UitResponse>(
        MantenimientoService.SP_UIT,
        { busc: 2, anno: String(dto.anno) },
      );

      if ((existente.recordset ?? []).length > 0) {
        throw new ConflictException(`El año ${dto.anno} ya existe`);
      }

      this.logger.log(`[CREAR] Creando UIT ${dto.anno} — params: ${JSON.stringify({ tipo: '02.01', valor_uit: dto.valor_uit, imp_min: dto.imp_minimo, imp_max: dto.imp_maximo, costo_emision: dto.costo_emis, costo_adicional: dto.costo_adic, estado: dto.estado })}`);

      await this.db.executeProcedure(MantenimientoService.SP_UIT, {
        busc: 5,
        anno: String(dto.anno),
        tipo: '02.01',
        valor_uit: dto.valor_uit,
        imp_min: dto.imp_minimo,
        imp_max: dto.imp_maximo,
        costo_emision: dto.costo_emis,
        costo_adicional: dto.costo_adic,
        estado: dto.estado,
      });

      this.logger.log(`[CREAR] UIT ${dto.anno} creada exitosamente`);

      return {
        message: 'Registro creado exitosamente',
        anno: dto.anno,
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`Error al crear UIT para año ${dto.anno}`, error);
      throw error;
    }
  }

  async editar(dto: EditarUitDto): Promise<{ message: string; anno: number }> {
    try {
      const existente = await this.db.executeProcedure<UitResponse>(
        MantenimientoService.SP_UIT,
        { busc: 2, anno: String(dto.anno) },
      );

      if ((existente.recordset ?? []).length === 0) {
        throw new NotFoundException(`No se encontró el año ${dto.anno}`);
      }

      const tipoActual = existente.recordset[0].tipo;

      await this.db.executeProcedure(MantenimientoService.SP_UIT, {
        busc: 6,
        anno: String(dto.anno),
        tipo: tipoActual,
        valor_uit: dto.valor_uit,
        imp_min: dto.imp_minimo,
        imp_max: dto.imp_maximo,
        costo_emision: dto.costo_emis,
        costo_adicional: dto.costo_adic,
        estado: dto.estado,
      });

      return {
        message: 'Registro actualizado exitosamente',
        anno: dto.anno,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al editar UIT para año ${dto.anno}`, error);
      throw error;
    }
  }

  async eliminar(anno: number): Promise<{ message: string }> {
    try {
      await this.db.executeProcedure(
        MantenimientoService.SP_UIT,
        { busc: 7, anno: String(anno), estado: '0' },
      );

      return { message: 'Registro desactivado exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al eliminar UIT año ${anno}`, error);
      throw error;
    }
  }
}
