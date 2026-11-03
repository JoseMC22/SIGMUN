import { Test, TestingModule } from '@nestjs/testing';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';
import {
  generateCertificadoPdf,
  resolveCertificadoImagenes,
} from './certificado-pdf-generator';
import { buildCertificadoQrToken, resolveCertificadoQr } from './certificado-qr';
import { GenerarCertificadoDto } from './dto/certificado.dto';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';

// El PDF real usa puppeteer: en el spec se blinda el contrato del generador,
// nunca se compila un PDF.
jest.mock('./certificado-pdf-generator', () => ({
  generateCertificadoPdf: jest.fn(),
  resolveCertificadoImagenes: jest.fn(),
}));

jest.mock('./certificado-qr', () => ({
  // La generacion del QR se blinda; la verificacion del token es pura y se
  // ejercita de verdad (es el corazon de la ruta publica).
  ...jest.requireActual('./certificado-qr'),
  resolveCertificadoQr: jest.fn(),
}));

/**
 * Blindan el contrato del modulo contra la DB real (nunca se toca):
 * - nombre EXACTO del SP y objeto EXACTO de parametros de cada operacion,
 * - tipos SQL explicitos cuando el service los declara,
 * - mapeo del recordset a la forma de respuesta ({ success, data } /
 *   { success:false, error }).
 *
 * El conteo de la busqueda se lee POR POSICION (primera columna), no por
 * nombre: el SP de conteo no documenta el alias.
 */
