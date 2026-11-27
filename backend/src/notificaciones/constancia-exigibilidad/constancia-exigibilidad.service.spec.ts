import { DatabaseService } from '../../database/database.service';
import { ConstanciaExigibilidadService } from './constancia-exigibilidad.service';
import { EmitirConstanciaExigibilidadDto } from './dto/emitir-constancia-exigibilidad.dto';

const SP_NAME = 'COACTIVO.USP_EXIGIBILIDAD';
const OBSERVACION =
  'Constancia de Exigibilidad Generada desde el Sistema de Notificaciones';
const BUSINESS_DAYS_ERROR =
  'Deben transcurrir al menos 7 días hábiles desde la fecha de notificación para generar la constancia.';

function spResult<T>(rows: T[]): { recordset: T[] } {
  return { recordset: rows };
}

function validarRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    Estado: '1',
    NroExigibilidad: '0',
    Cargo: '0000042',
    Administrado: 'Contribuyente de Prueba',
    FEC_VAL: new Date('2026-10-01T00:00:00.000Z'),
    Monto: 125.5,
    Fnotifica: new Date('2026-10-29T00:00:00.000Z'),
    FExigibilidad: null,
    CODIGO: '0012345',
    ID_VALOR: '01',
    NUM_VAL: '0000123',
    ANO_VAL: '2026',
    ...overrides,
  };
}

function emitirDto(
  overrides: Partial<EmitirConstanciaExigibilidadDto> = {},
): EmitirConstanciaExigibilidadDto {
  return {
    tipoValor: '01',
    anio: 2026,
    numero: '0000123',
    ...overrides,
  };
}

