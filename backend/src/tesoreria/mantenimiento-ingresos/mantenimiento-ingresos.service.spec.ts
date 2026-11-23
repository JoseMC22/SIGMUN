import { Test, TestingModule } from '@nestjs/testing';
import { MantenimientoIngresosService } from './mantenimiento-ingresos.service';
import { DatabaseService } from '../../database/database.service';

describe('MantenimientoIngresosService', () => {
  let service: MantenimientoIngresosService;
  let db: { executeProcedure: jest.Mock };

  // Fila real del recordset de dbo.t_tipo_sing @msquery=15 (probe en vivo,
  // 2026-11-23): FteFin se escribe con esa casing y Tupa es columna nueva.
  const spRow = {
    Tipo: '00.01',
    Nombre_Tipo: 'ALQUILER DE FINCAS',
    Partida: '1.3. 3',
    Nombre: 'EDIFICIOS',
    FteFin: '09',
    Tupa: 'MUNI',
    Valor: 0,
    ROW: 1,
  };

  beforeEach(async () => {
    db = { executeProcedure: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientoIngresosService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get(MantenimientoIngresosService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── search(): mapeo del resultado del SP ───────────────────────────────

  it('maptea FteFin a ftefin y expone Tupa como tupa', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [spRow] });

    const res = await service.search({
      criterio: 'C',
      valor: '',
      page: 1,
      pageSize: 15,
    });

    expect(res.data[0]).toEqual(
      expect.objectContaining({ ftefin: '09', tupa: 'MUNI' }),
    );
  });
});