describe('CertificadoNoAdeudoService', () => {
  let service: CertificadoNoAdeudoService;
  let executeProcedure: jest.Mock;

  const result = (recordset: object[]) => ({ recordset });

  const baseSearchParams = {
    codigo: '',
    nombres: '',
    paterno: '',
    materno: '',
    razon: '',
    num_doc: '',
    tipo_busqueda: 'N',
    cod_pred: '',
    checkfrac: 0,
  };

  const searchDto = (
    overrides: Partial<SearchContribuyenteDto> = {},
  ): SearchContribuyenteDto => ({
    page: 1,
    pageSize: 15,
    TipoBusqueda: 'N',
    Codigo: '',
    Paterno: '',
    Materno: '',
    Nombres: '',
    Razon: '',
    NumDoc: '',
    ...overrides,
  });

  const generarDto = (
    overrides: Partial<GenerarCertificadoDto> = {},
  ): GenerarCertificadoDto => ({
    codigo: '0012345',
    tipoDeuda: '00.01',
    tipoPeriodo: 1,
    observacion: 'SIN DEUDA',
    aniosDeuda: '2024',
    detalles: [
      {
        codigo: '0012345',
        anio: '2024',
        codPred: '0015981',
        anexo: '000',
        subAnexo: '000',
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    executeProcedure = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificadoNoAdeudoService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<CertificadoNoAdeudoService>(
      CertificadoNoAdeudoService,
    );
  });

  // ── search (Rentas.sp_Mcontribuyente @busc=6 / @busc=5) ──

  describe('search', () => {
    it('compone el conteo @busc=6 y la pagina @busc=5 con los parametros exactos', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ TOTAL: '42' }]))
        .mockResolvedValueOnce(
          result([
            {
              codigo: ' 0012345 ',
              nombres: ' ANA ',
              paterno: 'PEREZ',
              materno: 'GOMEZ',
              documento: 'DNI',
              num_doc: ' 12345678 ',
              DireFis: ' AV. SIEMPRE VIVA 742 ',
            },
          ]),
        );

      const res = await service.search(searchDto({ page: 2, Nombres: 'ANA' }));

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Rentas.sp_Mcontribuyente',
        { ...baseSearchParams, nombres: 'ANA', busc: 6 },
      );
      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        {
          ...baseSearchParams,
          nombres: 'ANA',
          busc: 5,
          inicio: '16',
          final: '30',
        },
      );
      expect(res).toEqual({
        success: true,
        data: [
          {
            codigo: '0012345',
            nombres: 'ANA',
            paterno: 'PEREZ',
            materno: 'GOMEZ',
            documento: 'DNI',
            numDoc: '12345678',
            direccion: 'AV. SIEMPRE VIVA 742',
          },
        ],
        total: 42,
        page: 2,
        pageSize: 15,
        totalPages: 3,
      });
    });

    it('calcula inicio/final con la pagina pedida (page 3, pageSize 15 -> 31..45)', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ fila: '31' }]))
        .mockResolvedValueOnce(result([]));

      const res = await service.search(searchDto({ page: 3 }));

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        expect.objectContaining({ busc: 5, inicio: '31', final: '45' }),
      );
      expect(res).toEqual({
        success: true,
        data: [],
        total: 31,
        page: 3,
        pageSize: 15,
        totalPages: 3,
      });
    });

    it('con pageSize 100000 pide todo el rango (1..total) y fuerza page/totalPages a 1', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ fila: '230' }]))
        .mockResolvedValueOnce(result([{ codigo: '0012345', nombres: 'ANA' }]));

      const res = await service.search(searchDto({ pageSize: 100000 }));

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        expect.objectContaining({ busc: 5, inicio: '1', final: '230' }),
      );
      expect(res).toEqual({
        success: true,
        data: [
          {
            codigo: '0012345',
            nombres: 'ANA',
            paterno: '',
            materno: '',
            documento: '',
            numDoc: '',
            direccion: '',
          },
        ],
        total: 230,
        page: 1,
        pageSize: 100000,
        totalPages: 1,
      });
    });

    it('con total 0 no pide la pagina y devuelve totalPages 0', async () => {
      executeProcedure.mockResolvedValueOnce(result([{ fila: 0 }]));

      const res = await service.search(searchDto({ page: 2 }));

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: true,
        data: [],
        total: 0,
        page: 2,
        pageSize: 15,
        totalPages: 0,
      });
    });

    it('una fila de conteo vacia se interpreta como total 0', async () => {
      executeProcedure.mockResolvedValueOnce(result([{}]));

      const res = await service.search(searchDto());

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(res.total).toBe(0);
      expect(res.data).toEqual([]);
    });

    it('envuelve el error del conteo en { success:false, error } sin throw', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.search(searchDto());

      expect(res).toEqual({
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
        error: 'Error al consultar los contribuyentes',
      });
    });
  });

  // ── getCertificados (Certificado.sp_Certificado @busc=1) ──

  describe('getCertificados', () => {
    it('pide @busc=1 con codigo Char(7) y mapea todas las columnas de la cabecera', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          {
            ID_TBL: ' 10 ',
            IDRECIBO: '1015275',
            CODIGO: '0012345',
            CERT_NRO: '7',
            CERT_ANIO: '2024',
            TIPO_DEUDA: '00.01',
            des_tipo_deuda: 'PREDIAL',
            TIPO_PERIODO: '1',
            des_tipo_periodo: 'ANUAL',
            OBSERVACION: 'SIN DEUDA',
            CANT_IMPRESION: '0',
            IMPRESION: 'N',
            FEC_IMPRESION: '05/03/2024 10:20:30',
            ESTADO: '1',
            est_imprime: 'N',
            numcertif: 'C-2024-7',
          },
        ]),
      );

      const res = await service.getCertificados({ codigo: '0012345' });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Certificado.sp_Certificado',
        { busc: 1, codigo: '0012345' },
        { codigo: mssql.Char(7) },
      );
      expect(res).toEqual({
        success: true,
        data: [
          {
            idTbl: '10',
            idRecibo: '1015275',
            codigo: '0012345',
            certNro: '7',
            certAnio: '2024',
            tipoDeuda: '00.01',
            tipoDeudaDescripcion: 'PREDIAL',
            tipoPeriodo: '1',
            tipoPeriodoDescripcion: 'ANUAL',
            observacion: 'SIN DEUDA',
            cantImpresion: '0',
            impresion: 'N',
            fechaImpresion: '2024-03-05T10:20:30',
            estado: '1',
            estImprime: 'N',
            numCertif: 'C-2024-7',
          },
        ],
        total: 1,
      });
    });

    it('convierte fechas dd/mm/yyyy y dd/mm/yyyy hh:mm:ss a ISO; invalidas quedan vacias', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          { CERT_NRO: '1', FEC_IMPRESION: '05/03/2024' },
          { CERT_NRO: '2', FEC_IMPRESION: '31/02/2024' },
          { CERT_NRO: '3', FEC_IMPRESION: null },
        ]),
      );

      const res = await service.getCertificados({ codigo: '0012345' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('se esperaba exito');
      expect(res.data.map((row) => row.fechaImpresion)).toEqual([
        '2024-03-05',
        '',
        '',
      ]);
    });

    it('con recordset vacio devuelve data vacia y total 0', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      const res = await service.getCertificados({ codigo: '0012345' });

      expect(res).toEqual({ success: true, data: [], total: 0 });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getCertificados({ codigo: '0012345' });

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar los certificados',
      });
    });
  });

  // ── getDetalle (Certificado.sp_Certificado @busc=2) ──

  describe('getDetalle', () => {
    it('pide @busc=2 con cert_anio Char(4) y mapea el detalle', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          {
            ID_TBL: '10',
            IDRECIBO: '1015275',
            CODIGO: '0012345',
            CERT_NRO: '7',
            CERT_ANIO: '2024',
            TIPO_DEUDA: '00.01',
            TIPO_PERIODO: '1',
            OBSERVACION: 'SIN DEUDA',
            CANT_IMPRESION: '0',
            IMPRESION: 'N',
            FEC_IMPRESION: '05/03/2024',
            ESTADO: '1',
            anio_deuda: '2024',
            numcertif: 'C-2024-7',
          },
        ]),
      );

      const res = await service.getDetalle({
        certNro: 7,
        certAnio: '2024',
      });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Certificado.sp_Certificado',
        { busc: 2, cert_nro: 7, cert_anio: '2024' },
        { cert_anio: mssql.Char(4) },
      );
      expect(res).toEqual({
        success: true,
        data: {
          idTbl: '10',
          idRecibo: '1015275',
          codigo: '0012345',
          certNro: '7',
          certAnio: '2024',
          tipoDeuda: '00.01',
          tipoPeriodo: '1',
          observacion: 'SIN DEUDA',
          cantImpresion: '0',
          impresion: 'N',
          fechaImpresion: '2024-03-05',
          estado: '1',
          anioDeuda: '2024',
          numCertif: 'C-2024-7',
        },
      });
    });

    it('sin fila devuelve { success:false, error: Certificado no encontrado }', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      const res = await service.getDetalle({
        certNro: 7,
        certAnio: '2024',
      });

      expect(res).toEqual({
        success: false,
        error: 'Certificado no encontrado',
      });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getDetalle({
        certNro: 7,
        certAnio: '2024',
      });

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar el detalle del certificado',
      });
    });
  });

  // ── getContribuyente (dbo.store_caja_framework @msquery=17) ──

  describe('getContribuyente', () => {
    it('pide @msquery=17 con codigo VarChar(7) y mapea la cabecera', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          {
            codigo: ' 0012345 ',
            nombres: ' ANA PEREZ ',
            num_doc: ' 12345678 ',
            direccion: ' JR. LIMA 100 ',
          },
        ]),
      );

      const res = await service.getContribuyente({ codigo: '0012345' });

      expect(executeProcedure).toHaveBeenCalledWith(
        'dbo.store_caja_framework',
        { msquery: 17, codigo: '0012345' },
        { codigo: mssql.VarChar(7) },
      );
      expect(res).toEqual({
        success: true,
        data: {
          codigo: '0012345',
          nombres: 'ANA PEREZ',
          numDoc: '12345678',
          direccion: 'JR. LIMA 100',
        },
      });
    });

    it('sin fila devuelve { success:false, error: Contribuyente no encontrado }', async () => {
      executeProcedure.mockResolvedValueOnce({});

      const res = await service.getContribuyente({ codigo: '0012345' });

      expect(res).toEqual({
        success: false,
        error: 'Contribuyente no encontrado',
      });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getContribuyente({ codigo: '0012345' });

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar el contribuyente',
      });
    });
  });

  // ── getTiposDeuda / getTiposPeriodo (Rentas.sp_CertificadoNoAdeudo) ──

  describe('getTiposDeuda', () => {
    it('pide @busc=1 y mapea tipo/detalle con trim', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          { tipo: ' 00.01 ', detalle: ' PREDIAL ' },
          { tipo: '00.30', detalle: null },
        ]),
      );

      const res = await service.getTiposDeuda();

      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 1 },
      );
      expect(res).toEqual({
        success: true,
        data: [
          { tipo: '00.01', detalle: 'PREDIAL' },
          { tipo: '00.30', detalle: '' },
        ],
        total: 2,
      });
    });

    it('con recordset vacio devuelve data vacia', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      const res = await service.getTiposDeuda();

      expect(res).toEqual({ success: true, data: [], total: 0 });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getTiposDeuda();

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar los tipos de deuda',
      });
    });
  });

  describe('getTiposPeriodo', () => {
    it('pide @busc=2 y convierte id_tbl a numero', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          { id_tbl: ' 3 ', detalle: ' ANUAL ' },
          { id_tbl: null, detalle: 'MENSUAL' },
        ]),
      );

      const res = await service.getTiposPeriodo();

      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 2 },
      );
      expect(res).toEqual({
        success: true,
        data: [
          { idTbl: 3, detalle: 'ANUAL' },
          { idTbl: 0, detalle: 'MENSUAL' },
        ],
        total: 2,
      });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getTiposPeriodo();

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar los tipos de periodo',
      });
    });
  });

  // ── getAniosDeuda (equivalente a AniosTributos, en memoria) ──

  describe('getAniosDeuda', () => {
    it('devuelve los anios desde el actual hasta 1992 sin tocar la DB', () => {
      const anioActual = new Date().getFullYear();

      const anios = service.getAniosDeuda();

      expect(anios[0]).toBe(String(anioActual));
      expect(anios[anios.length - 1]).toBe('1992');
      expect(anios).toHaveLength(anioActual - 1991);
      expect(anios).toEqual(
        Array.from({ length: anioActual - 1991 }, (_, i) =>
          String(anioActual - i),
        ),
      );
      expect(executeProcedure).not.toHaveBeenCalled();
    });
  });

  // ── getPredios (Rentas.sp_Multatributaria vs Certificado.sp_Certificado) ──

  describe('getPredios', () => {
    it('en alta de predio pide Rentas.sp_Multatributaria @busc=2 y mapea el inmueble', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          {
            codigo: '0012345',
            anno: '2024',
            cod_pred: '0015981',
            anexo: '000',
            sub_anexo: '000',
            anexos: '1',
            direccion: ' JR. LIMA 100 ',
            tipo: '02.01',
            area_terreno: '120.5',
            porcen_propiedad: '50',
            total_autoavaluo: '30000',
            chekeado: '1',
          },
          {
            codigo: '0012345',
            anno: '2024',
            cod_pred: '0015982',
          },
        ]),
      );

      const res = await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.01',
      });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_Multatributaria',
        { busc: 2, codigo: '0012345', anno: '2024' },
        { codigo: mssql.VarChar(7), anno: mssql.Char(4) },
      );
      expect(res.success).toBe(true);
      if (!res.success) throw new Error('se esperaba exito');
      expect(res.total).toBe(2);
      expect(res.data[0]).toEqual({
        codigo: '0012345',
        anio: '2024',
        codPred: '0015981',
        anexo: '000',
        subAnexo: '000',
        anexos: '1',
        direccion: 'JR. LIMA 100',
        detalles: '',
        tipo: '02.01',
        areaTerreno: 120.5,
        porcenPropiedad: 50,
        totalAutoavaluo: 30000,
        chekeado: '1',
      });
      expect(res.data[1]).toEqual({
        codigo: '0012345',
        anio: '2024',
        codPred: '0015982',
        anexo: '',
        subAnexo: '',
        anexos: '',
        direccion: '',
        detalles: '',
        tipo: '',
        areaTerreno: 0,
        porcenPropiedad: 0,
        totalAutoavaluo: 0,
        chekeado: '0',
      });
    });

    it('en alta de vehiculo (00.30) pide @busc=5 y arma la descripcion del vehiculo', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([
          {
            codigo: '0012345',
            Anio: '2024',
            num_placa: 'ABC-123',
            anexo: '000',
            subanexo: '000',
            nombre_categoria: 'AUTO',
            nombre_marca: 'TOYOTA',
            nombre_modelo: 'COROLLA',
            chekeado: '1',
          },
        ]),
      );

      const res = await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.30',
      });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_Multatributaria',
        { busc: 5, codigo: '0012345', anno: '2024' },
        { codigo: mssql.VarChar(7), anno: mssql.Char(4) },
      );
      expect(res).toEqual({
        success: true,
        data: [
          {
            codigo: '0012345',
            anio: '2024',
            codPred: 'ABC-123',
            anexo: '000',
            subAnexo: '000',
            anexos: '',
            direccion: '',
            detalles: 'AUTO | TOYOTA | COROLLA',
            tipo: '',
            areaTerreno: 0,
            porcenPropiedad: 0,
            totalAutoavaluo: 0,
            chekeado: '1',
          },
        ],
        total: 1,
      });
    });

    it('en edicion de predio pide Certificado.sp_Certificado @busc=3 con id_tbl Int', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.01',
        idTbl: 10,
      });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Certificado.sp_Certificado',
        { busc: 3, codigo: '0012345', anno: '2024', id_tbl: 10 },
        {
          codigo: mssql.VarChar(7),
          anno: mssql.Char(4),
          id_tbl: mssql.Int,
        },
      );
    });

    it('en edicion de vehiculo pide Certificado.sp_Certificado @busc=4', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.30',
        idTbl: 10,
      });

      expect(executeProcedure).toHaveBeenCalledWith(
        'Certificado.sp_Certificado',
        { busc: 4, codigo: '0012345', anno: '2024', id_tbl: 10 },
        expect.objectContaining({ id_tbl: mssql.Int }),
      );
    });

    it('con recordset vacio devuelve data vacia', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      const res = await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.01',
      });

      expect(res).toEqual({ success: true, data: [], total: 0 });
    });

    it('envuelve el error del SP en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getPredios({
        codigo: '0012345',
        anio: '2024',
        tipoDeuda: '00.01',
      });

      expect(res).toEqual({
        success: false,
        error: 'Error al consultar los predios del contribuyente',
      });
    });
  });

  // ── generar (Rentas.sp_CertificadoNoAdeudo @busc=4 + sp_Genera_Certificado) ──

  describe('generar', () => {
    it('verifica la deuda (@busc=4) y recien despues genera con los parametros exactos', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: '0' }]))
        .mockResolvedValueOnce(result([{ estado: '1x' }]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 4, codigo: '0012345', tipo_deuda: '00.01' },
        { codigo: mssql.VarChar(7), tipo_deuda: mssql.VarChar(5) },
      );
      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Genera_Certificado',
        {
          codigo: '0012345',
          tipo_deuda: '00.01',
          tipo_periodo: 1,
          observacion: 'SIN DEUDA',
          anios_deuda: '2024',
          dataxml:
            '<certificados><row codigo="0012345" anno="2024" ' +
            'cod_pred="0015981" anexo="000" sub_anexo="000" /></certificados>',
          usu_reg: 'jperez',
          estacion_reg: 'CAJA01',
          certnro: 0,
          certanio: '',
        },
        {
          codigo: mssql.Char(7),
          tipo_deuda: mssql.VarChar(5),
          tipo_periodo: mssql.Int,
          observacion: mssql.VarChar(250),
          anios_deuda: mssql.Char(4),
          dataxml: mssql.Xml,
          usu_reg: mssql.VarChar(20),
          estacion_reg: mssql.VarChar(20),
          certnro: mssql.Int,
          certanio: mssql.Char(4),
        },
      );
      expect(res).toEqual({
        success: true,
        message: 'Se registro correctamente',
        estado: 'REGISTRADO',
      });
    });

    it('si hay deuda NO llama al SP de generacion y devuelve el monto', async () => {
      executeProcedure.mockResolvedValueOnce(result([{ monto: 150.5 }]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_CertificadoNoAdeudo',
        { busc: 4, codigo: '0012345', tipo_deuda: '00.01' },
        { codigo: mssql.VarChar(7), tipo_deuda: mssql.VarChar(5) },
      );
      expect(res).toEqual({
        success: false,
        code: 'DEUDA',
        message:
          'El contribuyente tiene deuda pendiente por el tipo de deuda seleccionado',
        montoDeuda: 150.5,
      });
    });

    it('sin fila de deuda (recordset vacio) asume monto 0 y genera', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([]))
        .mockResolvedValueOnce(result([{ estado: '1x' }]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(res).toEqual({
        success: true,
        message: 'Se registro correctamente',
        estado: 'REGISTRADO',
      });
    });

    it('en edicion envia certnro/certanio recibidos', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([{ estado: '1x' }]));

      await service.generar(
        generarDto({ certNro: 12, certAnio: '2024' }),
        'jperez',
        'CAJA01',
      );

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Genera_Certificado',
        expect.objectContaining({ certnro: 12, certanio: '2024' }),
        expect.anything(),
      );
    });

    it('escapa los atributos XML del dataxml', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([{ estado: '1x' }]));

      await service.generar(
        generarDto({
          detalles: [
            {
              codigo: '0012345',
              anio: '2024',
              codPred: '00"1',
              anexo: 'A&B',
              subAnexo: '1<2',
            },
          ],
        }),
        'jperez',
        'CAJA01',
      );

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Genera_Certificado',
        expect.objectContaining({
          dataxml:
            '<certificados><row codigo="0012345" anno="2024" ' +
            'cod_pred="00&quot;1" anexo="A&amp;B" sub_anexo="1&lt;2" />' +
            '</certificados>',
        }),
        expect.anything(),
      );
    });

    it('con varios detalles arma una fila por detalle en el dataxml', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([{ estado: '1x' }]));

      await service.generar(
        generarDto({
          detalles: [
            {
              codigo: '0012345',
              anio: '2024',
              codPred: '0015981',
              anexo: '000',
              subAnexo: '000',
            },
            {
              codigo: '0012345',
              anio: '2024',
              codPred: '0015982',
              anexo: '000',
              subAnexo: '001',
            },
          ],
        }),
        'jperez',
        'CAJA01',
      );

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Genera_Certificado',
        expect.objectContaining({
          dataxml:
            '<certificados>' +
            '<row codigo="0012345" anno="2024" cod_pred="0015981" anexo="000" sub_anexo="000" />' +
            '<row codigo="0012345" anno="2024" cod_pred="0015982" anexo="000" sub_anexo="001" />' +
            '</certificados>',
        }),
        expect.anything(),
      );
    });

    it('si el SP de generacion responde 2x devuelve code DEUDA', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([{ estado: '2x' }]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(res).toEqual({
        success: false,
        code: 'DEUDA',
        message: 'Tiene Deudas y NO se Registro el Certificado',
      });
    });

    it('si el SP de generacion no devuelve fila responde error generico', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(res).toEqual({
        success: false,
        error: 'No se pudo registrar el certificado',
      });
    });

    it('un estado inesperado (3x) responde error generico, no un estado inventado', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockResolvedValueOnce(result([{ estado: '3x' }]));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(res).toEqual({
        success: false,
        error: 'No se pudo registrar el certificado',
      });
    });

    it('envuelve el error del SP de generacion en { success:false, error }', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([{ monto: 0 }]))
        .mockRejectedValueOnce(new Error('boom'));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(res).toEqual({
        success: false,
        error: 'Error al registrar el certificado',
      });
    });

    it('envuelve el error de la verificacion de deuda en { success:false, error }', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.generar(generarDto(), 'jperez', 'CAJA01');

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: false,
        error: 'Error al verificar la deuda pendiente',
      });
    });
  });

  // ── getImpresion (regla: recibo cancelado) ──

  describe('getImpresion', () => {
    // Los mismos exports que reemplaza `jest.mock` arriba, tipados como mocks.
    const generatePdfMock = generateCertificadoPdf as jest.MockedFunction<
      typeof generateCertificadoPdf
    >;
    const resolveImagenesMock =
      resolveCertificadoImagenes as jest.MockedFunction<
        typeof resolveCertificadoImagenes
      >;
    const resolveQrMock = resolveCertificadoQr as jest.MockedFunction<
      typeof resolveCertificadoQr
    >;

    const impresionDto = {
      codigo: '0200182',
      certNro: 170,
      certAnio: '2025',
    };

    const cabecera = (estImprime: number, overrides: object = {}) => ({
      ID_TBL: '7792',
      IDRECIBO: '78138653',
      CODIGO: '0200182',
      // Tal como lo devuelve el SP: con ceros a la izquierda.
      CERT_NRO: '0170',
      CERT_ANIO: '2025',
      TIPO_DEUDA: '02.01',
      des_tipo_deuda: 'IMPUESTO PREDIAL',
      TIPO_PERIODO: '1',
      des_tipo_periodo: 'HASTA EL EJERCICIO FISCAL',
      OBSERVACION: 'Y ARBITRIOS MUNICIPALES HASTA EL AÑO  2024',
      CANT_IMPRESION: '0',
      IMPRESION: ' ',
      FEC_IMPRESION: '31/01/2025 12:29:45',
      ESTADO: '1',
      est_imprime: estImprime,
      numcertif: '167',
      ...overrides,
    });

    const filaReporte = (predio: string) => ({
      CODIGO: '0200182',
      NOMBRE: 'ACASIETE UCHUYA GLORIA LAULILA',
      CERT_NRO: '0167',
      CERT_ANIO: '2025',
      concepto: 'IMPUESTO PREDIAL',
      periodo: 'HASTA EL EJERCICIO FISCAL',
      OBSERVACION: 'Y ARBITRIOS MUNICIPALES HASTA EL AÑO  2024',
      predios: predio,
      FECHA: '31 de ENERO de 2025',
      num_ingr: '004220053',
      USU_REG: 'AGABRIEL',
      ESTACION_REG: 'COBRANZA-Lap01',
      ANIO_HR: '2025',
      hora_cer: '12:29:45 PM',
      documento: '21487124',
      tipodoc: 'DNI                      ',
      conyuge: null,
    });

    const filaMapeada = {
      codigo: '0200182',
      nombre: 'ACASIETE UCHUYA GLORIA LAULILA',
      certNro: '0167',
      certAnio: '2025',
      concepto: 'IMPUESTO PREDIAL',
      periodo: 'HASTA EL EJERCICIO FISCAL',
      observacion: 'Y ARBITRIOS MUNICIPALES HASTA EL AÑO  2024',
      predios: '',
      fecha: '31 de ENERO de 2025',
      numIngr: '004220053',
      usuReg: 'AGABRIEL',
      estacionReg: 'COBRANZA-Lap01',
      anioHr: '2025',
      horaCer: '12:29:45 PM',
      documento: '21487124',
      tipoDoc: 'DNI',
      conyuge: '',
    };

    beforeEach(() => {
      generatePdfMock.mockReset();
      resolveImagenesMock.mockReset();
      resolveQrMock.mockReset();
      resolveImagenesMock.mockResolvedValue({
        logoDataUri: null,
        escudoDataUri: null,
      });
      resolveQrMock.mockResolvedValue(null);
      generatePdfMock.mockResolvedValue(Buffer.from('fake-pdf'));
    });

    it('NO genera el PDF si el recibo no esta cancelado (est_imprime = 0)', async () => {
      executeProcedure.mockResolvedValueOnce(result([cabecera(0)]));

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'RECIBO_NO_CANCELADO',
        error:
          'El recibo de emision del certificado no esta cancelado; no se puede imprimir',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(
        'Certificado.sp_Certificado',
        { busc: 1, codigo: '0200182' },
        { codigo: mssql.Char(7) },
      );
      expect(generatePdfMock).not.toHaveBeenCalled();
    });

    it('con el recibo cancelado (est_imprime = 1) pide el reporte y genera el PDF', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(result([filaReporte('JR. LIMA 100')]));

      const res = await service.getImpresion(impresionDto);

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Certificado.sp_Certificado',
        { busc: 1, codigo: '0200182' },
        { codigo: mssql.Char(7) },
      );
      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Imprime_Certificado',
        { busc: 2, codigo: '0200182', certnro: 170, certanio: '2025' },
        {
          codigo: mssql.Char(7),
          certnro: mssql.Int,
          certanio: mssql.Char(4),
        },
      );
      expect(generatePdfMock).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: true,
        data: {
          buffer: Buffer.from('fake-pdf'),
          filename: 'certificado_0200182_170_2025.pdf',
        },
      });
    });

    it('resuelve el QR con la identidad pedida y lo pasa al generador', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(result([filaReporte('JR. LIMA 100')]));
      resolveQrMock.mockResolvedValue('<svg></svg>');

      await service.getImpresion(impresionDto);

      expect(resolveQrMock).toHaveBeenCalledWith({
        codigo: '0200182',
        certNro: 170,
        certAnio: '2025',
      });
      expect(generatePdfMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ qrSvg: '<svg></svg>' }),
      );
    });

    it('mapea una fila por predio, con los valores del SP normalizados', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(
          result([filaReporte('JR. LIMA 100'), filaReporte('JR. ICA 200')]),
        );

      await service.getImpresion(impresionDto);

      expect(generatePdfMock).toHaveBeenCalledWith(
        [
          { ...filaMapeada, predios: 'JR. LIMA 100' },
          { ...filaMapeada, predios: 'JR. ICA 200' },
        ],
        expect.anything(),
      );
    });

    it('acepta el CERT_NRO con ceros a la izquierda que devuelve el SP', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(result([filaReporte('JR. LIMA 100')]));

      const res = await service.getImpresion(impresionDto);

      expect(res.success).toBe(true);
      expect(generatePdfMock).toHaveBeenCalledTimes(1);
    });

    it('un certificado que no figura en el listado del contribuyente es NO_ENCONTRADO', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([cabecera(1, { CERT_NRO: '0999' })]),
      );

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'NO_ENCONTRADO',
        error: 'Certificado no encontrado',
      });
      expect(generatePdfMock).not.toHaveBeenCalled();
    });

    it('si el SP del reporte no devuelve filas es NO_ENCONTRADO', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(result([]));

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'NO_ENCONTRADO',
        error: 'Certificado no encontrado',
      });
    });

    it('envuelve el error del SP de la cabecera en PDF_ERROR', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'PDF_ERROR',
        error: 'Error al consultar el certificado',
      });
    });

    it('envuelve el error del SP del reporte en PDF_ERROR', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockRejectedValueOnce(new Error('boom'));

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'PDF_ERROR',
        error: 'Error al consultar los datos del certificado',
      });
    });

    it('envuelve el error del generador de PDF en PDF_ERROR', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabecera(1)]))
        .mockResolvedValueOnce(result([filaReporte('JR. LIMA 100')]));
      generatePdfMock.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getImpresion(impresionDto);

      expect(res).toEqual({
        success: false,
        code: 'PDF_ERROR',
        error: 'No se pudo generar el PDF del certificado',
      });
    });
  });

  // ── getImpresionPorToken (ruta publica del QR, sin sesion) ──

  describe('getImpresionPorToken', () => {
    const generatePdfMock = generateCertificadoPdf as jest.MockedFunction<
      typeof generateCertificadoPdf
    >;
    const resolveImagenesMock =
      resolveCertificadoImagenes as jest.MockedFunction<
        typeof resolveCertificadoImagenes
      >;

    // La configuracion exige un secreto de al menos 32 caracteres.
    const secret = 's'.repeat(32);
    const payload = { codigo: '0200182', certNro: 170, certAnio: '2025' };
    const originalSecret = process.env.CERTIFICADO_QR_SECRET;

    const cabeceraImprimible = {
      CERT_NRO: '0170',
      CERT_ANIO: '2025',
      est_imprime: 1,
    };
    const filaReporte = { NOMBRE: 'ACASIETE UCHUYA GLORIA LAULILA' };

    beforeEach(() => {
      process.env.CERTIFICADO_QR_SECRET = secret;
      generatePdfMock.mockReset();
      resolveImagenesMock.mockReset();
      resolveImagenesMock.mockResolvedValue({
        logoDataUri: null,
        escudoDataUri: null,
      });
      generatePdfMock.mockResolvedValue(Buffer.from('fake-pdf'));
    });

    afterEach(() => {
      if (originalSecret === undefined) {
        delete process.env.CERTIFICADO_QR_SECRET;
      } else {
        process.env.CERTIFICADO_QR_SECRET = originalSecret;
      }
    });

    it('con un token valido genera el PDF del certificado', async () => {
      executeProcedure
        .mockResolvedValueOnce(result([cabeceraImprimible]))
        .mockResolvedValueOnce(result([filaReporte]));

      const res = await service.getImpresionPorToken(
        buildCertificadoQrToken(payload, secret),
      );

      expect(res).toEqual({
        success: true,
        data: {
          buffer: Buffer.from('fake-pdf'),
          filename: 'certificado_0200182_170_2025.pdf',
        },
      });
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Certificado.sp_Certificado',
        { busc: 1, codigo: '0200182' },
        { codigo: mssql.Char(7) },
      );
      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Certificado.sp_Imprime_Certificado',
        { busc: 2, codigo: '0200182', certnro: 170, certanio: '2025' },
        {
          codigo: mssql.Char(7),
          certnro: mssql.Int,
          certanio: mssql.Char(4),
        },
      );
    });

    it('con un token alterado responde TOKEN_INVALIDO sin tocar la base', async () => {
      const token = buildCertificadoQrToken(payload, secret);
      const alterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      const res = await service.getImpresionPorToken(alterado);

      expect(res).toEqual({
        success: false,
        code: 'TOKEN_INVALIDO',
        error: 'Token de verificacion invalido',
      });
      expect(executeProcedure).not.toHaveBeenCalled();
    });

    it('con un token firmado con otro secreto responde TOKEN_INVALIDO', async () => {
      const res = await service.getImpresionPorToken(
        buildCertificadoQrToken(payload, 'otro-secreto'),
      );

      expect(res).toEqual({
        success: false,
        code: 'TOKEN_INVALIDO',
        error: 'Token de verificacion invalido',
      });
      expect(executeProcedure).not.toHaveBeenCalled();
    });

    it('sin CERTIFICADO_QR_SECRET responde PDF_ERROR (configuracion, no portador)', async () => {
      delete process.env.CERTIFICADO_QR_SECRET;

      const res = await service.getImpresionPorToken(
        buildCertificadoQrToken(payload, secret),
      );

      expect(res).toEqual({
        success: false,
        code: 'PDF_ERROR',
        error: 'No se pudo generar el PDF del certificado',
      });
      expect(executeProcedure).not.toHaveBeenCalled();
    });

    it('propaga NO_ENCONTRADO cuando el certificado ya no existe', async () => {
      executeProcedure.mockResolvedValueOnce(result([]));

      const res = await service.getImpresionPorToken(
        buildCertificadoQrToken(payload, secret),
      );

      expect(res).toEqual({
        success: false,
        code: 'NO_ENCONTRADO',
        error: 'Certificado no encontrado',
      });
    });

    it('propaga RECIBO_NO_CANCELADO sin generar el PDF', async () => {
      executeProcedure.mockResolvedValueOnce(
        result([{ ...cabeceraImprimible, est_imprime: 0 }]),
      );

      const res = await service.getImpresionPorToken(
        buildCertificadoQrToken(payload, secret),
      );

      expect(res).toEqual({
        success: false,
        code: 'RECIBO_NO_CANCELADO',
        error:
          'El recibo de emision del certificado no esta cancelado; no se puede imprimir',
      });
      expect(generatePdfMock).not.toHaveBeenCalled();
    });
  });
});
