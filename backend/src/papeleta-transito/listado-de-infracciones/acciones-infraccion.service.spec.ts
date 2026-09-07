import { AccionesInfraccionService } from './acciones-infraccion.service';
import { DatabaseService } from '../../database/database.service';
import { FraccionarPapeletaDto } from './dto/acciones-infraccion.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('AccionesInfraccionService', () => {
  let service: AccionesInfraccionService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new AccionesInfraccionService(db as unknown as DatabaseService);
  });

  describe('fraccionarPapeleta', () => {
    const baseDto: FraccionarPapeletaDto = {
      codigo: 'P303011',
      cuotas: 4,
      totalDeuda: 1000,
      totalInicial: 300,
      fechaGeneracion: '2026-09-01',
      fechaCuota: '2026-10-01',
      condicionId: '',
      tipoDeuda: 'PIT',
      codResp: 'P303011',
      codPropVeh: 'P5',
      varxml: '',
    };

    it('should return success=true when the SP returns { nro: "PIT-Ord-..." }', async () => {
      db.executeProcedure.mockResolvedValue(
        mockSpResult([{ nro: 'PIT-Ord-2026-1234' }]),
      );

      const result = await service.fraccionarPapeleta(baseDto);

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'Rentas.GeneraConveniopape',
        expect.objectContaining({
          codigo: 'P303011',
          cuotas: 4,
          CodResp: 'P303011',
          varxml: '',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('PIT-Ord-2026-1234');
    });

    it('should return success=true when the SP uses a column different from nro, reading first value', async () => {
      db.executeProcedure.mockResolvedValue(
        mockSpResult([{ nro_convenio: 'PIT-2026-999' }]),
      );

      const result = await service.fraccionarPapeleta(baseDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('PIT-2026-999');
    });

    it('should return success=false with fallback message when recordset is empty', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.fraccionarPapeleta(baseDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        'La papeleta ya se encuentra fraccionada o no cuenta con recibo válido',
      );
    });

    it('should return success=false when the SP returns literal "null"', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([{ nro: 'null' }]));

      const result = await service.fraccionarPapeleta(baseDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('null');
    });

    it('should return success=false when the SP returns an error string', async () => {
      db.executeProcedure.mockResolvedValue(
        mockSpResult([{ nro: 'Error: la papeleta ya fue fraccionada' }]),
      );

      const result = await service.fraccionarPapeleta(baseDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error: la papeleta ya fue fraccionada');
    });

    it('should build <row ... /> XML from a varxml JSON array', async () => {
      db.executeProcedure.mockResolvedValue(
        mockSpResult([{ nro: 'PIT-Ord-2026-777' }]),
      );

      const varxml = JSON.stringify([
        { idrecibo: '103427955', codigo: 'P303011', imp_insol: '1000' },
      ]);

      await service.fraccionarPapeleta({ ...baseDto, varxml });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'Rentas.GeneraConveniopape',
        expect.objectContaining({
          varxml: '<row idrecibo="103427955" codigo="P303011" imp_insol="1000" />',
        }),
      );
    });

    it('should pass varxml through unchanged when it is not valid JSON', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([{ nro: 'PIT-Ord-2026-1' }]));

      await service.fraccionarPapeleta({ ...baseDto, varxml: 'not-json' });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'Rentas.GeneraConveniopape',
        expect.objectContaining({ varxml: 'not-json' }),
      );
    });

    it('should return success=false with the error message when the SP throws', async () => {
      db.executeProcedure.mockRejectedValue(new Error('connection failed'));

      const result = await service.fraccionarPapeleta(baseDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('connection failed');
    });
  });
});