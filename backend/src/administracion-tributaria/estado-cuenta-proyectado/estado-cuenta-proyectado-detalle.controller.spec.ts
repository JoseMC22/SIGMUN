import { BadRequestException, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EstadoCuentaProyectadoController } from './estado-cuenta-proyectado.controller';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';
import { EstadoCuentaProyectadoDetalleService } from './estado-cuenta-proyectado-detalle.service';

describe('EstadoCuentaProyectadoController — detail endpoints', () => {
  const cabecera = jest.fn();
  const catalogos = jest.fn();
  const recibos = jest.fn();
  const consulta = jest.fn();
  const search = jest.fn();

  let controller: EstadoCuentaProyectadoController;

  async function expectCanonicalValidationError(
    action: () => Promise<unknown>,
    path: string,
  ): Promise<void> {
    const error = await action().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    const exception = error as BadRequestException;
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      code: 'validation_error',
      message: 'Validation failed',
      details: {
        errors: [expect.objectContaining({ path, message: expect.any(String) })],
      },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EstadoCuentaProyectadoController(
      { search } as unknown as EstadoCuentaProyectadoService,
      {
        getCabecera: cabecera,
        getCatalogos: catalogos,
        getRecibos: recibos,
        consulta,
      } as unknown as EstadoCuentaProyectadoDetalleService,
    );
  });

  describe('GET cabecera / catalogos / recibos', () => {
    it('pads a 1-7 digit codigo to seven digits before calling the service', async () => {
      cabecera.mockResolvedValue({ nombre: 'JUAN' });
      catalogos.mockResolvedValue({});
      recibos.mockResolvedValue([]);

      await controller.getCabecera({ codigo: '123' });
      await controller.getCatalogos({ codigo: ' 456 ' });
      await controller.getRecibos({ codigo: '7654321' });

      expect(cabecera).toHaveBeenCalledWith('0000123');
      expect(catalogos).toHaveBeenCalledWith('0000456');
      expect(recibos).toHaveBeenCalledWith('7654321');
    });

    it('returns the service result unchanged', async () => {
      const expected = { codigo: '0000123', nombre: 'JUAN PEREZ' };
      cabecera.mockResolvedValue(expected);

      expect(await controller.getCabecera({ codigo: '0000123' })).toBe(expected);
    });

    it('rejects a non-digit codigo with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.getCabecera({ codigo: 'ABC' }),
        'codigo',
      );
      await expectCanonicalValidationError(
        () => controller.getCatalogos({ codigo: '12-A' }),
        'codigo',
      );
      await expectCanonicalValidationError(
        () => controller.getRecibos({ codigo: '' }),
        'codigo',
      );
      expect(cabecera).not.toHaveBeenCalled();
      expect(catalogos).not.toHaveBeenCalled();
      expect(recibos).not.toHaveBeenCalled();
    });

    it('rejects a codigo longer than seven digits with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.getCabecera({ codigo: '12345678' }),
        'codigo',
      );
      expect(cabecera).not.toHaveBeenCalled();
    });
  });

  describe('POST consulta', () => {
    it('parses the body, pads codigo and applies safe defaults', async () => {
      consulta.mockResolvedValue([]);

      await controller.consulta({ codigo: '123' });

      expect(consulta).toHaveBeenCalledWith({
        codigo: '0000123',
        annos: [],
        tipos: [],
        tiporec: '',
        perio: '',
        predio: '',
        estado: '0',
        fecha_proyectada: '',
      });
    });

    it('keeps array filters as arrays for the service to join before binding', async () => {
      consulta.mockResolvedValue([]);

      await controller.consulta({
        codigo: '123',
        annos: ['2025', '2026'],
        tipos: ['*02.01*', '*00.16*'],
        tiporec: '02.01',
        perio: '202501',
        predio: '001-001',
        estado: '%',
        fecha_proyectada: '17/11/2026',
      });

      expect(consulta).toHaveBeenCalledWith({
        codigo: '0000123',
        annos: ['2025', '2026'],
        tipos: ['*02.01*', '*00.16*'],
        tiporec: '02.01',
        perio: '202501',
        predio: '001-001',
        estado: '%',
        fecha_proyectada: '17/11/2026',
      });
    });

    it('coerces numeric annos values to strings at the boundary', async () => {
      consulta.mockResolvedValue([]);

      await controller.consulta({ codigo: '123', annos: [2025, 2026] });

      expect(consulta.mock.calls[0][0]['annos']).toEqual(['2025', '2026']);
    });

    it('accepts an ISO projection date and leaves SP normalization to the service', async () => {
      consulta.mockResolvedValue([]);

      await controller.consulta({
        codigo: '123',
        fecha_proyectada: '2026-11-18',
      });

      expect(consulta).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_proyectada: '2026-11-18' }),
      );
    });

    it('rejects an impossible DD/MM/YYYY date with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '123', fecha_proyectada: '31/02/2026' }),
        'fecha_proyectada',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('rejects an impossible ISO date with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '123', fecha_proyectada: '2026-02-31' }),
        'fecha_proyectada',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('rejects an unsupported date format with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '123', fecha_proyectada: '18-11-2026' }),
        'fecha_proyectada',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('strips unknown body fields such as a caller-supplied criterio', async () => {
      consulta.mockResolvedValue([]);

      await controller.consulta({
        codigo: '123',
        criterio: '9',
        sql: 'DROP TABLE x',
      });

      expect(consulta.mock.calls[0][0]).not.toHaveProperty('criterio');
      expect(consulta.mock.calls[0][0]).not.toHaveProperty('sql');
    });

    it('rejects an unsupported estado with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '123', estado: '2' }),
        'estado',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('rejects a non-array tipos value with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '123', tipos: '*02.01*' }),
        'tipos',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range codigo with the canonical 400 envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.consulta({ codigo: '12345678' }),
        'codigo',
      );
      expect(consulta).not.toHaveBeenCalled();
    });

    it('returns the detail rows from the service', async () => {
      const expected = [{ idrecibo: '10', total: 105 }];
      consulta.mockResolvedValue(expected);

      expect(await controller.consulta({ codigo: '0000123' })).toBe(expected);
    });
  });

  it('declares JwtAuthGuard on the controller', () => {
    const guards: unknown[] = Reflect.getMetadata(
      GUARDS_METADATA,
      EstadoCuentaProyectadoController,
    );

    expect(guards).toContain(JwtAuthGuard);
  });

  it('declares the namespaced routes and HTTP methods of the detail endpoints', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, EstadoCuentaProyectadoController),
    ).toBe('administracion-tributaria/estado-cuenta-proyectado');

    expect(Reflect.getMetadata(PATH_METADATA, controller.getCabecera)).toBe(
      'cabecera',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller.getCabecera)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, controller.getCatalogos)).toBe(
      'catalogos',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller.getCatalogos)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, controller.getRecibos)).toBe(
      'recibos',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller.getRecibos)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, controller.consulta)).toBe(
      'consulta',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller.consulta)).toBe(
      RequestMethod.POST,
    );
  });
});
