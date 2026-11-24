import 'reflect-metadata';
import * as os from 'os';
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ValoresUnitariosController } from './valores-unitarios.controller';
import { ValoresUnitariosService } from './valores-unitarios.service';

/** Captura un rechazo sin volver a ejecutar el handler bajo prueba. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un rechazo');
}

describe('ValoresUnitariosController', () => {
  let controller: ValoresUnitariosController;

  const mockService = {
    years: jest.fn(),
    search: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    upsertMany: jest.fn(),
  };

  type CreateArgs = Parameters<ValoresUnitariosController['create']>;

  const requestWith = (username: string | undefined): CreateArgs[1] =>
    ({
      user: username === undefined ? undefined : { username },
    }) as unknown as CreateArgs[1];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(os, 'hostname').mockReturnValue('SERVIDOR-01');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValoresUnitariosController],
      providers: [{ provide: ValoresUnitariosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ValoresUnitariosController>(
      ValoresUnitariosController,
    );
  });

  it('aplica JwtAuthGuard a todo el controller', () => {
    const guards: unknown[] =
      Reflect.getMetadata(GUARDS_METADATA, ValoresUnitariosController) ?? [];

    expect(guards).toContain(JwtAuthGuard);
  });

  describe('GET years y GET search', () => {
    it('delega years sin parámetros', async () => {
      mockService.years.mockResolvedValueOnce({ years: ['2027'] });

      await expect(controller.years()).resolves.toEqual({ years: ['2027'] });
      expect(mockService.years).toHaveBeenCalledWith();
    });

    it('parsea anno y region antes de delegar en search', async () => {
      mockService.search.mockResolvedValueOnce({ data: [] });

      await controller.search({ anno: '2027', region: '1' });

      expect(mockService.search).toHaveBeenCalledWith({
        anno: '2027',
        region: '1',
      });
    });

    it('rechaza anno inválido con el envelope canónico de validación', async () => {
      const error = await captureError(controller.search({ anno: '27' }));

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            {
              path: 'anno',
              message: 'El año debe tener 4 dígitos',
            },
          ],
        },
      });
      expect(mockService.search).not.toHaveBeenCalled();
    });
  });

  describe('POST y PUT', () => {
    const body = { region: '1', anno: '2027', codi: 'A1', valor: 123.45 };

    it('crea con datos parseados, operador JWT y estación del servidor', async () => {
      mockService.create.mockResolvedValueOnce({ message: 'ok', row: {} });

      await controller.create(body, requestWith('mvaez'));

      expect(mockService.create).toHaveBeenCalledWith(
        body,
        'mvaez',
        'SERVIDOR-01',
      );
      expect(os.hostname).toHaveBeenCalledTimes(1);
    });

    it('usa el hostname como estación y limita la auditoría a 50 caracteres', async () => {
      mockService.update.mockResolvedValueOnce({ message: 'ok', row: {} });

      await controller.update(body, requestWith('u'.repeat(60)));

      expect(mockService.update).toHaveBeenCalledWith(
        body,
        'u'.repeat(50),
        'SERVIDOR-01',
      );
      expect(os.hostname).toHaveBeenCalledTimes(1);
    });

    it('rechaza body inválido con el envelope canónico', async () => {
      const error = await captureError(
        controller.create(
          { region: '12', anno: '2027', codi: 'A1', valor: 123.45 },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            {
              path: 'region',
              message: 'La región debe tener 1 dígito',
            },
          ],
        },
      });
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('rechaza una categoría fuera de A1..J7 con el envelope canónico', async () => {
      const error = await captureError(
        controller.create(
          { ...body, codi: 'A8' },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            {
              path: 'codi',
              message: 'La categoría debe estar entre A1 y J7',
            },
          ],
        },
      });
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('POST bulk', () => {
    const bulkBody = {
      region: '1',
      anno: '2027',
      items: [{ codi: 'A1', valor: 123.45 }],
    };

    it('parsea el body y delega en upsertMany con operador JWT y estación del servidor', async () => {
      mockService.upsertMany.mockResolvedValueOnce({
        message: 'ok',
        rows: [],
        affected: 0,
      });

      await expect(
        controller.bulk(bulkBody, requestWith('mvaez')),
      ).resolves.toEqual({ message: 'ok', rows: [], affected: 0 });

      expect(mockService.upsertMany).toHaveBeenCalledWith(
        bulkBody,
        'mvaez',
        'SERVIDOR-01',
      );
      expect(os.hostname).toHaveBeenCalledTimes(1);
    });

    it('rechaza códigos repetidos con el envelope canónico', async () => {
      const error = await captureError(
        controller.bulk(
          {
            ...bulkBody,
            items: [
              { codi: 'A1', valor: 1 },
              { codi: 'A1', valor: 2 },
            ],
          },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        message: 'Validation failed',
        details: { errors: [{ path: 'items' }] },
      });
      expect(mockService.upsertMany).not.toHaveBeenCalled();
    });

    it('rechaza un código fuera de A1..J7 con el envelope canónico', async () => {
      const error = await captureError(
        controller.bulk(
          { ...bulkBody, items: [{ codi: 'A8', valor: 1 }] },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        details: { errors: [{ path: 'items.0.codi' }] },
      });
      expect(mockService.upsertMany).not.toHaveBeenCalled();
    });

    it('rechaza un valor fuera de rango con el envelope canónico', async () => {
      const error = await captureError(
        controller.bulk(
          { ...bulkBody, items: [{ codi: 'A1', valor: 100000 }] },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        details: { errors: [{ path: 'items.0.valor' }] },
      });
      expect(mockService.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('DELETE :region/:anno/:codi', () => {
    it('valida la clave natural y delega en remove con operador JWT y estación del servidor', async () => {
      mockService.remove.mockResolvedValueOnce({ message: 'ok' });

      await expect(
        controller.remove(
          { region: '1', anno: '2027', codi: 'A1' },
          requestWith('mvaez'),
        ),
      ).resolves.toEqual({ message: 'ok' });

      expect(mockService.remove).toHaveBeenCalledWith(
        '1',
        '2027',
        'A1',
        'mvaez',
        'SERVIDOR-01',
      );
      expect(os.hostname).toHaveBeenCalledTimes(1);
    });

    it('rechaza una clave inválida con el envelope canónico', async () => {
      const error = await captureError(
        controller.remove(
          { region: '1', anno: '27', codi: 'A1' },
          requestWith('mvaez'),
        ),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'validation_error',
        details: {
          errors: [{ path: 'anno' }],
        },
      });
      expect(mockService.remove).not.toHaveBeenCalled();
    });
  });
});
