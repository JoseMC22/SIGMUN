import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaPrediosController } from './consulta-predios.controller';
import { ConsultaPrediosService } from './consulta-predios.service';
import {
  ConsultaPrediosExportResponse,
  ConsultaPrediosSearchResponse,
} from './consulta-predios.types';

describe('ConsultaPrediosController', () => {
  let controller: ConsultaPrediosController;
  const search = jest.fn();
  const exportPredios = jest.fn();

  const emptyPage: ConsultaPrediosSearchResponse = {
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
      controllers: [ConsultaPrediosController],
      providers: [
        {
          provide: ConsultaPrediosService,
          useValue: { search, exportPredios },
        },
      ],
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
        anno: String(new Date().getFullYear()),
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
        codVia: 'av central',
        urbBus: 'lima sur',
        dpto: 'lima',
        mza: 'a1',
        lte: 'b2',
        sublote: 'c3',
      });

      expect(search).toHaveBeenCalledWith({
        codigo: '0000123',
        codPred: '',
        anno: '2026',
        codVia: 'AV CENTRAL',
        urbBus: 'LIMA SUR',
        nro: '',
        dpto: 'LIMA',
        mza: 'A1',
        lte: 'B2',
        sublote: 'C3',
        page: 3,
        pageSize: 20,
      });
    });

    it.each(['codigo', 'codPred', 'anno'])(
      'rejects non-numeric %s with the canonical validation envelope',
      async (field) => {
        await expectCanonicalValidationError(
          () => controller.search({ [field]: 'ABC' }),
          field,
        );
        expect(search).not.toHaveBeenCalled();
      },
    );

    it('rejects an SQL-shaped anno before it reaches the SP', async () => {
      await expectCanonicalValidationError(
        () => controller.search({ anno: '2026); DROP TABLE Rentas.Mco;--' }),
        'anno',
      );
      expect(search).not.toHaveBeenCalled();
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

  describe('POST /administracion-tributaria/consulta-predios/export', () => {
    const emptyExport: ConsultaPrediosExportResponse = {
      title: '',
      mostrarPisos: false,
      columns: [],
      rows: [],
    };

    const uppercaseFilters = {
      codVia: 'AV CENTRAL',
      urbBus: 'LIMA SUR',
      dpto: 'LIMA',
      mza: 'A1',
      lte: 'B2',
      sublote: 'C3',
    };

    const expectedExportDto = {
      codigo: '0000123',
      codPred: '',
      anno: '2026',
      ...uppercaseFilters,
      nro: '',
      mostrarPisos: false,
    };

    const typedFilters = {
      codVia: 'av central',
      urbBus: 'lima sur',
      dpto: 'lima',
      mza: 'a1',
      lte: 'b2',
      sublote: 'c3',
    };

    it('returns the export data and defaults mostrarPisos to false', async () => {
      exportPredios.mockResolvedValue(emptyExport);

      const result = await controller.export({
        codigo: ' 123 ',
        anno: 2026,
        ...typedFilters,
      });

      expect(result).toEqual(emptyExport);
      expect(exportPredios).toHaveBeenCalledWith(expectedExportDto);
    });

    it('forwards mostrarPisos true to the service', async () => {
      exportPredios.mockResolvedValue(emptyExport);

      await controller.export({ mostrarPisos: true, ...typedFilters });

      expect(exportPredios).toHaveBeenCalledWith({
        ...expectedExportDto,
        codigo: '',
        anno: String(new Date().getFullYear()),
        mostrarPisos: true,
      });
    });

    it.each(['codigo', 'codPred'])(
      'rejects non-numeric %s with the canonical validation envelope',
      async (field) => {
        await expectCanonicalValidationError(
          () => controller.export({ [field]: '12-A' }),
          field,
        );
        expect(exportPredios).not.toHaveBeenCalled();
      },
    );

    it('responds with the canonical envelope and HTTP 400 on invalid input', async () => {
      const error = await controller
        .export({ mostrarPisos: 'not-a-boolean' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      const exception = error as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect(exception.getResponse()).toEqual({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            expect.objectContaining({
              path: 'mostrarPisos',
              message: expect.any(String),
            }),
          ],
        },
      });
      expect(exportPredios).not.toHaveBeenCalled();
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