function freezeToday(date: string): void {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${date}T12:00:00`));
}

describe('ConstanciaExigibilidadService', () => {
  const executeProcedure = jest.fn();
  const query = jest.fn();
  let service: ConstanciaExigibilidadService;

  beforeEach(() => {
    executeProcedure.mockReset();
    query.mockReset();
    service = new ConstanciaExigibilidadService({
      executeProcedure,
      query,
    } as unknown as DatabaseService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listarTiposValor', () => {
    it('queries active value types for the current year ordered by name', async () => {
      query.mockResolvedValueOnce(
        spResult([
          { id_valor: '01', nomb_val: 'Arbitrios' },
          { id_valor: 2, nomb_val: 'Predial' },
        ]),
      );

      const result = await service.listarTiposValor();

      expect(query).toHaveBeenCalledWith(
        "SELECT id_valor, nomb_val FROM Contenedor.TblTipo_valor WHERE estado = '1' AND anno_gen = YEAR(GETDATE()) ORDER BY 2",
      );
      expect(result).toEqual({
        success: true,
        data: [
          { id_valor: '01', nomb_val: 'Arbitrios' },
          { id_valor: '2', nomb_val: 'Predial' },
        ],
        total: 2,
      });
    });
  });

  describe('validar', () => {
    it('returns S2 when the value does not exist', async () => {
      executeProcedure.mockResolvedValueOnce(spResult([]));

      const result = await service.validar({
        tipoValor: '01',
        anio: 2026,
        numero: '0000123',
      });

      expect(executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        opcion: 2,
        id_valor: '01',
        num_val: '0000123',
        ano_val: '2026',
      });
      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'El valor no se encuentra registrado',
      });
    });

    it.each([{ estado: '9' }, { estado: 9 }, { estado: '2' }, { estado: 2 }])(
      'blocks cancelled values with S3 when Estado is $estado',
      async ({ estado }) => {
        executeProcedure.mockResolvedValueOnce(
          spResult([validarRow({ Estado: estado })]),
        );

        const result = await service.validar({
          tipoValor: '01',
          anio: 2026,
          numero: '0000123',
        });

        expect(result).toEqual({
          success: false,
          data: [],
          total: 0,
          error:
            'El valor se encuentra en estado Cancelado. No se puede generar la constancia.',
        });
      },
    );

    it('returns the valor data with S4 and disables both actions for a zero cargo', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([validarRow({ Cargo: ' 0 ' })]),
      );

      const result = await service.validar({
        tipoValor: '01',
        anio: 2026,
        numero: '0000123',
      });

      expect(result).toEqual({
        success: true,
        data: [
          {
            administrado: 'Contribuyente de Prueba',
            fecVal: '2026-10-01T00:00:00.000Z',
            monto: 125.5,
            cargo: '0',
            fNotifica: '2026-10-29T00:00:00.000Z',
            nroExigibilidad: '0',
            fExigibilidad: null,
            codigo: '0012345',
            idValor: '01',
            anoVal: '2026',
            numVal: '0000123',
            canGenerate: false,
            canPrint: false,
            message: 'El valor no cuenta con Cargo de Notificación',
          },
        ],
        total: 1,
      });
    });

    it('enables printing and disables generation when a constancia exists', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([
          validarRow({
            NroExigibilidad: '0000101',
            FExigibilidad: new Date('2026-11-09T00:00:00.000Z'),
          }),
        ]),
      );

      const result = await service.validar({
        tipoValor: '01',
        anio: 2026,
        numero: '0000123',
      });

      expect(result).toEqual({
        success: true,
        data: [
          {
            administrado: 'Contribuyente de Prueba',
            fecVal: '2026-10-01T00:00:00.000Z',
            monto: 125.5,
            cargo: '0000042',
            fNotifica: '2026-10-29T00:00:00.000Z',
            nroExigibilidad: '0000101',
            fExigibilidad: '2026-11-09T00:00:00.000Z',
            codigo: '0012345',
            idValor: '01',
            anoVal: '2026',
            numVal: '0000123',
            canGenerate: false,
            canPrint: true,
            message: 'Ya cuenta con Constancia de Exigibilidad',
          },
        ],
        total: 1,
      });
    });

    it.each([{ nroExigibilidad: '0' }, { nroExigibilidad: '' }])(
      'enables generation and disables printing when NroExigibilidad is "$nroExigibilidad"',
      async ({ nroExigibilidad }) => {
        executeProcedure.mockResolvedValueOnce(
          spResult([validarRow({ NroExigibilidad: nroExigibilidad })]),
        );

        const result = await service.validar({
          tipoValor: '01',
          anio: 2026,
          numero: '0000123',
        });

        expect(result.success).toBe(true);
        expect(result.data[0]).toMatchObject({
          canGenerate: true,
          canPrint: false,
          message: 'Proceder con la Generación de la Constancia',
        });
      },
    );

    it('maps null dates to null without throwing', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([
          validarRow({
            FEC_VAL: null,
            Fnotifica: null,
            FExigibilidad: null,
          }),
        ]),
      );

      await expect(
        service.validar({ tipoValor: '01', anio: 2026, numero: '0000123' }),
      ).resolves.toMatchObject({
        success: true,
        data: [
          {
            fecVal: null,
            fNotifica: null,
            fExigibilidad: null,
          },
        ],
      });
    });
  });

  describe('emitir', () => {
    it('derives opcion 3 from the DB row after exactly seven business days', async () => {
      freezeToday('2026-11-09');
      executeProcedure
        .mockResolvedValueOnce(
          spResult([
            validarRow({
              CODIGO: '0765432',
              Administrado: 'Administrado desde BD',
              Monto: 987.65,
              Cargo: '0007777',
            }),
          ]),
        )
        .mockResolvedValueOnce(spResult([{ numexig: '0000101' }]));

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result).toEqual({
        success: true,
        data: [{ numexig: '0000101', anoexig: '2026' }],
        total: 1,
      });
      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(1, SP_NAME, {
        opcion: 2,
        id_valor: '01',
        num_val: '0000123',
        ano_val: '2026',
      });
      expect(executeProcedure).toHaveBeenNthCalledWith(2, SP_NAME, {
        opcion: 3,
        anoexig: '2026',
        codigo: '0765432',
        nombre: 'Administrado desde BD',
        lote: '0',
        montota: 987.65,
        observacion: OBSERVACION,
        operador: 'operador.web',
        estacion: 'WEB',
        id_valor: '01',
        ano_val: '2026',
        num_val: '0000123',
        cargo: '0007777',
        fnotifica: '2026-10-29T00:00:00.000Z',
      });
    });

    it('returns S2 and does not insert when the DB valor does not exist', async () => {
      executeProcedure.mockResolvedValueOnce(spResult([]));

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'El valor no se encuentra registrado',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
    });

    it.each([{ estado: '9' }, { estado: '2' }])(
      'does not insert when the DB Estado is $estado',
      async ({ estado }) => {
        executeProcedure.mockResolvedValueOnce(
          spResult([validarRow({ Estado: estado })]),
        );

        const result = await service.emitir(emitirDto(), 'operador.web');

        expect(result).toEqual({
          success: false,
          data: [],
          total: 0,
          error:
            'El valor se encuentra en estado Cancelado. No se puede generar la constancia.',
        });
        expect(executeProcedure).toHaveBeenCalledTimes(1);
      },
    );

    it('returns S4 and does not insert when the DB Cargo is zero', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([validarRow({ Cargo: ' 0 ' })]),
      );

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'El valor no cuenta con Cargo de Notificación',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
    });

    it('does not insert when a second emission finds an existing NroExigibilidad', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([validarRow({ NroExigibilidad: '0000101' })]),
      );

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'Ya cuenta con Constancia de Exigibilidad',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).not.toHaveBeenCalledWith(
        SP_NAME,
        expect.objectContaining({ opcion: 3 }),
      );
    });

    it.each([{ fnotifica: null }, { fnotifica: 'not-a-date' }])(
      'rejects an invalid DB Fnotifica without inserting: $fnotifica',
      async ({ fnotifica }) => {
        executeProcedure.mockResolvedValueOnce(
          spResult([validarRow({ Fnotifica: fnotifica })]),
        );

        const result = await service.emitir(emitirDto(), 'operador.web');

        expect(result).toEqual({
          success: false,
          data: [],
          total: 0,
          error: 'La fecha de notificación es inválida.',
        });
        expect(executeProcedure).toHaveBeenCalledTimes(1);
      },
    );

    it('rejects six DB business days without calling opcion 3', async () => {
      freezeToday('2026-11-09');
      executeProcedure.mockResolvedValueOnce(
        spResult([
          validarRow({
            Fnotifica: new Date('2026-10-30T00:00:00.000Z'),
          }),
        ]),
      );

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: BUSINESS_DAYS_ERROR,
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).not.toHaveBeenCalledWith(
        SP_NAME,
        expect.objectContaining({ opcion: 3 }),
      );
      expect(query).not.toHaveBeenCalled();
    });

    it('does not count Saturday or Sunday as elapsed business days', async () => {
      freezeToday('2026-11-09');
      executeProcedure.mockResolvedValueOnce(
        spResult([
          validarRow({
            Fnotifica: new Date('2026-11-06T00:00:00.000Z'),
          }),
        ]),
      );

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result.success).toBe(false);
      expect(result.error).toBe(BUSINESS_DAYS_ERROR);
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).not.toHaveBeenCalledWith(
        SP_NAME,
        expect.objectContaining({ opcion: 3 }),
      );
    });

    it('rejects a DB notification date in the future without inserting', async () => {
      freezeToday('2026-11-09');
      executeProcedure.mockResolvedValueOnce(
        spResult([
          validarRow({
            Fnotifica: new Date('2026-11-10T00:00:00.000Z'),
          }),
        ]),
      );

      const result = await service.emitir(emitirDto(), 'operador.web');

      expect(result.success).toBe(false);
      expect(result.error).toBe(BUSINESS_DAYS_ERROR);
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).not.toHaveBeenCalledWith(
        SP_NAME,
        expect.objectContaining({ opcion: 3 }),
      );
    });

    it('falls back to the validated identity when the DB identifiers are empty', async () => {
      freezeToday('2026-11-09');
      executeProcedure
        .mockResolvedValueOnce(
          spResult([
            validarRow({ ID_VALOR: '', NUM_VAL: null, ANO_VAL: '' }),
          ]),
        )
        .mockResolvedValueOnce(spResult([{ NUMEXIG: '0000102' }]));

      await service.emitir(emitirDto(), 'operador.web');

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        SP_NAME,
        expect.objectContaining({
          id_valor: '01',
          ano_val: '2026',
          num_val: '0000123',
          anoexig: '2026',
          lote: '0',
          observacion: OBSERVACION,
        }),
      );
    });
  });

  describe('impresion', () => {
    it('returns S8 when the constancia does not exist', async () => {
      executeProcedure.mockResolvedValueOnce(spResult([]));

      const result = await service.impresion({
        numexig: '0000101',
        anoexig: '2026',
      });

      expect(executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        opcion: 4,
        numexig: '0000101',
        anoexig: '2026',
      });
      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'La exigibilidad no existe.',
      });
    });

    it('maps the opcion 4 columns to the PDF data contract', async () => {
      executeProcedure.mockResolvedValueOnce(
        spResult([
          {
            Constancia: '0000101-2026',
            Codigo: '0012345',
            Nombre: 'Contribuyente de Prueba',
            Valor: '01-2026-0000123',
            Fnotifica: new Date('2026-10-29T00:00:00.000Z'),
            Cargo: '0000042',
            Fec_Gen: new Date('2026-11-09T00:00:00.000Z'),
            Monto: 125.5,
          },
        ]),
      );

      const result = await service.impresion({
        numexig: '0000101',
        anoexig: '2026',
      });

      expect(result).toEqual({
        success: true,
        data: [
          {
            nombre: 'Contribuyente de Prueba',
            constancia: '0000101-2026',
            valor: '01-2026-0000123',
            fnotifica: '2026-10-29T00:00:00.000Z',
            cargo: '0000042',
          },
        ],
        total: 1,
      });
    });
  });
});
