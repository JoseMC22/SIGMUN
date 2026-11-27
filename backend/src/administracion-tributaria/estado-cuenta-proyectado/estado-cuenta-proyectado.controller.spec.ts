import { BadRequestException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EstadoCuentaProyectadoController } from './estado-cuenta-proyectado.controller';
import { EstadoCuentaProyectadoDetalleService } from './estado-cuenta-proyectado-detalle.service';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';
import { EstadoCuentaProyectadoSearchResponse } from './estado-cuenta-proyectado.types';

describe('EstadoCuentaProyectadoController', () => {
  let controller: EstadoCuentaProyectadoController;
  const search = jest.fn();
  const expectedDto = {
    tipoBusqueda: 'C',
    codigo: '0000123',
    criterioNombre: '',
    criterioPaterno: '',
    criterioMaterno: '',
    criterioRazon: '',
    documento: '',
    page: 1,
    pageSize: 20,
  };

  const emptyPage: EstadoCuentaProyectadoSearchResponse = {
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };

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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstadoCuentaProyectadoController],
      providers: [
        { provide: EstadoCuentaProyectadoService, useValue: { search } },
        { provide: EstadoCuentaProyectadoDetalleService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EstadoCuentaProyectadoController>(
      EstadoCuentaProyectadoController,
    );
  });

  describe('POST /administracion-tributaria/estado-cuenta-proyectado/contribuyentes', () => {
    it('returns the paginated response from the service', async () => {
      search.mockResolvedValue(emptyPage);

      const result = await controller.search({ codigo: '123' });

      expect(result).toEqual(emptyPage);
      expect(search).toHaveBeenCalledWith(expectedDto);
    });

    it('uppercases text filters and coerces page/pageSize at the boundary', async () => {
      search.mockResolvedValue(emptyPage);

      await controller.search({
        tipoBusqueda: 'N',
        codigo: ' 123 ',
        criterioNombre: ' juan ',
        criterioPaterno: ' perez ',
        criterioMaterno: ' lopez ',
        criterioRazon: ' empresa sa ',
        documento: ' 12345678 ',
        page: '3',
        pageSize: '20',
      });

      expect(search).toHaveBeenCalledWith({
        tipoBusqueda: 'N',
        codigo: '0000123',
        criterioNombre: 'JUAN',
        criterioPaterno: 'PEREZ',
        criterioMaterno: 'LOPEZ',
        criterioRazon: 'EMPRESA SA',
        documento: '12345678',
        page: 3,
        pageSize: 20,
      });
    });

    it('pads codigo to seven digits and rejects non-digit codigo', async () => {
      search.mockResolvedValue(emptyPage);

      await expectCanonicalValidationError(
        () => controller.search({ codigo: 'ABC' }),
        'codigo',
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('rejects a codigo longer than seven digits', async () => {
      await expectCanonicalValidationError(
        () => controller.search({ codigo: '12345678' }),
        'codigo',
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('caps documento at eleven digits with the canonical envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.search({ tipoBusqueda: 'D', documento: '123456789012' }),
        'documento',
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('rejects non-digit documento with the canonical envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.search({ tipoBusqueda: 'D', documento: '12-A' }),
        'documento',
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('rejects an unsupported tipoBusqueda with the canonical envelope', async () => {
      await expectCanonicalValidationError(
        () => controller.search({ tipoBusqueda: 'X' }),
        'tipoBusqueda',
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('rejects a zero page before it reaches the SP', async () => {
      await expectCanonicalValidationError(() => controller.search({ page: 0 }), 'page');
      expect(search).not.toHaveBeenCalled();
    });

    it('never forwards untyped unknown fields to the service', async () => {
      search.mockResolvedValue(emptyPage);

      await controller.search({ codigo: '123', sql: 'DROP TABLE x' });

      expect(search).toHaveBeenCalledWith(expectedDto);
    });
  });

  it('declares JwtAuthGuard on the controller', () => {
    const guards: unknown[] = Reflect.getMetadata(
      GUARDS_METADATA,
      EstadoCuentaProyectadoController,
    );

    expect(guards).toContain(JwtAuthGuard);
  });

  it('declares the namespaced route and POST method', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, EstadoCuentaProyectadoController),
    ).toBe('administracion-tributaria/estado-cuenta-proyectado');
    expect(Reflect.getMetadata(PATH_METADATA, controller.search)).toBe(
      'contribuyentes',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller.search)).toBe(
      RequestMethod.POST,
    );
  });
});
