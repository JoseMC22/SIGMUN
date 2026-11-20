import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyentesProyectadosDto } from './dto/search-contribuyentes-proyectado.dto';
import {
  ContribuyenteProyectadoRow,
  EstadoCuentaProyectadoSearchResponse,
  SpContribuyenteProyectadoRow,
} from './estado-cuenta-proyectado.types';

const SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';

/**
 * Domain key → actual SP column name from the @busc=5 SELECT (SP lines 900-905).
 * `DireFis` is the alias of `dbo.getDireccion(a.codigo)` and `num_doc` is the
 * legacy "documento" cell. Mapping by name is mandatory; positional arrays
 * from the legacy PHP client must never be treated as named recordsets.
 */
export const SP_FIELD_BY_KEY: Readonly<Record<string, string>> = {
  codigo: 'codigo',
  nombres: 'nombres',
  paterno: 'paterno',
  materno: 'materno',
  documento: 'num_doc',
  direccion: 'DireFis',
};

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Reads one cell from the named recordset by column name. A key without a
 * mapping is an explicit error: it must never be silenced as an empty cell.
 */
function readSpField(row: SpContribuyenteProyectadoRow, key: string): unknown {
  const field = SP_FIELD_BY_KEY[key];
  if (field === undefined) {
    throw new Error(
      `estado-cuenta-proyectado: no SP column mapping for key "${key}"`,
    );
  }
  return row[field];
}

/** Name-based mapping of the @busc=5 SELECT, verified against the SP source. */
export function mapContribuyenteProyectadoRow(
  row: SpContribuyenteProyectadoRow,
): ContribuyenteProyectadoRow {
  const cells = row ?? {};
  return {
    codigo: toText(readSpField(cells, 'codigo')),
    // The SP already prefixes 'SUC. ' in `paterno` when applicable.
    nombres: [
      readSpField(cells, 'nombres'),
      readSpField(cells, 'paterno'),
      readSpField(cells, 'materno'),
    ]
      .map(toText)
      .join(' '),
    documento: toText(readSpField(cells, 'documento')),
    direccion: toText(readSpField(cells, 'direccion')),
  };
}

/**
 * Legacy count call (MantcontriproyecController.php:304-309): only the three
 * legacy criterion values are sent. The SP defaults @tipo_busqueda to '', so
 * this deliberately mirrors the legacy shape instead of inventing a new one.
 */
function buildCountParams(
  dto: SearchContribuyentesProyectadosDto,
): Record<string, unknown> {
  return {
    busc: 6,
    codigo: dto.tipoBusqueda === 'C' ? dto.codigo : '',
    nombres: dto.tipoBusqueda === 'N' ? dto.criterioNombre : '',
    num_doc:
      dto.tipoBusqueda === 'D'
        ? dto.documento
        : dto.tipoBusqueda === 'R'
          ? dto.criterioRazon
          : '',
  };
}

/** Legacy rows call (MantcontriproyecController.php:313-322), order preserved. */
function buildRowsParams(
  dto: SearchContribuyentesProyectadosDto,
  inicio: number,
  final: number,
): Record<string, unknown> {
  return {
    busc: 5,
    codigo: dto.codigo,
    nombres: dto.criterioNombre,
    paterno: dto.criterioPaterno,
    materno: dto.criterioMaterno,
    razon: dto.criterioRazon,
    num_doc: dto.documento,
    tipo_busqueda: dto.tipoBusqueda,
    inicio,
    final,
  };
}

@Injectable()
export class EstadoCuentaProyectadoService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * `@busc=6` returns the total under the `''` key of the first row, while
   * `@busc=5` returns the paginated rows as named objects. Every value is
   * bound as a named parameter and never concatenated into SQL.
   */
  async search(
    dto: SearchContribuyentesProyectadosDto,
  ): Promise<EstadoCuentaProyectadoSearchResponse> {
    const inicio = (dto.page - 1) * dto.pageSize + 1;
    const final = inicio + dto.pageSize - 1;

    const totalResult = await this.db.executeProcedure<SpContribuyenteProyectadoRow>(
      SP_MCONTRIBUYENTE,
      buildCountParams(dto),
    );
    const total = toNumber(totalResult.recordset?.[0]?.['']);

    const rowsResult = await this.db.executeProcedure<SpContribuyenteProyectadoRow>(
      SP_MCONTRIBUYENTE,
      buildRowsParams(dto, inicio, final),
    );

    const data = (rowsResult.recordset ?? []).map((row) =>
      mapContribuyenteProyectadoRow(row),
    );
    const totalPages = total > 0 ? Math.ceil(total / dto.pageSize) : 0;

    return { data, total, page: dto.page, pageSize: dto.pageSize, totalPages };
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
