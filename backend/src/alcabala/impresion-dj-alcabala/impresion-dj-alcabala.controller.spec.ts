/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { ImpresionDjAlcabalaController } from './impresion-dj-alcabala.controller';
import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';
import { generateOpPdf } from './op-pdf-generator';
import {
  generateDeclaracionPdf,
  loadLogoDataUri,
} from './declaracion-pdf-generator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

jest.mock('./op-pdf-generator', () => ({
  generateOpPdf: jest.fn(),
}));

jest.mock('./declaracion-pdf-generator', () => ({
  generateDeclaracionPdf: jest.fn(),
  loadLogoDataUri: jest.fn(),
}));

const mockGenerateOpPdf = generateOpPdf as jest.Mock;
const mockGenerateDeclaracionPdf = generateDeclaracionPdf as jest.Mock;
const mockLoadLogoDataUri = loadLogoDataUri as jest.Mock;

function mockRes(): any {
  return { set: jest.fn(), end: jest.fn() };
}

describe('ImpresionDjAlcabalaController', () => {
  let controller: ImpresionDjAlcabalaController;
  let service: jest.Mocked<
    Pick<
      ImpresionDjAlcabalaService,
      'resolveOpPrintData' | 'resolveDeclaracionPrintData'
    >
  >;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    service = {
      resolveOpPrintData: jest.fn(),
      resolveDeclaracionPrintData: jest.fn(),
    } as any;
    configService = { get: jest.fn() };
    mockGenerateOpPdf.mockReset();
    mockGenerateDeclaracionPdf.mockReset();
    mockLoadLogoDataUri.mockReset();
    controller = new ImpresionDjAlcabalaController(
      service as unknown as ImpresionDjAlcabalaService,
      configService as any,
    );
  });

  describe('GET op-pdf/:idAlcabala', () => {
    it('should resolve print data, generate the PDF, and stream it with correct headers', async () => {
      const buffer = Buffer.from('%PDF-1.4 fake');
      service.resolveOpPrintData.mockResolvedValue({
        numVal: '0000229',
        anoVal: '2025',
        rows: [],
      });
      mockGenerateOpPdf.mockResolvedValue(buffer);
      const res = mockRes();

      await controller.getOpPdf('11772', res);

      expect(service.resolveOpPrintData).toHaveBeenCalledWith(11772);
      expect(mockGenerateOpPdf).toHaveBeenCalledWith([]);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="op_0000229_2025.pdf"',
        'Content-Length': buffer.length,
      });
      expect(res.end).toHaveBeenCalledWith(buffer);
    });

    it('should propagate service errors without touching the response', async () => {
      service.resolveOpPrintData.mockRejectedValue(new Error('not found'));
      const res = mockRes();

      await expect(controller.getOpPdf('999999', res)).rejects.toThrow(
        'not found',
      );
      expect(res.set).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('should reject with 400 BadRequest and not call the service when idAlcabala is not a number', async () => {
      const res = mockRes();

      await expect(controller.getOpPdf('NaN', res)).rejects.toMatchObject({
        response: { success: false, error: 'ID de alcabala inválido' },
      });
      expect(service.resolveOpPrintData).not.toHaveBeenCalled();
      expect(mockGenerateOpPdf).not.toHaveBeenCalled();
      expect(res.set).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });

  describe('GET declaracion-pdf/:idAlcabala', () => {
    it('streams the PDF inline with correct headers for a valid id', async () => {
      const buffer = Buffer.from('%PDF-1.4 declaracion');
      const row = { codigo_compra: 'C-1' } as any;
      service.resolveDeclaracionPrintData.mockResolvedValue(row);
      mockLoadLogoDataUri.mockResolvedValue('data:image/png;base64,AAA');
      mockGenerateDeclaracionPdf.mockResolvedValue(buffer);
      configService.get.mockReturnValue('/logo.png');
      const res = mockRes();

      await controller.getDeclaracionPdf(
        '11772',
        { user: { username: 'jperez' } } as any,
        res,
      );

      expect(service.resolveDeclaracionPrintData).toHaveBeenCalledWith(11772);
      expect(configService.get).toHaveBeenCalledWith('REPORT_IMG_RUTA');
      expect(mockLoadLogoDataUri).toHaveBeenCalledWith('/logo.png');

      const opts = mockGenerateDeclaracionPdf.mock.calls[0][1];
      expect(mockGenerateDeclaracionPdf).toHaveBeenCalledWith(row, opts);
      expect(opts.usuario).toBe('jperez');
      expect(opts.logoDataUri).toBe('data:image/png;base64,AAA');
      expect(opts.fecha).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);

      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="declaracion_11772.pdf"',
        'Content-Length': buffer.length,
      });
      expect(res.end).toHaveBeenCalledWith(buffer);
    });

    it('rejects with 400 when idAlcabala is not a number', async () => {
      const res = mockRes();

      await expect(
        controller.getDeclaracionPdf('NaN', { user: { username: 'x' } } as any, res),
      ).rejects.toMatchObject({
        response: { success: false, error: 'ID de alcabala inválido' },
      });
      expect(service.resolveDeclaracionPrintData).not.toHaveBeenCalled();
      expect(res.set).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('rejects with 400 when idAlcabala is zero or negative', async () => {
      const res = mockRes();

      await expect(
        controller.getDeclaracionPdf('0', { user: { username: 'x' } } as any, res),
      ).rejects.toMatchObject({
        response: { success: false, error: 'ID de alcabala inválido' },
      });
      expect(service.resolveDeclaracionPrintData).not.toHaveBeenCalled();
      expect(res.set).not.toHaveBeenCalled();
    });

    it('uses req.user.username as the audit usuario and SISTEMA when absent', async () => {
      const buffer = Buffer.from('x');
      service.resolveDeclaracionPrintData.mockResolvedValue({} as any);
      mockLoadLogoDataUri.mockResolvedValue(null);
      mockGenerateDeclaracionPdf.mockResolvedValue(buffer);
      configService.get.mockReturnValue(undefined);

      const res1 = mockRes();
      await controller.getDeclaracionPdf(
        '5',
        { user: { username: 'jperez' } } as any,
        res1,
      );
      expect(mockGenerateDeclaracionPdf).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ usuario: 'jperez' }),
      );

      const res2 = mockRes();
      await controller.getDeclaracionPdf('5', {} as any, res2);
      expect(mockGenerateDeclaracionPdf).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ usuario: 'SISTEMA' }),
      );
    });

    it('renders the PDF without a logo when the logo path is unset', async () => {
      const buffer = Buffer.from('x');
      service.resolveDeclaracionPrintData.mockResolvedValue({} as any);
      configService.get.mockReturnValue(undefined);
      mockLoadLogoDataUri.mockResolvedValue(null);
      mockGenerateDeclaracionPdf.mockResolvedValue(buffer);
      const res = mockRes();

      await controller.getDeclaracionPdf(
        '7',
        { user: { username: 'ana' } } as any,
        res,
      );

      expect(mockLoadLogoDataUri).toHaveBeenCalledWith(undefined);
      expect(mockGenerateDeclaracionPdf).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ logoDataUri: null }),
      );
      expect(res.set).toHaveBeenCalled();
      expect(res.end).toHaveBeenCalledWith(buffer);
    });

    it('propagates service errors (e.g. 404) without touching the response', async () => {
      service.resolveDeclaracionPrintData.mockRejectedValue(
        new Error('not found'),
      );
      configService.get.mockReturnValue(undefined);
      const res = mockRes();

      await expect(
        controller.getDeclaracionPdf('999999', {} as any, res),
      ).rejects.toThrow('not found');
      expect(res.set).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });

  describe('GET declaracion-pdf/:idAlcabala (guard)', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [ImpresionDjAlcabalaController],
        providers: [
          {
            provide: ImpresionDjAlcabalaService,
            useValue: {
              resolveOpPrintData: jest.fn(),
              resolveDeclaracionPrintData: jest.fn(),
            },
          },
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: () => {
            throw new UnauthorizedException({
              authenticated: false,
              errorCode: 'AUTH_SESSION_MISSING',
              message: 'Authentication required',
            });
          },
        })
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 401 when the JWT guard rejects the request', async () => {
      await request(app.getHttpServer())
        .get('/alcabala/impresion-dj-alcabala/declaracion-pdf/1')
        .expect(401);
    });
  });
});
