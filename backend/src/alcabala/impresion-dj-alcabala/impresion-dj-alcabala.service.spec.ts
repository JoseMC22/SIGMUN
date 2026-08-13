/// <reference types="jest" />

import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';
import { DatabaseService } from '../../database/database.service';
import { mapOpPdfRow } from './impresion-dj-alcabala.service';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

function mockQ<T>(rows: T[]): any {
  return { recordset: rows };
}

// Helper: canonical SP row with all 35 sp_ImprimeOP columns
function opRow(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id_valor: '08',
    num_val: '0000229',
    ano_val: '2025',
    numerOP: '00001234',
    fec_val: '05/02/2026',
    fecvaln: '05/03/2026',
    codigo: '0012345',
    nombre: 'JUAN CARLOS GARCIA LOPEZ',
    num_doc: '12345678',
    Dirfiscal: 'AV. LOS OLIVOS 123',
    anno: '2025',
    cadenaUIT: 'UIT 2025 S/ 5,350.00',
    rtramo01: '1° TRAMO',
    rtramo02: '2° TRAMO',
    rtramo03: '3° TRAMO',
    base_imponible1: 120000,
    imp_anual1: 3600,
    cuotas: '4',
    imp_insol: 900,
    imp_insoltexto: 'SON NOVECIENTOS CON 00/100 SOLES',
    imp_reaj: 45.5,
    mora: 12.3,
    costo_emis: 8.5,
    costo_emistexto: 'COSTO DE EMISION',
    imp_total: 966.3,
    imp_totaltexto: 'SON NOVECIENTOS SESENTA Y SEIS CON 30/100 SOLES',
    cuota_rej: '1',
    cuota_mor: '1',
    direccion: 'AV. LOS OLIVOS 123',
    fecha: '05/02/2026',
    moratorio: '2.5%',
    fech_proyectado: '05/03/2026',
    cod_pred: 'P001',
    fvencimiento: '28/02/2026',
    periodoRomano: 'FEBRERO 2026',
    ...overrides,
  };
}

describe('ImpresionDjAlcabalaService', () => {
  let service: ImpresionDjAlcabalaService;
  let db: jest.Mocked<
    Pick<DatabaseService, 'queryWithParams' | 'executeProcedure'>
  >;

  const SP_IMPRIME_OP = 'Rentas.sp_ImprimeOP';
  const SQL_IDRECIBO = 'SELECT idrecibo FROM Alcabala.DJAlcabala WHERE id_alcabala = @id';
  const SQL_DVALORES =
    'SELECT num_val, ano_val FROM Rentas.Dvalores WHERE id_valor = @id_valor AND nestado <> \'9\' AND idrecibo = @idrecibo';

  beforeEach(() => {
    db = {
      queryWithParams: jest.fn(),
      executeProcedure: jest.fn(),
    };
    service = new ImpresionDjAlcabalaService(
      db as unknown as DatabaseService,
    );
  });

  describe('resolveOpPrintData (T1 — SP call)', () => {
    it('should resolve idAlcabala → idrecibo → Dvalores and call sp_ImprimeOP with exact params', async () => {
      db.queryWithParams
        .mockResolvedValueOnce(mockQ([{ idrecibo: 'R001' }]))
        .mockResolvedValueOnce(
          mockQ([{ num_val: '0000229', ano_val: '2025' }]),
        );
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([opRow()]));

      const result = await service.resolveOpPrintData(11772);

      // DJAlcabala lookup: parameterized by id_alcabala
      expect(db.queryWithParams).toHaveBeenNthCalledWith(
        1,
        SQL_IDRECIBO,
        { id: 11772 },
      );
      // Dvalores lookup: '08' + nestado<>'9' + idrecibo bridge (risk #1)
      expect(db.queryWithParams).toHaveBeenNthCalledWith(
        2,
        SQL_DVALORES,
        { id_valor: '08', idrecibo: 'R001' },
      );
      // SP called with the RESOLVED valor
      expect(db.executeProcedure).toHaveBeenCalledWith(SP_IMPRIME_OP, {
        buscar: 2,
        id_valor: '08',
        num_val: '0000229',
        ano_val: '2025',
      });
      expect(result).toEqual({
        numVal: '0000229',
        anoVal: '2025',
        rows: [mapOpPdfRow(opRow())],
      });
    });

    it('should pass the resolved valor for a different alcabala (not hardcoded)', async () => {
      db.queryWithParams
        .mockResolvedValueOnce(mockQ([{ idrecibo: 'R777' }]))
        .mockResolvedValueOnce(
          mockQ([{ num_val: '0000333', ano_val: '2024' }]),
        );
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([opRow()]));

      await service.resolveOpPrintData(8888);

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_IMPRIME_OP, {
        buscar: 2,
        id_valor: '08',
        num_val: '0000333',
        ano_val: '2024',
      });
    });
  });

  describe('resolveOpPrintData (T2 — 404 branches)', () => {
    it('should 404 when no DJAlcabala row exists', async () => {
      db.queryWithParams.mockResolvedValueOnce(mockQ([]));

      await expect(service.resolveOpPrintData(999999)).rejects.toMatchObject({
        response: { success: false, error: 'Alcabala no encontrada' },
      });
      expect(db.executeProcedure).not.toHaveBeenCalled();
    });

    it('should 404 when no Dvalores "08" row exists (OP not generated)', async () => {
      db.queryWithParams
        .mockResolvedValueOnce(mockQ([{ idrecibo: 'R001' }]))
        .mockResolvedValueOnce(mockQ([]));

      await expect(service.resolveOpPrintData(11772)).rejects.toMatchObject({
        response: {
          success: false,
          error: 'No existe una orden de pago para la alcabala',
        },
      });
      expect(db.executeProcedure).not.toHaveBeenCalled();
    });

    it('should 404 when sp_ImprimeOP returns an empty recordset', async () => {
      db.queryWithParams
        .mockResolvedValueOnce(mockQ([{ idrecibo: 'R001' }]))
        .mockResolvedValueOnce(
          mockQ([{ num_val: '0000229', ano_val: '2025' }]),
        );
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await expect(service.resolveOpPrintData(11772)).rejects.toMatchObject({
        response: {
          success: false,
          error: 'No se encontraron datos para imprimir',
        },
      });
    });
  });

  describe('mapOpPdfRow — SQL NULL tolerance (review fix)', () => {
    it('should apply string defaults instead of throwing on SQL NULL columns', () => {
      const row = opRow({
        nombre: null,
        Dirfiscal: null,
        fvencimiento: null,
      });

      const mapped = mapOpPdfRow(row);

      expect(mapped.nombre).toBe('');
      expect(mapped.Dirfiscal).toBe('');
      expect(mapped.fvencimiento).toBe('');
    });

    it('should keep numeric defaults when numeric columns are SQL NULL', () => {
      const row = opRow({
        base_imponible1: null,
        imp_total: null,
        costo_emis: null,
      });

      const mapped = mapOpPdfRow(row);

      expect(mapped.base_imponible1).toBe(0);
      expect(mapped.imp_total).toBe(0);
      expect(mapped.costo_emis).toBe(0);
    });
  });
});
