import { DeclaracionJuradaService } from './declaracion-jurada.service';
import { DatabaseService } from '../../database/database.service';
import { GenerarDeudaGuardarDto } from './dto/generar-deuda-guardar.dto';

// ── Generar Deuda — Guardar (Rentas.sp_generardeuda @busc=12) ─────────────
//
// Regression guard for the date format sent to the SP.
//
// The SQL Server connection used by this backend runs with
// LANGUAGE = us_english, and under that language `dd/MM/yyyy` raises
// error 242 ("The conversion of a varchar data type to a datetime data
// type resulted in an out-of-range value") because the SP inserts
// @fecha_multa straight into the `fec_venc` datetime column of
// caja.mrecibos. `YYYYMMDD` is the only format that parses under both
// us_english and Español, so it is the one the service must send.

describe('DeclaracionJuradaService — guardarGenerarDeuda', () => {
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;
  let service: DeclaracionJuradaService;

  const baseDto: GenerarDeudaGuardarDto = {
    codigo: '0279126',
    anio_desde: '2026',
    anio_hasta: '2026',
    codigo_infraccion: '10.86',
    monto_multa: 120.5,
    fecha_multa: '2026-10-16',
    operador: 'mvaez',
    estacion: 'INFOSAT01',
    glosa: 'observacion',
  };

  /** fecha_multa tal como se envía al SP en la primera llamada. */
  const fechaEnviadaAlSp = (): unknown => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = db.executeProcedure.mock.calls[0][1] as any;
    return params.fecha_multa;
  };

  beforeEach(() => {
    db = {
      executeProcedure: jest
        .fn()
        .mockResolvedValue({ recordset: [], recordsets: [] }),
    };
    service = new DeclaracionJuradaService(db as unknown as DatabaseService);
  });

  it('normaliza una fecha ISO a YYYYMMDD', async () => {
    await service.guardarGenerarDeuda(baseDto);

    expect(fechaEnviadaAlSp()).toBe('20261016');
  });

  it('normaliza una fecha dd/MM/yyyy a YYYYMMDD', async () => {
    await service.guardarGenerarDeuda({
      ...baseDto,
      fecha_multa: '16/10/2026',
    });

    expect(fechaEnviadaAlSp()).toBe('20261016');
  });

  it('nunca envía el separador "/" (que rompe la conversión a datetime)', async () => {
    await service.guardarGenerarDeuda(baseDto);

    expect(String(fechaEnviadaAlSp())).not.toContain('/');
  });

  it('sigue enviando el resto de parámetros del SP sin cambios', async () => {
    await service.guardarGenerarDeuda(baseDto);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [procedure, params] = db.executeProcedure.mock.calls[0] as any;
    expect(procedure).toBe('Rentas.sp_generardeuda');
    expect(params).toMatchObject({
      busc: 12,
      codigo: '0279126',
      desde: '2026',
      hasta: '2026',
      codigo_infraccion: '10.86',
      monto_multa: 120.5,
      operador: 'mvaez',
      estacion: 'INFOSAT01',
      glosa: 'observacion',
    });
  });

  // ── estado derivado de los mensajes de estado del SP ────────────────────
  //
  // El SP `Rentas.sp_generardeuda @busc=12` NO devuelve el id del recibo:
  // emite recordsets de una sola columna sin nombre (`{'': 'mensaje'}`) cuyo
  // valor es un mensaje de estado. El servicio debe traducirlos a `estado`.

  /** Fija los recordsets que devolverá executeProcedure en el test actual. */
  const conRecordsets = (recordsets: unknown[][]): void => {
    db.executeProcedure.mockResolvedValue({
      recordset: [],
      recordsets,
    } as never);
  };

  it("estado 'ok' cuando el SP responde 'Actualizado correctamente.. '", async () => {
    conRecordsets([[{ '': 'Actualizado correctamente.. ' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result).toEqual({ idMulta: null, estado: 'ok' });
  });

  it("estado 'error' cuando el SP responde 'fallla'", async () => {
    conRecordsets([[{ '': 'fallla' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result.estado).toBe('error');
    expect(result.idMulta).toBeNull();
  });

  it("estado 'error' cuando el SP responde 'Falta Codigo Infraccion'", async () => {
    conRecordsets([[{ '': 'Falta Codigo Infraccion' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result.estado).toBe('error');
    expect(result.idMulta).toBeNull();
  });

  it("estado 'sin_cambios' cuando el SP responde 'NIMI'", async () => {
    conRecordsets([[{ '': 'NIMI' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result).toEqual({ idMulta: null, estado: 'sin_cambios' });
  });

  it("estado 'error' (fail-closed) cuando no hay ningún mensaje reconocible", async () => {
    conRecordsets([[]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result).toEqual({ idMulta: null, estado: 'error' });
  });

  it("estado 'error' (fail-closed) cuando el SP no emite recordsets", async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [],
      recordsets: [],
    } as never);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result).toEqual({ idMulta: null, estado: 'error' });
  });

  it("puebla idMulta y estado 'ok' cuando el SP devuelve un id numérico", async () => {
    conRecordsets([[], [{ '': '991' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result).toEqual({ idMulta: '991', estado: 'ok' });
  });

  it("un error posterior gana sobre un id numérico (prioridad error > ok)", async () => {
    conRecordsets([[{ '': '991' }], [{ '': 'fallla' }]]);

    const result = await service.guardarGenerarDeuda(baseDto);

    expect(result.estado).toBe('error');
  });
});
