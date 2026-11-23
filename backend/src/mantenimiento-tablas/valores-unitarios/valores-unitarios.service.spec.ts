import {
  ConflictException,
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

    it('inserta con auditoría, sin idsigma, y relee la fila por clave', async () => {
      queryWithParams
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ rowsAffected: [1] })
        .mockResolvedValueOnce({ recordset: [persistedRow] });

      const result = await service.create(saveDto, 'mvaez', '10.0.0.1');

      const insertCall = queryWithParams.mock.calls[1] as [string, object];
      expect(insertCall[0]).toContain('INSERT INTO Calculo.Tblvaluni');
      expect(insertCall[0]).toContain('GETDATE()');
      expect(insertCall[0]).not.toContain('idsigma');
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

      const [sql, params] = queryWithParams.mock.calls[0] as [string, object];
      expect(sql).toContain('UPDATE Calculo.Tblvaluni');
      expect(sql).toContain('fechor_ing = GETDATE()');
      expect(sql).toContain('region = @region');
      expect(sql).toContain('[año] = @anno');
      expect(sql).toContain('codi = @codi');
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

    it('lanza not_found cuando la fila no existe', async () => {
      queryWithParams.mockResolvedValueOnce({ rowsAffected: [0] });

      const error = await captureError(
        service.update(saveDto, 'mvaez', '10.0.0.1'),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(responseOf(error)).toEqual({
        code: 'not_found',
        message: 'No se encontró la fila',
      });
      expect(queryWithParams).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('elimina físicamente por clave natural', async () => {
      queryWithParams.mockResolvedValueOnce({ rowsAffected: [1] });

      const result = await service.remove('1', '2027', 'A1');

      const [sql, params] = queryWithParams.mock.calls[0] as [string, object];
      expect(sql).toContain('DELETE FROM Calculo.Tblvaluni');
      expect(params).toEqual({ region: '1', anno: '2027', codi: 'A1' });
      expect(result).toEqual({ message: 'Registro eliminado exitosamente' });
    });

    it('lanza not_found cuando no hay fila que borrar', async () => {
      queryWithParams.mockResolvedValueOnce({ rowsAffected: [0] });

      const error = await captureError(service.remove('1', '2027', 'A1'));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(responseOf(error)).toEqual({
        code: 'not_found',
        message: 'No se encontró la fila',
      });
    });
  });
});
