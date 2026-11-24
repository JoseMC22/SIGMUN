import {
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { ValoresUnitariosService } from './valores-unitarios.service';
import { ValorUnitarioRow } from './dto/valores-unitarios.types';

/** Lee el cuerpo del envelope canónico sin depender de `any`. */
function responseOf(error: unknown): unknown {
  return (error as { getResponse(): unknown }).getResponse();
}

/** Captura un rechazo sin volver a ejecutar la operación bajo prueba. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un rechazo');
}

describe('ValoresUnitariosService', () => {
  let service: ValoresUnitariosService;
  let queryWithParams: jest.Mock;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const persistedRow: ValorUnitarioRow = {
    region: '1',
    anno: '2027',
    codi: 'A1',
    valor: 123.45,
    operador: 'mvaez',
    estacion: '10.0.0.1',
    fechor_ing: new Date('2026-11-23T12:00:00Z'),
  };

  const saveDto = {
    region: '1',
    anno: '2027',
    codi: 'A1',
    valor: 123.45,
  };

  beforeEach(async () => {
    queryWithParams = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoresUnitariosService,
        { provide: DatabaseService, useValue: { queryWithParams } },
      ],
    }).compile();

    service = module.get<ValoresUnitariosService>(ValoresUnitariosService);
  });

  describe('years', () => {
    it('devuelve los años distintos en orden descendente', async () => {
      queryWithParams.mockResolvedValueOnce({
        recordset: [{ anno: '2027' }, { anno: '2026' }],
      });

      const result = await service.years();

      expect(result).toEqual({ years: ['2027', '2026'] });
      expect(queryWithParams).toHaveBeenCalledWith(expect.any(String), {});
      const sql = queryWithParams.mock.calls[0][0] as string;
      expect(sql).toContain('SELECT DISTINCT');
      expect(sql).toContain('Calculo.Tblvaluni');
      expect(sql).toContain('ORDER BY');
    });

    it('envuelve errores de base de datos como database_unavailable', async () => {
      queryWithParams.mockRejectedValueOnce(new Error('login failed'));

      const error = await captureError(service.years());

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(responseOf(error)).toEqual({
        code: 'database_unavailable',
        message: 'Base de datos no disponible',
      });
    });

    it('registra el motivo del fallo sin exponer SQL ni credenciales', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const dbError = Object.assign(new Error('Invalid column name'), {
        code: 'EREQUEST',
        number: 207,
        state: 1,
      });
      queryWithParams.mockRejectedValueOnce(dbError);

      await captureError(service.years());

      expect(logError).toHaveBeenCalledTimes(1);
      const logged = String(logError.mock.calls[0][0]);
      expect(logged).toContain('Invalid column name');
      expect(logged).toContain('EREQUEST');
      expect(logged).toContain('207');
      expect(logged).not.toContain('DB_PASSWORD');
    });
  });

  describe('search', () => {
    it('filtra por año sin región y ordena por codi', async () => {
      queryWithParams.mockResolvedValueOnce({ recordset: [persistedRow] });

      const result = await service.search({ anno: '2027' });

      expect(result).toEqual({ data: [persistedRow] });
      const [sql, params] = queryWithParams.mock.calls[0] as [string, object];
      expect(sql).toContain('ORDER BY codi');
      expect(sql).toContain('@anno');
      expect(params).toEqual({ anno: '2027' });
    });

    it('agrega el filtro opcional de región con parámetro ligado', async () => {
      queryWithParams.mockResolvedValueOnce({ recordset: [] });

      const result = await service.search({ anno: '2027', region: '1' });

      expect(result).toEqual({ data: [] });
      const [sql, params] = queryWithParams.mock.calls[0] as [string, object];
      expect(sql).toContain('region = @region');
      expect(params).toEqual({ anno: '2027', region: '1' });
    });
  });

  describe('create', () => {
    it('lanza conflict cuando ya existe la clave natural', async () => {
      queryWithParams.mockResolvedValueOnce({ recordset: [persistedRow] });

      const error = await captureError(
        service.create(saveDto, 'mvaez', '10.0.0.1'),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(responseOf(error)).toEqual({
        code: 'conflict',
        message: 'La fila ya existe',
      });
      expect(queryWithParams).toHaveBeenCalledTimes(1); // solo el chequeo
    });

    it('inserta con auditoría sin escribir el IDENTITY y relee la fila por clave', async () => {
      queryWithParams
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ rowsAffected: [1] })
        .mockResolvedValueOnce({ recordset: [persistedRow] });

      const result = await service.create(saveDto, 'mvaez', '10.0.0.1');

      const insertCall = queryWithParams.mock.calls[1] as [string, object];
      expect(insertCall[0]).toContain('INSERT INTO Calculo.Tblvaluni');
      expect(insertCall[0]).toContain('GETDATE()');
      expect(insertCall[0]).toContain('fechor_ing)');
      expect(insertCall[0]).not.toContain('idsigma');
      expect(insertCall[0]).not.toContain('GETDATE(), 0)');
      expect(insertCall[1]).toEqual({
        region: '1',
        anno: '2027',
        codi: 'A1',
        valor: 123.45,
        operador: 'mvaez',
        estacion: '10.0.0.1',
      });
      expect(result).toEqual({
        message: 'Registro creado exitosamente',
        row: persistedRow,
      });
    });
  });

  describe('update', () => {
    it('actualiza valor y auditoría por clave natural y relee la fila', async () => {
      queryWithParams
        .mockResolvedValueOnce({ rowsAffected: [1] })
        .mockResolvedValueOnce({ recordset: [persistedRow] });

      const result = await service.update(saveDto, 'mvaez', '10.0.0.1');

      expect(queryWithParams).toHaveBeenCalledTimes(2);
      const [sql, params] = queryWithParams.mock.calls[0] as [string, object];
      expect(sql).toContain('UPDATE Calculo.Tblvaluni');
      expect(sql).toContain(
        'SET valor = @valor, operador = @operador, estacion = @estacion, fechor_ing = GETDATE()',
      );
      expect(sql).toContain('region = @region AND [año] = @anno AND codi = @codi');
      expect(sql).not.toContain('Historial');
      expect(sql).not.toContain('sp_Valuni_LogCambio');
      expect(sql).not.toContain("'A1'");
      expect(params).toEqual({
        region: '1',
        anno: '2027',
        codi: 'A1',
        valor: 123.45,
        operador: 'mvaez',
        estacion: '10.0.0.1',
      });
      expect(result).toEqual({
        message: 'Registro actualizado exitosamente',
        row: persistedRow,
      });
    });

    it('lanza not_found cuando rowsAffected es 0', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      queryWithParams.mockResolvedValueOnce({ rowsAffected: [0] });

      const error = await captureError(
        service.update(saveDto, 'mvaez', '10.0.0.1'),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(responseOf(error)).toEqual({
        code: 'not_found',
        message: 'No se encontró la fila',
      });
      expect(logError).not.toHaveBeenCalled();
      expect(queryWithParams).toHaveBeenCalledTimes(1);
    });

    it('envuelve otros errores de base de datos como database_unavailable', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const dbError = Object.assign(new Error('login failed'), {
        code: 'ELOGIN',
        number: 4060,
      });
      queryWithParams.mockRejectedValueOnce(dbError);

      const error = await captureError(
        service.update(saveDto, 'mvaez', '10.0.0.1'),
      );

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(responseOf(error)).toEqual({
        code: 'database_unavailable',
        message: 'Base de datos no disponible',
      });
      expect(logError).toHaveBeenCalledTimes(1);
      expect(String(logError.mock.calls[0][0])).toContain('4060');
    });
  });

  describe('remove', () => {
    it('elimina en un único batch con SESSION_CONTEXT y parámetros ligados', async () => {
      queryWithParams.mockResolvedValueOnce({ recordset: [{ affected: 1 }] });

      const result = await service.remove(
        '1',
        '2027',
        'A1',
        'mvaez',
        'SERVIDOR-01',
      );

      expect(queryWithParams).toHaveBeenCalledTimes(1);
      const [sql, params] = queryWithParams.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(sql).toContain('SET NOCOUNT ON;');
      const contextUser = sql.indexOf(
        "EXEC sys.sp_set_session_context @key = N'valuni_usuario', @value = @operador;",
      );
      const contextStation = sql.indexOf(
        "EXEC sys.sp_set_session_context @key = N'valuni_estacion', @value = @estacion;",
      );
      const deleteAt = sql.indexOf('DELETE FROM Calculo.Tblvaluni');
      const rowCountAt = sql.indexOf('SELECT @@ROWCOUNT AS affected;');
      expect(contextUser).toBeGreaterThan(-1);
      expect(contextStation).toBeGreaterThan(contextUser);
      expect(deleteAt).toBeGreaterThan(contextStation);
      expect(rowCountAt).toBeGreaterThan(deleteAt);
      expect(sql).toContain('region = @region AND [año] = @anno AND codi = @codi');
      expect(sql).not.toContain('Historial');
      expect(sql).not.toContain('sp_Valuni_LogCambio');
      expect(sql).not.toContain("'A1'");
      expect(params).toEqual({
        region: '1',
        anno: '2027',
        codi: 'A1',
        operador: 'mvaez',
        estacion: 'SERVIDOR-01',
      });
      expect(result).toEqual({ message: 'Registro eliminado exitosamente' });
    });

    it('lanza not_found cuando no hay fila que borrar', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      queryWithParams.mockResolvedValueOnce({ recordset: [{ affected: 0 }] });

      const error = await captureError(
        service.remove('1', '2027', 'A1', 'mvaez', 'SERVIDOR-01'),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(responseOf(error)).toEqual({
        code: 'not_found',
        message: 'No se encontró la fila',
      });
      expect(logError).not.toHaveBeenCalled();
      expect(queryWithParams).toHaveBeenCalledTimes(1);
    });

    it('envuelve otros errores de base de datos como database_unavailable', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const dbError = Object.assign(new Error('login failed'), {
        code: 'ELOGIN',
        number: 547,
      });
      queryWithParams.mockRejectedValueOnce(dbError);

      const error = await captureError(
        service.remove('1', '2027', 'A1', 'mvaez', 'SERVIDOR-01'),
      );

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(responseOf(error)).toEqual({
        code: 'database_unavailable',
        message: 'Base de datos no disponible',
      });
      expect(logError).toHaveBeenCalledTimes(1);
      expect(String(logError.mock.calls[0][0])).toContain('547');
    });
  });

  describe('upsertMany', () => {
    const bulkDto = {
      region: '1',
      anno: '2027',
      items: [
        { codi: 'A1', valor: 123.45 },
        { codi: 'I7', valor: 99.9 },
      ],
    };

    const bulkRow: ValorUnitarioRow = {
      ...persistedRow,
      codi: 'I7',
      valor: 99.9,
    };

    it('envía un único MERGE insert-only con parámetros generados, sin valores literales del usuario', async () => {
      queryWithParams.mockResolvedValueOnce({
        recordset: [persistedRow, bulkRow],
      });

      const result = await service.upsertMany(bulkDto, 'mvaez', '10.0.0.1');

      expect(queryWithParams).toHaveBeenCalledTimes(1);
      const [sql, params] = queryWithParams.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(sql).toContain('MERGE INTO Calculo.Tblvaluni AS T');
      expect(sql).toContain(
        'USING (VALUES (@codi0, CAST(@valor0 AS decimal(7,2))), (@codi1, CAST(@valor1 AS decimal(7,2))))',
      );
      expect(sql).toContain('ON T.region = @region AND T.[año] = @anno');
      expect(sql).not.toContain('WHEN MATCHED');
      expect(sql).not.toContain('UPDATE SET');
      expect(sql).toContain('WHEN NOT MATCHED THEN INSERT');
      expect(sql).toContain('fechor_ing)');
      expect(sql).not.toContain('idsigma');
      expect(sql).not.toContain('GETDATE(), 0)');
      expect(sql).toContain('OUTPUT INSERTED.region, INSERTED.[año] AS anno');
      expect(sql).not.toContain("'A1'");
      expect(sql).not.toContain("'I7'");
      expect(sql).not.toContain('123.45');
      expect(sql).not.toContain('99.9');
      expect(params).toEqual({
        region: '1',
        anno: '2027',
        operador: 'mvaez',
        estacion: '10.0.0.1',
        codi0: 'A1',
        valor0: 123.45,
        codi1: 'I7',
        valor1: 99.9,
      });
      expect(result).toEqual({
        message: expect.any(String),
        rows: [persistedRow, bulkRow],
        affected: 2,
      });
    });

    it('devuelve affected 0 cuando la base no devuelve recordset', async () => {
      queryWithParams.mockResolvedValueOnce({});

      const result = await service.upsertMany(
        { region: '1', anno: '2027', items: [{ codi: 'J7', valor: 0 }] },
        'mvaez',
        '10.0.0.1',
      );

      const [sql, params] = queryWithParams.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(sql).toContain('(@codi0, CAST(@valor0 AS decimal(7,2)))');
      expect(sql).not.toContain('@codi1');
      expect(params).toMatchObject({ codi0: 'J7', valor0: 0 });
      expect(result).toEqual({
        message: expect.any(String),
        rows: [],
        affected: 0,
      });
    });

    it('envuelve errores de base de datos como database_unavailable', async () => {
      queryWithParams.mockRejectedValueOnce(new Error('login failed'));

      const error = await captureError(
        service.upsertMany(bulkDto, 'mvaez', '10.0.0.1'),
      );

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(responseOf(error)).toEqual({
        code: 'database_unavailable',
        message: 'Base de datos no disponible',
      });
    });
  });
});
