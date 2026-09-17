import { ListadoPruebasService } from './listado-pruebas.service';
import { DatabaseService } from '../../database/database.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ListadoPruebasService', () => {
  let service: ListadoPruebasService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new ListadoPruebasService(db as unknown as DatabaseService);
  });

  describe('search', () => {
    it('should call SP with msquery=1 for count and msquery=2 with pagination for data', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 30 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({ page: 1, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'papeleta.consultainfractor',
        expect.objectContaining({
          msquery: '1',
          placa: '',
          propie: '',
          infrac: '',
          infracanio: '',
          conduc: '',
          dniconduc: '',
        }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'papeleta.consultainfractor',
        expect.objectContaining({
          msquery: '2',
          start: 1,
          end: 15,
        }),
      );
    });

    it('should pass filter params to SP calls', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 5 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({
        placa: 'ABC-123',
        propietario: 'PEREZ',
        codigoInfraccion: '001',
        anioInfraccion: '2025',
        conductor: 'JUAN',
        dniConductor: '12345678',
        page: 1,
        pageSize: 15,
      });

      const expectedParams = expect.objectContaining({
        placa: 'ABC-123',
        propie: 'PEREZ',
        infrac: '001',
        infracanio: '2025',
        conduc: 'JUAN',
        dniconduc: '12345678',
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'papeleta.consultainfractor',
        expectedParams,
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'papeleta.consultainfractor',
        expectedParams,
      );
    });

    it('should prefer explicit infrac param over codigoInfraccion', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({ infrac: 'X-01', codigoInfraccion: '001', page: 1, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'papeleta.consultainfractor',
        expect.objectContaining({ infrac: 'X-01' }),
      );
    });

    it('should calculate correct start and end for page 2', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 50 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({ page: 2, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'papeleta.consultainfractor',
        expect.objectContaining({ start: 16, end: 30 }),
      );
    });

    it('should map SP result rows to InfraccionRow correctly using named columns', async () => {
      const namedRow = {
        idtramplac: 175877,
        codplac: 'ABC-123',
        cnomprop: 'PEREZ JUAN',
        cnomcond: 'GARCIA LUIS',
        desvehi: 'SEDAN',
        estado: '9',
        numapap: '2026',
        numnpap: '300299',
        indice: 1280688,
        talonario: '01',
        codigocond: 'P303011',
        filtro: 1,
        filtro1: 1,
        codinfr: 'L.04',
        fecha: '15/01/2025',
        valpape: 150,
        descrip: 'PENDIENTE',
        edt: 'N',
        imp: 'N',
        gnr: 'N',
        cmb: 'N',
        codigoProp: 'PROP-001',
        idrecibo: 103427955,
        tipo: '10.86',
        tipo_rec: '10.86',
      };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([namedRow]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: '1280688',
        placa: 'ABC-123',
        propietario: 'PEREZ JUAN',
        conductor: 'GARCIA LUIS',
        tipoVehiculo: 'SEDAN',
        codigoInfraccion: '2026-01-300299',
        numeroInfraccion: '300299',
        codigo: 'P303011',
        estadoImpresion: '1',
        estImpresion1: '1',
        codigoInfra: 'L.04',
        fecha: '15/01/2025',
        monto: '150',
        estado: 'PENDIENTE',
        edt: 'N',
        imp: 'N',
        gnr: 'N',
        cmb: 'N',
        codigoPropietario: 'PROP-001',
        idRecibo: '103427955',
        tipo: '10.86',
        tipoRec: '10.86',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(15);
      expect(result.totalPages).toBe(1);
    });

    it('should return totalPages=0 when total is 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should handle count from first column of count result', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ infracciones: 25 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(2);
    });

    it('should map null fields to empty strings', async () => {
      const sparseRow = { codplac: 'XYZ-999', cnomprop: null, cnomcond: null, indice: null };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([sparseRow]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data[0].id).toBe('');
      expect(result.data[0].placa).toBe('XYZ-999');
      expect(result.data[0].propietario).toBe('');
      expect(result.data[0].conductor).toBe('');
    });
  });
});