import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchInfraccionDto } from './dto/search-infraccion.dto';
import {
  InfraccionRow,
  PaginatedResponse,
} from './dto/listado-de-infracciones.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InfraccionRow {
  return {
    id: String(row.indice ?? row.idtramplac ?? '').trim(),
    placa: String(row.codplac ?? '').trim(),
    propietario: String(row.cnomprop ?? '').trim(),
    conductor: String(row.cnomcond ?? '').trim(),
    tipoVehiculo: String(row.desvehi ?? '').trim(),
    codigoInfraccion: `${String(row.numapap ?? '').trim()}-${String(row.talonario ?? '').trim()}-${String(row.numnpap ?? '').trim()}`,
    numeroInfraccion: String(row.numnpap ?? '').trim(),
    codigo: String(row.codigocond ?? '').trim(),
    estadoImpresion: String(row.filtro ?? '').trim(),
    estImpresion1: String(row.filtro1 ?? '').trim(),
    codigoInfra: String(row.codinfr ?? '').trim(),
    fecha: String(row.fecha ?? '').trim(),
    monto: String(row.valpape ?? '').trim(),
    estado: String(row.descrip ?? '').trim(),
    edt: String(row.edt ?? '').trim(),
    imp: String(row.imp ?? '').trim(),
    gnr: String(row.gnr ?? '').trim(),
    cmb: String(row.cmb ?? '').trim(),
    codigoPropietario: String(row.codigoProp ?? '').trim(),
    idRecibo: String(row.idrecibo ?? '').trim(),
    tipo: String(row.tipo ?? '').trim(),
    tipoRec: String(row.tipo_rec ?? '').trim(),
  };
}

@Injectable()
export class ListadoDeInfraccionesService {
  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchInfraccionDto,
  ): Promise<PaginatedResponse<InfraccionRow>> {
    const spParams = {
      placa: dto.placa ?? '',
      propie: dto.propietario ?? '',
      infrac: dto.infrac ?? dto.codigoInfraccion ?? '',
      infracanio: dto.anioInfraccion ?? '',
      conduc: dto.conductor ?? '',
      dniconduc: dto.dniConductor ?? '',
    };

    // Query 1: Count
    const countResult = await this.db.executeProcedure(
      'papeleta.consultainfractor',
      { msquery: '1', ...spParams },
    );

    // The SP may return the count under different column names
    const countRow = countResult.recordset[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = countRow ? Number(Object.values(countRow as any)[0] ?? 0) : 0;

    // Query 2: Data with pagination
    const start = (dto.page - 1) * dto.pageSize + 1;
    const end = dto.page * dto.pageSize;

    const dataResult = await this.db.executeProcedure(
      'papeleta.consultainfractor',
      { msquery: '2', ...spParams, start, end },
    );

    const data: InfraccionRow[] = dataResult.recordset.map(mapRow);

    const totalPages = total > 0 ? Math.ceil(total / dto.pageSize) : 0;

    return { data, total, page: dto.page, pageSize: dto.pageSize, totalPages };
  }
}
