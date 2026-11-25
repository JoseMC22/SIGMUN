import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { ObrasComplementariasService } from './obras-complementarias.service';
import { ObraComplementariaRow } from './dto/obras-complementarias.types';

const SP_NAME = '[Calculo].[sp_MInstala]';

function responseOf(error: unknown): unknown {
  return (error as { getResponse(): unknown }).getResponse();
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un rechazo');
}

function mssqlError(number: number, message: string): Error {
  const error = new Error(message);
  (error as Error & { number: number }).number = number;
  return error;
}

describe('ObrasComplementariasService', () => {
  let service: ObrasComplementariasService;
  let executeProcedure: jest.Mock;

  const key = { id_instala: '001', anno: '2027', categ: 'A1' };
  const data = {
    instala: 'Obra complementaria',
    uni_med: 'UND',
    valor: 123.45,
    descri_gener: 'Descripción general',
  };
  const saveDto = { ...key, ...data };
  const persistedRow: ObraComplementariaRow = {
    ...saveDto,
    nestado: 1,
    vhostnm: 'SERVIDOR-01',
    vusernm: 'mvaez',
    ddatetm: new Date('2026-11-25T12:00:00Z'),
  };

  beforeEach(async () => {
    executeProcedure = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObrasComplementariasService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<ObrasComplementariasService>(
      ObrasComplementariasService,
    );
  });

  it('devuelve años distintos en orden descendente', async () => {
    executeProcedure.mockResolvedValueOnce({
      recordset: [{ anno: '2027' }, { anno: '2026' }],
    });

    await expect(service.years()).resolves.toEqual({
      years: ['2027', '2026'],
    });

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toMatchObject({
      Accion: 'ANIOS',
      vusernm: '',
      vhostnm: '',
    });
  });

  it('lista solo activos por año y no filtra categ cuando se omite', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [persistedRow] });

    await expect(service.search({ anno: '2027' })).resolves.toEqual({
      data: [persistedRow],
    });

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toEqual({
      Accion: 'CONSULTA',
      anno: '2027',
      FiltroCateg: 0,
      vusernm: '',
      vhostnm: '',
    });
  });

  it('compara categ NULL explícitamente cuando llega como filtro vacío normalizado', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [] });

    await service.search({ anno: '2027', categ: null });

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toEqual({
      Accion: 'CONSULTA',
      anno: '2027',
      FiltroCateg: 1,
      categ: null,
      vusernm: '',
      vhostnm: '',
    });
  });

  it('filtra una categoría informada con parámetro ligado', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [] });

    await service.search({ anno: '2027', categ: 'A1' });

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toEqual({
      Accion: 'CONSULTA',
      anno: '2027',
      FiltroCateg: 1,
      categ: 'A1',
      vusernm: '',
      vhostnm: '',
    });
  });

  it('rechaza duplicados por la clave natural cuando el SP tira 50009', async () => {
    executeProcedure.mockRejectedValueOnce(
      mssqlError(50009, 'Ya existe una fila con esa clave.'),
    );

    const error = await captureError(
      service.create({ ...saveDto, categ: null }, 'mvaez', 'SERVIDOR-01'),
    );

    expect(error).toBeInstanceOf(ConflictException);
    expect(responseOf(error)).toEqual({
      code: 'conflict',
      message: 'La fila ya existe',
    });
    expect(executeProcedure).toHaveBeenCalledTimes(1);
    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toMatchObject({
      Accion: 'ALTA',
      id_instala: '001',
      anno: '2027',
      categ: null,
      instala: data.instala,
      uni_med: data.uni_med,
      valor: data.valor,
      descri_gener: data.descri_gener,
      nestado: 1,
      vusernm: 'mvaez',
      vhostnm: 'SERVIDOR-01',
    });
  });

  it('inserta todas las columnas del esquema con accion ALTA', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [persistedRow] });

    await expect(
      service.create(saveDto, 'mvaez', 'SERVIDOR-01'),
    ).resolves.toEqual({
      message: 'Registro creado exitosamente',
      row: persistedRow,
    });

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toMatchObject({
      Accion: 'ALTA',
      nestado: 1,
      vusernm: 'mvaez',
      vhostnm: 'SERVIDOR-01',
    });
  });

  it('actualiza solo data y auditoría por la clave inmutable con accion MODIFICACION', async () => {
    const nullableKey = { ...key, categ: null };
    executeProcedure.mockResolvedValueOnce({
      recordset: [{ ...persistedRow, categ: null }],
    });

    const result = await service.update(
      { key: nullableKey, data },
      'mvaez',
      'SERVIDOR-01',
    );

    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toEqual({
      Accion: 'MODIFICACION',
      id_instala: '001',
      anno: '2027',
      categ: null,
      instala: data.instala,
      uni_med: data.uni_med,
      valor: data.valor,
      descri_gener: data.descri_gener,
      vusernm: 'mvaez',
      vhostnm: 'SERVIDOR-01',
    });
    expect(result).toEqual({
      message: 'Registro actualizado exitosamente',
      row: { ...persistedRow, categ: null },
    });
  });

  it('devuelve not_found si la actualización no afectó filas', async () => {
    executeProcedure.mockRejectedValueOnce(
      mssqlError(50010, 'No existe la fila con esa clave.'),
    );

    const error = await captureError(
      service.update({ key, data }, 'mvaez', 'SERVIDOR-01'),
    );

    expect(error).toBeInstanceOf(NotFoundException);
    expect(responseOf(error)).toEqual({
      code: 'not_found',
      message: 'No se encontró la fila',
    });
    expect(executeProcedure).toHaveBeenCalledTimes(1);
  });

  it('realiza baja lógica con accion BAJA y nunca DELETE físico', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [] });

    await expect(
      service.remove({ ...key, categ: null }, 'mvaez', 'SERVIDOR-01'),
    ).resolves.toEqual({ message: 'Registro desactivado exitosamente' });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    const [name, params] = executeProcedure.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SP_NAME);
    expect(params).toEqual({
      Accion: 'BAJA',
      id_instala: '001',
      anno: '2027',
      categ: null,
      vusernm: 'mvaez',
      vhostnm: 'SERVIDOR-01',
    });
  });

  it('devuelve not_found si la baja lógica no afectó filas', async () => {
    executeProcedure.mockRejectedValueOnce(
      mssqlError(50010, 'No existe la fila con esa clave.'),
    );

    const error = await captureError(
      service.remove(key, 'mvaez', 'SERVIDOR-01'),
    );

    expect(error).toBeInstanceOf(NotFoundException);
    expect(responseOf(error)).toEqual({
      code: 'not_found',
      message: 'No se encontró la fila',
    });
  });

  it('traduce errores de base de datos al envelope canónico sin filtrar el error original', async () => {
    executeProcedure.mockRejectedValueOnce(
      new Error('login failed; password=secreto'),
    );

    const error = await captureError(service.years());

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(responseOf(error)).toEqual({
      code: 'database_unavailable',
      message: 'Base de datos no disponible',
    });
  });
});
