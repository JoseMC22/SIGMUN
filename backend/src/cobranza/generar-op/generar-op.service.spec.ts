import { Test, TestingModule } from '@nestjs/testing';
import { GenerarOpService } from './generar-op.service';
import { DatabaseService } from '../../database/database.service';
import { ProcesarOpDto } from './dto/procesar-op.dto';

/**
 * Los dos SP de proyección de OP son gemelos: mismos 8 parámetros, mismas
 * columnas de salida y la misma convención de comillas dobles. Solo cambia el
 * filtro de conceptos (predial 02.01 vs vehicular 00.30/25.10), así que el
 * servicio elige el procedimiento según el tributo.
 */
describe('GenerarOpService', () => {
  let service: GenerarOpService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  const dtoBase = (over: Record<string, unknown> = {}) =>
    ({
      Codigo: '0279126',
      Annos: '"2026"',
      Tipos: '',
      Perio: '"01","02"',
      Predio: '',
      Estado: '0',
      FechaProyectada: '21/10/2026',
      ...over,
    }) as unknown as ProcesarOpDto;

  beforeEach(async () => {
    executeProcedure = jest.fn().mockResolvedValue({ recordset: [] });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerarOpService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<GenerarOpService>(GenerarOpService);
  });

  it('usa el SP vehicular cuando el tributo es vehicular', async () => {
    await service.procesar(dtoBase({ Tipo: 'vehicular' }));

    expect(executeProcedure.mock.calls[0][0]).toBe(
      'Caja.sp_EstCta_Rentasopveh_proyectado',
    );
  });

  it('usa el SP predial cuando el tributo es predial', async () => {
    await service.procesar(dtoBase({ Tipo: 'predial' }));

    expect(executeProcedure.mock.calls[0][0]).toBe(
      'Caja.sp_EstCta_Rentasop_proyectado',
    );
  });

  it('cae en predial si el tributo no viene', async () => {
    await service.procesar(dtoBase({ Tipo: undefined }));

    expect(executeProcedure.mock.calls[0][0]).toBe(
      'Caja.sp_EstCta_Rentasop_proyectado',
    );
  });

  // Regresión: el SP inserta @annos y @perio dentro de un in (...) y al final
  // convierte las comillas dobles en literales. Si alguien los "normaliza" a
  // asteriscos o a JSON, el SQL dinámico se rompe.
  it('pasa annos y perio verbatim, sin reescribirlos', async () => {
    await service.procesar(
      dtoBase({ Annos: '"2025","2026"', Perio: '"01","02","03"' }),
    );

    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      annos: '"2025","2026"',
      perio: '"01","02","03"',
    });
  });

  // Regresión: @estado se concatena crudo en el SQL dinámico; vacío produce
  // "estado= and" y el motor responde "Incorrect syntax near the keyword and".
  it('nunca manda estado vacío al SP', async () => {
    await service.procesar(dtoBase({ Estado: '' }));

    expect(executeProcedure.mock.calls[0][1]).toMatchObject({ estado: '0' });
  });
});
