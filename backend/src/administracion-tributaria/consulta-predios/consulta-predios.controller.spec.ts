import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaPrediosController } from './consulta-predios.controller';
import { ConsultaPrediosService } from './consulta-predios.service';
import { ConsultaPrediosSearchResponse } from './consulta-predios.types';

describe('ConsultaPrediosController', () => {
  let controller: ConsultaPrediosController;
  const search = jest.fn();

  const emptyPage: ConsultaPrediosSearchResponse = {
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultaPrediosController],
      providers: [{ provide: ConsultaPrediosService, useValue: { search } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConsultaPrediosController>(ConsultaPrediosController);
  });

  describe('POST /administracion-tributaria/consulta-predios/search', () => {
    it('returns the paginated response from the service', async () => {
      search.mockResolvedValue(emptyPage);

      const result = await controller.search({ codigo: '0000123' });

      expect(result).toEqual(emptyPage);
      expect(search).toHaveBeenCalledWith({
        codigo: '0000123',
        codPred: '',
        anno: '',
        codVia: '',
        urbBus: '',
        nro: '',
        dpto: '',
        mza: '',
        lte: '',
        sublote: '',
        page: 1,
        pageSize: 20,
      });
    });

    it('applies coercion, defaults and codigo padding at the boundary', async () => {
      search.mockResolvedValue(emptyPage);

      await controller.search({
        codigo: ' 123 ',
        anno: 2026,
        page: '3',
        pageSize: '20',
      });

      expect(search).toHaveBeenCalledWith({
        codigo: '0000123',
        codPred: '',
        anno: '2026',
        codVia: '',
        urbBus: '',
        nro: '',
        dpto: '',
        mza: '',
        lte: '',
        sublote: '',
        page: 3,
        pageSize: 20,
      });
    });

    it('leaves a non-numeric codigo without padding', async () => {
      search.mockResolvedValue(emptyPage);

      await controller.search({ codigo: 'ABC' });

      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'ABC' }),
      );
    });

    it('responds with the canonical envelope and HTTP 400 on invalid input', async () => {
      const error = await controller.search({ page: 0 }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      const exception = error as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect(exception.getResponse()).toEqual({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            expect.objectContaining({
              path: 'page',
              message: expect.any(String),
            }),
          ],
        },
      });
      expect(search).not.toHaveBeenCalled();
    });
  });

  it('declares JwtAuthGuard on the controller', () => {
    const guards: unknown[] = Reflect.getMetadata(
      GUARDS_METADATA,
      ConsultaPrediosController,
    );

    expect(guards).toContain(JwtAuthGuard);
  });
});
