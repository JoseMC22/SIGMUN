import { ComparaLiquidacionService } from './compara-liquidacion.service';
import { DatabaseService } from '../../database/database.service';
import {
  SpLiquidacionCabeceraRow,
  SpLiquidacionDetalleRow,
} from './dto/compara-liquidacion.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

// ── Datos reales observados en vivo para la liquidación 26-00000001 ──

const CABECERA_ROW: SpLiquidacionCabeceraRow = {
  idliquidacion: 1108398,
  numero: '26-00000001',
  codigo: '0263958',
  Monto: 1557.96,
  Observacion: '0263958%*2025*...',
  estado: '1',
  usuario: 'MVAEZ',
  terminal: 'INFOSAT01',
  fregistro: '2026-01-05T07:30:25.527Z',
  fvencimiento: '2026-01-05T00:00:00.000Z',
  observacion2: '...',
};

const DETALLE_ROWS: SpLiquidacionDetalleRow[] = [
  {
    SECUENCIA: 1,
    tipo: '02.01',
    tipo_rec: '02.01',
    ANNO: '2025',
    PERIODO: '02',
    imp_insol: 500.07,
    imp_mora: 32.85,
    COSTO_EMI: 0,
    Total: 532.92,
    Nombre: 'CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA',
    'F.Emisión': 'MVAEZ - Ene  5 2026  7:30AM',
  },
  {
    SECUENCIA: 2,
    tipo: '02.01',
    tipo_rec: '02.01',
    ANNO: '2025',
    PERIODO: '03',
    imp_insol: 500.07,
    imp_mora: 19.35,
    COSTO_EMI: 0,
    Total: 519.42,
    Nombre: 'CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA',
    'F.Emisión': 'MVAEZ - Ene  5 2026  7:30AM',
  },
  {
    SECUENCIA: 3,
    tipo: '02.01',
    tipo_rec: '02.01',
    ANNO: '2025',
    PERIODO: '04',
    imp_insol: 500.07,
    imp_mora: 5.55,
    COSTO_EMI: 0,
    Total: 505.62,
    Nombre: 'CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA',
    'F.Emisión': 'MVAEZ - Ene  5 2026  7:30AM',
  },
];

describe('ComparaLiquidacionService', () => {
  let service: ComparaLiquidacionService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new ComparaLiquidacionService(db as unknown as DatabaseService);
  });

  describe('buscarLiquidacion', () => {
    it('should call SP pa_liquidacion with msquery=12 (header) and msquery=13 (detail)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([CABECERA_ROW]))
        .mockResolvedValueOnce(mockSpResult(DETALLE_ROWS));

      await service.buscarLiquidacion('26-00000001');

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Caja].[pa_liquidacion]',
        expect.objectContaining({ msquery: 12, numero: '26-00000001' }),
        expect.anything(),
      );
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Caja].[pa_liquidacion]',
        expect.objectContaining({ msquery: 13, numero: '26-00000001' }),
        expect.anything(),
      );
    });

    it('should map the real header fixture to a camelCase cabecera', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([CABECERA_ROW]))
        .mockResolvedValueOnce(mockSpResult(DETALLE_ROWS));

      const result = await service.buscarLiquidacion('26-00000001');

      expect(result.cabecera).toEqual({
        idLiquidacion: 1108398,
        numero: '26-00000001',
        codigo: '0263958',
        monto: 1557.96,
        observacion: '0263958%*2025*...',
        estado: '1',
        usuario: 'MVAEZ',
        terminal: 'INFOSAT01',
        fregistro: '2026-01-05T07:30:25.527Z',
        fvencimiento: '2026-01-05T00:00:00.000Z',
        observacion2: '...',
      });
    });

    it('should map the real detail fixture preserving SP order (no re-sort)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([CABECERA_ROW]))
        .mockResolvedValueOnce(mockSpResult(DETALLE_ROWS));

      const result = await service.buscarLiquidacion('26-00000001');

      expect(result.detalle).toHaveLength(3);
      expect(result.detalle.map((d) => d.secuencia)).toEqual([1, 2, 3]);
      expect(result.detalle.map((d) => d.periodo)).toEqual(['02', '03', '04']);
      expect(result.detalle[0]).toEqual({
        secuencia: 1,
        tipo: '02.01',
        tipoRec: '02.01',
        anno: '2025',
        periodo: '02',
        impInsol: 500.07,
        impMora: 32.85,
        costoEmi: 0,
        total: 532.92,
        nombre: 'CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA',
        femision: 'MVAEZ - Ene  5 2026  7:30AM',
      });
      expect(result.detalle[1].total).toBe(519.42);
      expect(result.detalle[2].total).toBe(505.62);
    });

    it("should alias the 'F.Emisión' column to the JS-safe key femision", async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([CABECERA_ROW]))
        .mockResolvedValueOnce(mockSpResult(DETALLE_ROWS));

      const result = await service.buscarLiquidacion('26-00000001');

      expect(result.detalle[0].femision).toBe('MVAEZ - Ene  5 2026  7:30AM');
      expect(
        (result.detalle[0] as unknown as Record<string, unknown>)['F.Emisión'],
      ).toBeUndefined();
    });

    it('should return cabecera null and empty detalle when the number does not exist', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.buscarLiquidacion('26-99999999');

      expect(result.cabecera).toBeNull();
      expect(result.detalle).toEqual([]);
    });

    it('should tolerate a missing recordset (undefined rows)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce({} as never)
        .mockResolvedValueOnce({} as never);

      const result = await service.buscarLiquidacion('26-00000001');

      expect(result.cabecera).toBeNull();
      expect(result.detalle).toEqual([]);
    });
  });
});
