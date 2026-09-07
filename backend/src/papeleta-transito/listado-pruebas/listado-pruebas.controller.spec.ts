import { Test, TestingModule } from '@nestjs/testing';
import { ListadoPruebasController } from './listado-pruebas.controller';
import { ListadoPruebasService } from './listado-pruebas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InfraccionRow, PaginatedResponse } from '../listado-de-infracciones/dto/listado-de-infracciones.types';

describe('ListadoPruebasController', () => {
  let controller: ListadoPruebasController;
  let service: jest.Mocked<ListadoPruebasService>;

  const mockService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListadoPruebasController],
      providers: [
        { provide: ListadoPruebasService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ListadoPruebasController>(ListadoPruebasController);
    service = module.get(ListadoPruebasService);
  });

  describe('POST /papeleta-transito/listado-pruebas/search', () => {
    it('should delegate to service.search with parsed DTO and return PaginatedResponse', async () => {
      const mockData: InfraccionRow[] = [
        {
          id: '1',
          placa: 'ABC-123',
          propietario: 'PEREZ JUAN',
          conductor: 'GARCIA LUIS',
          tipoVehiculo: 'SEDAN',
          codigoInfraccion: 'INF-2025-001',
          numeroInfraccion: 'NRO-001',
          codigo: 'COD-001',
          estadoImpresion: 'IMPRESO',
          estImpresion1: '0',
          codigoInfra: 'CI-001',
          fecha: '15/01/2025',
          monto: '150.00',
          estado: 'PENDIENTE',
          edt: 'EDT-001',
          imp: 'IMP-001',
          gnr: 'GNR-001',
          cmb: 'CMB-001',
          codigoPropietario: 'PROP-001',
          idRecibo: 'REC-001',
          tipo: 'TIPO-A',
          tipoRec: 'TIPO-REC',
        },
      ];
      const expected: PaginatedResponse<InfraccionRow> = {
        data: mockData,
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        placa: 'ABC',
        page: 1,
        pageSize: 15,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ placa: 'ABC', page: 1, pageSize: 15 }),
      );
    });

    it('should apply Zod defaults when body is empty', async () => {
      const expected: PaginatedResponse<InfraccionRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({} as any);

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 15 }),
      );
    });

    it('should pass all filter params to service', async () => {
      const expected: PaginatedResponse<InfraccionRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      await controller.search({
        placa: 'XYZ-999',
        propietario: 'GARCIA',
        codigoInfraccion: '001',
        anioInfraccion: '2025',
        conductor: 'LUIS',
        dniConductor: '87654321',
        page: 2,
        pageSize: 20,
      });

      expect(mockService.search).toHaveBeenCalledWith({
        placa: 'XYZ-999',
        propietario: 'GARCIA',
        codigoInfraccion: '001',
        anioInfraccion: '2025',
        conductor: 'LUIS',
        dniConductor: '87654321',
        page: 2,
        pageSize: 20,
      });
    });
  });
});