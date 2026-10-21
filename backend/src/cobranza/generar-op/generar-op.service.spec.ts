import { Test, TestingModule } from '@nestjs/testing';
import { GenerarOpService } from './generar-op.service';
import { DatabaseService } from '../../database/database.service';
import { ProcesarOpDto } from './dto/procesar-op.dto';
import { GenerarOpDto } from './dto/generar-op.dto';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryWithParams: jest.Mock<any, any>;

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
    queryWithParams = jest.fn().mockResolvedValue({ recordset: [] });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerarOpService,
        { provide: DatabaseService, useValue: { executeProcedure, queryWithParams } },
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

  /**
   * Generación real: primero re-proyecta server-side y después llama al SP de
   * generación con el id_valor de la whitelist. El SP de generación escribe en
   * Mvalores/Dvalores/DatosOP y no es idempotente, así que las guardas
   * (proyección vacía, correlativo faltante) son parte del contrato.
   */
  describe('generar', () => {
    const filasProyeccion = [
      {
        idrecibo: '1',
        num_ingr: '0001234',
        imp_insol: 100,
        imp_reaj: 10,
        mora: 5,
        costo_emis: 2.5,
      },
      {
        idrecibo: '2',
        num_ingr: '0001235',
        imp_insol: 50,
        imp_reaj: 1,
        mora: 0.5,
        costo_emis: 2.5,
      },
    ];

    const dtoGenerar = (over: Record<string, unknown> = {}) =>
      ({
        Codigo: '0279126',
        Tipo: 'vehicular',
        Annos: '"2026"',
        Tipos: '',
        Perio: '"01","02"',
        Predio: '',
        Estado: '0',
        FechaProyectada: '21/10/2026',
        Nombre: 'JUAN PEREZ',
        DirFiscal: 'CALLE 1',
        NumDoc: '12345678',
        IdUsuario: 'WEB',
        Operador: '',
        Estacion: 'WEB',
        ...over,
      }) as unknown as GenerarOpDto;

    /** Respuesta por nombre de SP: proyección con filas, generación con OP. */
    const mockSp = (
      generacion: { recordset: unknown[] } = {
        recordset: [{ id_valor: '11', num_val: '0000123', ano_val: '2026' }],
      },
    ) => {
      executeProcedure.mockImplementation((sp: string) =>
        Promise.resolve(
          sp.includes('Genera') ? generacion : { recordset: filasProyeccion },
        ),
      );
      queryWithParams.mockResolvedValue({ recordset: [{ nros_gen: '123' }] });
    };

    const spGeneracionLlamado = () =>
      executeProcedure.mock.calls.find((call) =>
        String(call[0]).includes('Genera'),
      );

    it('usa sp_Genera_OPVEH e id_valor 11 para vehicular', async () => {
      mockSp();

      const result = await service.generar(dtoGenerar());

      expect(result.success).toBe(true);
      expect(spGeneracionLlamado()?.[0]).toBe('Rentas.sp_Genera_OPVEH');
      expect(spGeneracionLlamado()?.[1]).toMatchObject({ id_valor: '11' });
    });

    it('usa sp_Genera_OP e id_valor 01 para predial', async () => {
      mockSp({ recordset: [{ id_valor: '01', num_val: '1', ano_val: '2026' }] });

      await service.generar(dtoGenerar({ Tipo: 'predial' }));

      expect(spGeneracionLlamado()?.[0]).toBe('Rentas.sp_Genera_OP');
      expect(spGeneracionLlamado()?.[1]).toMatchObject({ id_valor: '01' });
    });

    it('no llama al SP de generación si la proyección viene vacía', async () => {
      executeProcedure.mockResolvedValue({ recordset: [] });

      const result = await service.generar(dtoGenerar());

      expect(result.success).toBe(false);
      expect(result.error).toContain('No hay recibos pendientes');
      expect(spGeneracionLlamado()).toBeUndefined();
    });

    it('no llama al SP de generación si falta el correlativo del año', async () => {
      mockSp();
      queryWithParams.mockResolvedValue({ recordset: [] });

      const result = await service.generar(dtoGenerar());

      expect(result.success).toBe(false);
      expect(result.error).toContain('No hay correlativo configurado');
      expect(spGeneracionLlamado()).toBeUndefined();
    });

    it('devuelve num_val y ano_val del recordset y suma los importes', async () => {
      mockSp();

      const result = await service.generar(dtoGenerar());

      expect(result).toMatchObject({
        success: true,
        id_valor: '11',
        num_val: '0000123',
        ano_val: '2026',
        total: 2,
        imp_insol: 150,
        imp_reaj: 11,
        mora: 5.5,
        costo_emis: 5,
      });
    });

    it('devuelve error si el recordset de generación viene vacío', async () => {
      mockSp({ recordset: [] });

      const result = await service.generar(dtoGenerar());

      expect(result.success).toBe(false);
      expect(result.error).toContain('no devolvió número de OP');
      expect(result.num_val).toBeUndefined();
    });
  });
});
