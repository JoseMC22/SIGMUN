import { DeclaracionJuradaService } from './declaracion-jurada.service';
import { DatabaseService } from '../../database/database.service';
import { GenerarDeudaGuardarDto } from './dto/generar-deuda-guardar.dto';
import { PredioDataResult } from './dto/declaracion-jurada.types';

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

// ── getPredioData (Mantenimiento de Predio) ──────────────────────────

describe('DeclaracionJuradaService — getPredioData', () => {
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;
  let service: DeclaracionJuradaService;

  beforeEach(() => {
    db = {
      executeProcedure: jest.fn().mockResolvedValue({ recordset: [], recordsets: [] } as any),
    };
    service = new DeclaracionJuradaService(db as unknown as DatabaseService);
  });

  it('lanza error si el predio no existe', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [], recordsets: [] } as any);

    await expect(
      service.getPredioData('0279126', '2026', '000172956', '0001', '0001'),
    ).rejects.toThrow('Predio no encontrado.');
  });

  it('mapea los campos posicionales del SP a PredioDataResult', async () => {
    // Simula el recordset posicional del legacy sp_VistaPred @msquery=1
    // Índices según legacy prediosAction (0-89)
    const v = new Array(90).fill('');
    v[1] = '0279126';        // codigo
    v[2] = '2026';           // anno
    v[3] = '000172956';      // cod_pred
    v[4] = '0001';           // anexo
    v[5] = '0001';           // sub_anexo
    v[7] = 'AV001';          // cod_via
    v[11] = '123';           // nro
    v[12] = 'A';             // num_dpto
    v[8] = '10';             // num_mza
    v[9] = '20';             // num_lote
    v[10] = '5';             // num_sublote
    v[13] = 'Av. Principal'; // direccion
    v[14] = '05';            // cmbCondicion
    v[15] = '01';            // cmbUso
    v[16] = '02';            // cmbEstadoConst
    v[17] = '1';             // cbtipopredio / cmbTipPredio
    v[18] = '1000';          // sum_luz
    v[19] = '2000';          // sum_agua
    v[20] = '1';             // chbLicencia
    v[21] = '1';             // chbConformidad
    v[22] = '1';             // chbDeclaracionFab
    v[23] = '2';             // txtNroPiso
    v[24] = '3';             // txtNroCond
    v[27] = '0';             // chbVendido
    v[29] = '15.50';         // frontis
    v[31] = '200.00';        // area_terreno
    v[32] = '10.00';         // area_comun
    v[33] = '50000';         // txtArancel
    v[34] = '100000';        // txtTerreno
    v[35] = '200000';        // txtConstruccion
    v[36] = '30000';         // txtInstalaciones
    v[37] = '330000';        // txtAutovaluo
    v[38] = '100';           // txtPorcenPropiedad
    v[40] = '1';             // chAfectoPred
    v[41] = '1';             // afec_arbitrios
    v[42] = '01';            // afec_arb_desde
    v[43] = '12';            // afec_arb_hasta
    v[47] = 'Observación del predio'; // obs
    v[49] = 'usuario1';      // usuario
    v[50] = 'PC01';          // estacion
    v[51] = '2026-01-15';    // fechmod
    v[52] = '15/01/2020';    // fec_compra
    v[53] = '01/01/1900';    // fec_venta (debe quedar vacío)
    v[54] = 'Av. Principal'; // nombre_via
    v[55] = 'Urb. Central';  // nombre_cp
    v[56] = 'Obs arbitrios'; // txtArbObs
    v[59] = '50.00';         // area_uso
    v[60] = '456';           // nro2
    v[61] = 'A';             // letra
    v[62] = 'B';             // letra2
    v[63] = '03';            // cmbInterior
    v[64] = 'Zona Norte';    // sector_detalle
    v[65] = '5.00';          // fondo
    v[67] = '04';            // cmbCondicionpredio
    v[68] = '05';            // cmbSituacionPredio
    v[69] = '01';            // txtDocEspecial
    v[70] = 'DOC-123';       // txtNroDocEspecial
    v[71] = '01/01/1900';    // txtFechDocEspecial -> vacío
    v[72] = '01/01/1900';    // txtFechDocEspecialInicial -> vacío
    v[73] = '01/01/1900';    // txtFechDocEspecialFinal -> vacío
    v[74] = 'Escritura';     // txtSituacionDocumento
    v[75] = 'REG-001';       // txtSituacionNroDoc
    v[76] = '01/01/1900';    // txtSituacionFechDoc -> vacío
    v[77] = '2026-06-01';    // fecha_fiscalizacion
    v[78] = 'FISC-001';      // nro_fiscalizacion
    v[79] = '01';            // tipo_edificio_id
    v[80] = 'Edif. Central'; // nombre_edificio
    v[81] = '2';             // piso
    v[82] = 'A-101';         // numero_interno
    v[83] = 'B';             // letra_interno
    v[84] = '01';            // tipo_ingreso_id
    v[85] = 'Ing. Principal'; // nombre_ingreso
    v[86] = '01';            // tipo_agrupamiento_id
    v[87] = 'Agrup. Comercial'; // nombre_agrupamiento
    v[88] = '100';           // txtPorcenConstruccion
    v[89] = 'Observación completa del predio para mantenimiento'; // Observacionpredio

    db.executeProcedure.mockResolvedValue({ recordset: [v], recordsets: [] } as any);

    const result = await service.getPredioData(
      '0279126',
      '2026',
      '000172956',
      '0001',
      '0001',
    );

    expect(result).toBeDefined();
    expect(result.codigo).toBe('0279126');
    expect(result.anno).toBe('2026');
    expect(result.codPred).toBe('000172956');
    expect(result.anexo).toBe('0001');
    expect(result.subAnexo).toBe('0001');
    
    // Ubicación
    expect(result.cbtipopredio).toBe('1');
    expect(result.txtCvia).toBe('AV001');
    expect(result.txtVia).toBe('Av. Principal');
    expect(result.txtCp).toBe('Urb. Central');
    expect(result.txtDir).toBe('Av. Principal');
    expect(result.txtNro).toBe('123');
    expect(result.txtMza).toBe('10');
    expect(result.txtLte).toBe('20');
    expect(result.txtSubLte).toBe('5');
    expect(result.txtFrontis).toBe('15.50');
    
    // Características
    expect(result.cmbUso).toBe('01');
    expect(result.cmbTipPredio).toBe('1');
    expect(result.cmbEstadoConst).toBe('02');
    expect(result.cmbCondicion).toBe('05');
    expect(result.txtAreaTerreno).toBe('200.00');
    expect(result.txtAreaComun).toBe('10.00');
    expect(result.txtPorcenPropiedad).toBe('100');
    expect(result.txtPorcenConstruccion).toBe('100');
    expect(result.txtFecAdqui).toBe('15/01/2020');
    expect(result.txtFecTrans).toBe(''); // 01/01/1900 -> vacío
    
    // Checkboxes
    expect(result.chAfectoPred).toBe('1');
    expect(result.chbVendido).toBe('0');
    expect(result.chbLicencia).toBe('1');
    expect(result.chbConformidad).toBe('1');
    expect(result.chbDeclaracionFab).toBe('1');
    
    // Condición especial
    expect(result.txtDocEspecial).toBe('01');
    expect(result.txtNroDocEspecial).toBe('DOC-123');
    expect(result.txtFechDocEspecial).toBe('');
    
    // Edificio
    expect(result.cmbTipoEdificio).toBe('01');
    expect(result.txtNomEdificio).toBe('Edif. Central');
    expect(result.txtPiso).toBe('2');
    
    // Resumen
    expect(result.txtTerreno).toBe('100000');
    expect(result.txtConstruccion).toBe('200000');
    expect(result.txtInstalaciones).toBe('30000');
    expect(result.txtAutovaluo).toBe('330000');
    
    // Auditoría
    expect(result.usuario).toBe('usuario1');
    expect(result.estacion).toBe('PC01');
    expect(result.fechmod).toBe('2026-01-15');
  });
});
