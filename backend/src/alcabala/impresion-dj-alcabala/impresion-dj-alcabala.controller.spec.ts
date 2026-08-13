/// <reference types="jest" />

import { ImpresionDjAlcabalaController } from './impresion-dj-alcabala.controller';
import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';
import { generateOpPdf } from './op-pdf-generator';

jest.mock('./op-pdf-generator', () => ({
  generateOpPdf: jest.fn(),
}));

const mockGenerateOpPdf = generateOpPdf as jest.Mock;

function mockRes(): any {
  return { set: jest.fn(), end: jest.fn() };
}

describe('ImpresionDjAlcabalaController', () => {
  let controller: ImpresionDjAlcabalaController;
  let service: jest.Mocked<
    Pick<ImpresionDjAlcabalaService, 'resolveOpPrintData'>
  >;

  beforeEach(() => {
    service = { resolveOpPrintData: jest.fn() } as any;
    mockGenerateOpPdf.mockReset();
    controller = new ImpresionDjAlcabalaController(
      service as unknown as ImpresionDjAlcabalaService,
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
  });
});
