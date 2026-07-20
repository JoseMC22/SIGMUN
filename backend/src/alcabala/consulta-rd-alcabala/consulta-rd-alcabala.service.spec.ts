/// <reference types="jest" />

import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala.service';
import { DatabaseService } from '../../database/database.service';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ConsultaRdAlcabalaService', () => {
  let service: ConsultaRdAlcabalaService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>> & { query: jest.Mock };

  const SP_NAME = 'Rentas.SP_ConsultadocuAlcabala';
  const SP_NAME_DETAIL = 'Rentas.SP_Dvalores';
  const SP_NAME_RUTA = 'Rentas.SP_MHRuta';

  beforeEach(() => {
    db = { executeProcedure: jest.fn(), query: jest.fn() };
    service = new ConsultaRdAlcabalaService(db as unknown as DatabaseService);
  });

  describe('search', () => {
    it('should call SP once with msquery=1 and empty date filters', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '12345',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        msquery: '1',
        codigo: '12345',
        unombre: '',
        inicio: '',
        final: '',
        id_valor: '08',
      });
    });

    it('should map contribuyente to @unombre param', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '',
        contribuyente: 'Empresa SAC',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        msquery: '1',
        codigo: '',
        unombre: 'Empresa SAC',
        inicio: '',
        final: '',
        id_valor: '08',
      });
    });



    it('should paginate client-side (page 2 of 50 records, pageSize 15)', async () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        ROW: i + 1,
        codigo: `C${String(i + 1).padStart(3, '0')}`,
        nombre: `Contribuyente ${i + 1}`,
        nomb_val: 'R.D. N°',
        num_val: `RD-${String(i + 1).padStart(5, '0')}`,
        ano_val: 2024,
        MontoTotal: 100 * (i + 1),
        fec_val: '2024-01-01',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: `REC-${i + 1}`,
      }));

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 2,
        pageSize: 15,
      });

      // page=2, pageSize=15 → slice(15, 30) = 15 items
      expect(result.success).toBe(true);
      expect(result.total).toBe(50);
      expect(result.data).toHaveLength(15);
      expect(result.data[0].ROW).toBe(16);
      expect(result.data[14].ROW).toBe(30);
      expect(result.totalPages).toBe(4);
    });

    it('should map SP rows to ConsultaRDRow domain type with all fields', async () => {
      const spRow = {
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D. N°',
        num_val: 'RD-00123',
        ano_val: 2024,
        MontoTotal: 150000.5,
        fec_val: '2024-06-15',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D. N°',
        num_val: 'RD-00123',
        ano_val: 2024,
        MontoTotal: 150000.5,
        fec_val: '2024-06-15',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by estado in-memory when provided', async () => {
      const rows = [
        { ROW: 1, codigo: '001', nombre: 'A', nomb_val: 'R.D.', num_val: 'RD-001', ano_val: 2024, MontoTotal: 100, fec_val: '', estado: 'PENDIENTE', fpago: 'Efectivo', recibo: 'R1' },
        { ROW: 2, codigo: '002', nombre: 'B', nomb_val: 'R.D.', num_val: 'RD-002', ano_val: 2024, MontoTotal: 200, fec_val: '', estado: 'ACTIVO', fpago: 'Placa', recibo: 'R2' },
        { ROW: 3, codigo: '003', nombre: 'C', nomb_val: 'R.D.', num_val: 'RD-003', ano_val: 2024, MontoTotal: 300, fec_val: '', estado: 'PENDIENTE', fpago: 'Efectivo', recibo: 'R3' },
      ];

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: 'PENDIENTE',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].num_val).toBe('RD-001');
      expect(result.data[1].num_val).toBe('RD-003');
    });

    it('should return success=false on SP error', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP error'));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al consultar registros');
    });

    it('should return totalPages=0 when no rows returned', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly (50 records, pageSize 15 = 4 pages)', async () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        ROW: i + 1,
        codigo: `C${i + 1}`,
        nombre: `N${i + 1}`,
        nomb_val: '',
        num_val: '',
        ano_val: 2024,
        MontoTotal: 0,
        fec_val: '',
        estado: '',
        fpago: '',
        recibo: '',
      }));

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.totalPages).toBe(4);
    });

    it('should always pass id_valor="08" for Alcabala', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, expect.objectContaining({
        id_valor: '08',
      }));
    });

    it('should handle SP returning null recordset gracefully', async () => {
      db.executeProcedure.mockResolvedValueOnce({ recordset: undefined } as any);

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle case-insensitive SP column names', async () => {
      const spRow = {
        ROW: 1,
        Codigo: '001',
        Nombre: 'Empresa SAC',
        Nomb_val: 'R.D.',
        Num_val: 'RD-001',
        Ano_val: 2024,
        Montototal: 1000,
        Fec_val: '2024-01-01',
        Estado: 'ACTIVO',
        Fpago: 'Efectivo',
        Recibo: 'REC-001',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data[0]).toEqual({
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
        num_val: 'RD-001',
        ano_val: 2024,
        MontoTotal: 1000,
        fec_val: '2024-01-01',
        estado: 'ACTIVO',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      });
    });
  });

  describe('getDetail', () => {
    it('should call SP_Dvalores with msquery=1 and correct params', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_DETAIL, {
        msquery: '1',
        id_valor: '08',
        num_val: 'RD-001',
        ano_val: '2024',
      });
    });

    it('should map detail rows to DetalleRDRow with actual SP_Dvalores columns', async () => {
      const spRows = [
        {
          no_name_1: 1,
          id: 0,
          anno: '2025',
          imp_insol: 137.56,
          imp_reaj: 137.56,
          costo_emis: 0,
          mora: 2.97,
          total: 140.53,
          anio: '2025',
        },
        {
          no_name_1: 2,
          id: 1,
          anno: '05',
          imp_insol: 137.56,
          imp_reaj: 137.56,
          costo_emis: 0,
          mora: 2.97,
          total: 140.53,
          anio: '2025',
        },
      ];

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(spRows));

      const result = await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].row_num).toBe(1);
      expect(result.data[0].id).toBe(0);
      expect(result.data[0].anno).toBe('2025');
      expect(result.data[0].imp_insol).toBe(137.56);
      expect(result.data[0].total).toBe(140.53);
      expect(result.data[0].anio).toBe('2025');
      expect(result.data[1].anno).toBe('05');
      expect(result.data[1].id).toBe(1);
      expect(result.nombre).toBe('Empresa SAC');
      expect(result.nomb_val).toBe('R.D.');
    });

    it('should preserve extra SP columns not explicitly mapped', async () => {
      const spRow = {
        no_name_1: 1,
        id: 0,
        anno: '2025',
        imp_insol: 100,
        imp_reaj: 100,
        costo_emis: 0,
        mora: 0,
        total: 100,
        anio: '2025',
        custom_field: 'extra_value',
        another_col: 42,
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: 'Empresa',
        nomb_val: 'R.D.',
      });

      expect(result.success).toBe(true);
      expect(result.data[0].custom_field).toBe('extra_value');
      expect(result.data[0].another_col).toBe(42);
    });

    it('should handle case-insensitive SP column names in detail', async () => {
      const spRow = {
        No_Name_1: 1,
        ID: 0,
        Anno: '2025',
        Imp_Insol: 500,
        Imp_Reaj: 500,
        Costo_Emis: 10,
        Mora: 5,
        Total: 515,
        ANIO: '2025',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data[0].row_num).toBe(1);
      expect(result.data[0].imp_insol).toBe(500);
      expect(result.data[0].total).toBe(515);
      expect(result.data[0].anio).toBe('2025');
    });

    it('should distinguish header rows (4-digit anio) from detail rows', async () => {
      const spRows = [
        { no_name_1: 1, id: 0, anno: '2025', imp_insol: 200, imp_reaj: 200, costo_emis: 0, mora: 5, total: 205, anio: '2025' },
        { no_name_1: 2, id: 1, anno: '05', imp_insol: 100, imp_reaj: 100, costo_emis: 0, mora: 2, total: 102, anio: '2025' },
        { no_name_1: 3, id: 2, anno: '10', imp_insol: 100, imp_reaj: 100, costo_emis: 0, mora: 3, total: 103, anio: '2025' },
        { no_name_1: 4, id: 0, anno: '2024', imp_insol: 300, imp_reaj: 300, costo_emis: 0, mora: 0, total: 300, anio: '2024' },
        { no_name_1: 5, id: 1, anno: '01', imp_insol: 300, imp_reaj: 300, costo_emis: 0, mora: 0, total: 300, anio: '2024' },
      ];

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(spRows));

      const result = await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);

      // Row 1: header (4-digit anio)
      expect(result.data[0].anio).toBe('2025');
      expect(result.data[0].id).toBe(0);

      // Row 2-3: detail rows under 2025 header (non-4-digit anio)
      expect(result.data[1].anno).toBe('05');
      expect(result.data[1].anio).toBe('2025');
      expect(result.data[2].anno).toBe('10');

      // Row 4: header (4-digit anio)
      expect(result.data[3].anio).toBe('2024');
      expect(result.data[3].id).toBe(0);

      // Row 5: detail under 2024 header
      expect(result.data[4].anno).toBe('01');
      expect(result.data[4].anio).toBe('2024');
    });

    it('should return success=false on SP error', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP error'));

      const result = await service.getDetail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al consultar detalle del RD');
      expect(result.data).toEqual([]);
    });

    it('should return empty data when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.getDetail({
        num_val: 'RD-999',
        ano_val: '2024',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle SP returning null recordset gracefully', async () => {
      db.executeProcedure.mockResolvedValueOnce({ recordset: undefined } as any);

      const result = await service.getDetail({
        num_val: '',
        ano_val: '',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should default empty strings for missing params', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.getDetail({
        num_val: '',
        ano_val: '',
        nombre: '',
        nomb_val: '',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_DETAIL, {
        msquery: '1',
        id_valor: '08',
        num_val: '',
        ano_val: '',
      });
    });
  });

  describe('getRuta', () => {
    it('should call SP_MHRuta with msquery=3 and correct params', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.getRuta({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_RUTA, {
        msquery: '3',
        id_valor: '08',
        num_val: 'RD-001',
        ano_val: '2025',
      });
    });

    it('should return ruta rows with dynamic columns preserved', async () => {
      const spRows = [
        {
          fecha: '2025-01-15',
          destino: 'Municipalidad',
          observacion: 'Tramite completado',
          monto: 500,
        },
        {
          fecha: '2025-02-10',
          destino: 'Sunat',
          observacion: 'Verificacion',
          monto: 0,
        },
      ];

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(spRows));

      const result = await service.getRuta({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].fecha).toBe('2025-01-15');
      expect(result.data[0].destino).toBe('Municipalidad');
      expect(result.data[0].monto).toBe(500);
      expect(result.data[1].fecha).toBe('2025-02-10');
      expect(result.nombre).toBe('Empresa SAC');
      expect(result.nomb_val).toBe('R.D.');
    });

    it('should return success=true with empty data when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.getRuta({
        num_val: 'RD-999',
        ano_val: '2025',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return success=false on SP error', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP error'));

      const result = await service.getRuta({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al consultar ruta del RD');
      expect(result.data).toEqual([]);
    });

    it('should handle SP returning null recordset gracefully', async () => {
      db.executeProcedure.mockResolvedValueOnce({ recordset: undefined } as any);

      const result = await service.getRuta({
        num_val: '',
        ano_val: '',
        nombre: '',
        nomb_val: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should always pass id_valor="08" for Alcabala', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.getRuta({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: '',
        nomb_val: '',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_RUTA, expect.objectContaining({
        id_valor: '08',
      }));
    });

    it('should default empty strings for missing params', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.getRuta({
        num_val: '',
        ano_val: '',
        nombre: '',
        nomb_val: '',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_RUTA, {
        msquery: '3',
        id_valor: '08',
        num_val: '',
        ano_val: '',
      });
    });
  });

  describe('getImprimir', () => {
    const SP_NAME_IMPRIMIR = 'Rentas.sp_Imprime_alcabala';

    it('should merge plantilla HTML with SP data row', async () => {
      db.query.mockResolvedValueOnce({ recordset: [{ plantilla: '<p>@nombre</p>' }] });
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ nombre: 'TEST' }]));

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(true);
      expect(result.html).toBe('<p>TEST</p>');
      expect(result.html).not.toContain('@nombre');
    });

    it('should replace multiple placeholders case-insensitively', async () => {
      db.query.mockResolvedValueOnce({
        recordset: [{ plantilla: '<p>@NOMBRE - @NUM_VAL</p>' }],
      });
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ nombre: 'Empresa', NUM_VAL: 'RD-099' }]),
      );

      const result = await service.getImprimir({ num_val: 'RD-099', ano_val: '2025' });

      expect(result.success).toBe(true);
      expect(result.html).toBe('<p>Empresa - RD-099</p>');
    });

    it('should call SP with buscar=1 and id_valor=08', async () => {
      db.query.mockResolvedValueOnce({ recordset: [{ plantilla: '<p>@x</p>' }] });
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ any_col: 'x' }]));

      await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_IMPRIMIR, {
        buscar: 1,
        id_valor: '08',
        num_val: 'RD-001',
        ano_val: '2025',
      });
    });

    it('should return success=false when SP returns no rows', async () => {
      db.query.mockResolvedValueOnce({ recordset: [{ plantilla: '<p>Template</p>' }] });
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No se encontraron datos para imprimir');
    });

    it('should return success=false when plantilla is empty', async () => {
      db.query.mockResolvedValueOnce({ recordset: [] });
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ nombre: 'TEST' }]));

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Plantilla');
    });

    it('should return success=false on SP error', async () => {
      db.query.mockResolvedValueOnce({ recordset: [{ plantilla: '<p>@x</p>' }] });
      db.executeProcedure.mockRejectedValueOnce(new Error('SP error'));

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al generar impresión del RD');
    });

    it('should return success=false on query error', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al generar impresión del RD');
    });

    it('should replace null/undefined SP values with empty string', async () => {
      db.query.mockResolvedValueOnce({
        recordset: [{ plantilla: '@nombre|@email' }],
      });
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ nombre: 'OK', email: null }]),
      );

      const result = await service.getImprimir({ num_val: 'RD-001', ano_val: '2025' });

      expect(result.success).toBe(true);
      expect(result.html).toBe('OK|');
    });

    it('should default empty strings when num_val/ano_val are empty', async () => {
      db.query.mockResolvedValueOnce({ recordset: [{ plantilla: '<p>@x</p>' }] });
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ x: 1 }]));

      await service.getImprimir({ num_val: '', ano_val: '' });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME_IMPRIMIR, {
        buscar: 1,
        id_valor: '08',
        num_val: '',
        ano_val: '',
      });
    });
  });
});
