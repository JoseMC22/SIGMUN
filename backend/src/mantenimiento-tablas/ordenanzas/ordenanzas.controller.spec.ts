import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdenanzasController } from './ordenanzas.controller';
import { OrdenanzasService } from './ordenanzas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdenanzaRow, OrdenanzaDetalleRow } from './dto/ordenanzas.types';

describe('OrdenanzasController', () => {
  let controller: OrdenanzasController;
  // Tipado plano (patrón cuadre-caja.controller.spec): OrdenanzasService
  // tiene una propiedad Logger y jest.Mocked<OrdenanzasService> (deep-mock)
  // no es asignable desde la instancia real que devuelve module.get.
  let service: OrdenanzasService;

  const mockService = {
    listar: jest.fn(),
    crear: jest.fn(),
    editar: jest.fn(),
    detalle: jest.fn(),
    editarDetalle: jest.fn(),
  };

  // Fila de ejemplo alineada con el SP en vivo (S3): char sin padding
  // (el service recorta), fechas ISO en passthrough (el front formatea).
  const row: OrdenanzaRow = {
    idordenanza: 1,
    criterio: '1',
    descripcion: 'Pronto Pago',
    fec_desde: '2013-09-01T00:00:00.000Z',
    fec_hasta: '2013-09-30T00:00:00.000Z',
    observacion: 'Pronto pago de arbitrios',
    estado: '0',
    operador: 'SISTEMAS',
    estacion: 'SERVIDOR',
    fech_ing: '2013-08-15T10:30:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdenanzasController],
      providers: [{ provide: OrdenanzasService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdenanzasController>(OrdenanzasController);
    service = module.get<OrdenanzasService>(OrdenanzasService);
  });

  // ── GET /api/mantenimiento-tablas/ordenanzas ──────────

  describe('GET /mantenimiento-tablas/ordenanzas', () => {
    it('should return { data: [row] } and delegate to the service', async () => {
      mockService.listar.mockResolvedValue({ data: [row] });

      const result = await controller.listar();

      expect(result).toEqual({ data: [row] });
      expect(mockService.listar).toHaveBeenCalledTimes(1);
      expect(mockService.listar).toHaveBeenCalledWith();
    });

    it('should return { data: [] } without exception when the service returns an empty list', async () => {
      // Contrato S3: lista vacía → { data: [] } SIN NotFoundException
      // (distinto de mantenimiento-uit, que lanza por año).
      mockService.listar.mockResolvedValue({ data: [] });

      const result = await controller.listar();

      expect(result).toEqual({ data: [] });
      expect(mockService.listar).toHaveBeenCalledTimes(1);
      expect(mockService.listar).toHaveBeenCalledWith();
    });
  });

  // ── POST /api/mantenimiento-tablas/ordenanzas (alta master, T5/S1) ──

  describe('POST /mantenimiento-tablas/ordenanzas', () => {
    // Body del alta según el contrato del modal (YYYY-MM-DD en fechas;
    // el service las normaliza a YYYYMMDD para el SP).
    const validBody = {
      criterio: 11,
      descripcion: 'Pronto Pago',
      fdesde: '2024-01-01',
      fhasta: '2024-12-31',
      observacion: 'Beneficio por pago oportuno',
      estacion: 'PC-SISTEMAS',
    };

    // req.user viene del JwtAuthGuard (patrón mantenimiento-vias).
    const req = { user: { username: 'ADMIN' } };

    it('should create the ordenanza delegating to the service with the session operator', async () => {
      mockService.crear.mockResolvedValue({
        message: 'Ordenanza creada exitosamente',
      });

      const result = await controller.crear(validBody, req as never);

      expect(result).toEqual({ message: 'Ordenanza creada exitosamente' });
      expect(mockService.crear).toHaveBeenCalledTimes(1);
      // El dto validado por Zod (defaults aplicados) + operador de sesión.
      expect(mockService.crear).toHaveBeenCalledWith(
        {
          criterio: 11,
          descripcion: 'Pronto Pago',
          fdesde: '2024-01-01',
          fhasta: '2024-12-31',
          observacion: 'Beneficio por pago oportuno',
          estacion: 'PC-SISTEMAS',
        },
        'ADMIN',
      );
    });

    it('should reject an invalid fdesde (not YYYY-MM-DD) with BadRequestException without calling the service', async () => {
      const invalidBody = { ...validBody, fdesde: '13/09/2013' };

      await expect(
        controller.crear(invalidBody, req as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.crear).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /mantenimiento-tablas/ordenanzas/:id (update master, T6/S1) ──

  describe('PATCH /mantenimiento-tablas/ordenanzas/:id', () => {
    // Body del update = mismo esquema del alta (CrearOrdenanzaSchema);
    // fechas YYYY-MM-DD (el service las normaliza a YYYYMMDD para el SP).
    const validBody = {
      criterio: 11,
      descripcion: 'Pronto Pago 2024',
      fdesde: '2024-01-01',
      fhasta: '2024-12-31',
      observacion: 'Observación editada',
      estacion: 'PC-SISTEMAS',
    };

    // req.user viene del JwtAuthGuard (patrón mantenimiento-vias).
    const req = { user: { username: 'ADMIN' } };

    it('should update the ordenanza delegating to the service with the session operator', async () => {
      mockService.editar.mockResolvedValue({
        message: 'Ordenanza actualizada exitosamente',
      });

      const result = await controller.editar('5', validBody, req as never);

      expect(result).toEqual({
        message: 'Ordenanza actualizada exitosamente',
      });
      expect(mockService.editar).toHaveBeenCalledTimes(1);
      // El dto validado por Zod (defaults aplicados) + operador de sesión.
      expect(mockService.editar).toHaveBeenCalledWith(
        5,
        {
          criterio: 11,
          descripcion: 'Pronto Pago 2024',
          fdesde: '2024-01-01',
          fhasta: '2024-12-31',
          observacion: 'Observación editada',
          estacion: 'PC-SISTEMAS',
        },
        'ADMIN',
      );
    });

    it('should NOT call the service on empty/non-numeric/negative id (BadRequestException)', async () => {
      // Vacío (coerce Number('') = 0, no positivo), texto y negativo → 400.
      for (const invalid of ['', 'abc', '-1']) {
        await expect(
          controller.editar(invalid, validBody, req as never),
        ).rejects.toThrow(BadRequestException);
      }
      expect(mockService.editar).not.toHaveBeenCalled();
    });

    it('should reject an invalid body (not YYYY-MM-DD) with BadRequestException without calling the service', async () => {
      const invalidBody = { ...validBody, fhasta: '31/12/2024' };

      await expect(
        controller.editar('5', invalidBody, req as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.editar).not.toHaveBeenCalled();
    });
  });

  // ── GET /mantenimiento-tablas/ordenanzas/detalle (T9/iteración 4, msquery=4) ──

  describe('GET /mantenimiento-tablas/ordenanzas/detalle', () => {
    // Fila de ejemplo alineada con el SP re-modelado en vivo (msquery=4, 13/10
    // ~16:32): Año/TIPO_REC/CONCEPTO + montos — el backend ya NO filtra en
    // memoria (el SP filtra server-side con @idordenanza).
    const detalleRow: OrdenanzaDetalleRow = {
      idDetalle: 9,
      cidordenanza: 1,
      anno: '2013',
      tipoRec: '02.01',
      concepto: 'IMPUESTO AL PATRIMONIO PREDIAL',
      impInsol: 46.2,
      impReaj: 0,
      mora: 10.5,
      costoEmis: 2.5,
      tipo: '02.01',
      observacion: '',
      estado: '1',
    };

    it('should return { data: [row] } and delegate to the service with the id coerced to int', async () => {
      mockService.detalle.mockResolvedValue({ data: [detalleRow] });

      const result = await controller.detalle('1');

      expect(result).toEqual({ data: [detalleRow] });
      expect(mockService.detalle).toHaveBeenCalledTimes(1);
      expect(mockService.detalle).toHaveBeenCalledWith(1);
    });

    it('should NOT call the service on empty/non-numeric/negative idordenanza (BadRequestException)', async () => {
      // Vacío (coerce Number('') = 0, no positivo), texto y negativo → 400.
      for (const invalid of ['', 'abc', '-1']) {
        await expect(controller.detalle(invalid)).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(mockService.detalle).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /mantenimiento-tablas/ordenanzas/detalle/:id (update detalle, T3/S1, msquery=8) ──

  describe('PATCH /mantenimiento-tablas/ordenanzas/detalle/:id', () => {
    // Body del update detalle (T3 + T7): cidordenanza + anno YYYY +
    // tipoRec + 4 montos ≥ 0 + tipo/observacion/estado preservados (no
    // editables, viajan tal cual al modo 8). La estación viaja por header
    // x-estacion (el SP la exige sin default); el operador sale de la sesión.
    const validBody = {
      cidordenanza: 2,
      anno: '2013',
      tipoRec: '02.01',
      impInsol: 46.2,
      impReaj: 0,
      mora: 10.5,
      costoEmis: 2.5,
      tipo: '02.01',
      observacion: '',
      estado: '1',
    };

    // req.user viene del JwtAuthGuard (patrón mantenimiento-vias).
    const req = { user: { username: 'ADMIN' }, headers: {} };

    it('should update the detalle row delegating to the service with the PK + session operator', async () => {
      mockService.editarDetalle.mockResolvedValue({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });

      const result = await controller.editarDetalle('9', validBody, req as never);

      expect(result).toEqual({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });
      expect(mockService.editarDetalle).toHaveBeenCalledTimes(1);
      expect(mockService.editarDetalle).toHaveBeenCalledWith(
        9,
        { ...validBody, estacion: '' },
        'ADMIN',
      );
    });

    it('should forward the x-estacion header as estacion', async () => {
      mockService.editarDetalle.mockResolvedValue({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });

      const reqWithEstacion = {
        user: { username: 'ADMIN' },
        headers: { 'x-estacion': 'PC-SISTEMAS' },
      };

      await controller.editarDetalle('9', validBody, reqWithEstacion as never);

      expect(mockService.editarDetalle).toHaveBeenCalledWith(
        9,
        { ...validBody, estacion: 'PC-SISTEMAS' },
        'ADMIN',
      );
    });

    it('should NOT call the service on empty/non-numeric/negative id (BadRequestException)', async () => {
      // Vacío (coerce Number('') = 0, no positivo), texto y negativo → 400.
      for (const invalid of ['', 'abc', '-1']) {
        await expect(
          controller.editarDetalle(invalid, validBody, req as never),
        ).rejects.toThrow(BadRequestException);
      }
      expect(mockService.editarDetalle).not.toHaveBeenCalled();
    });

    it('should reject an invalid anno (not YYYY), empty tipo/estado or negative amounts with BadRequestException without calling the service', async () => {
      for (const invalidBody of [
        { ...validBody, anno: '13' },
        { ...validBody, anno: '2013 ' },
        { ...validBody, tipoRec: '' },
        { ...validBody, tipo: '' },
        { ...validBody, estado: '' },
        { ...validBody, tipo: undefined },
        { ...validBody, estado: undefined },
        { ...validBody, impInsol: -1 },
        { ...validBody, mora: -0.5 },
      ]) {
        await expect(
          controller.editarDetalle('9', invalidBody, req as never),
        ).rejects.toThrow(BadRequestException);
      }

      expect(mockService.editarDetalle).not.toHaveBeenCalled();
    });

    it('should accept an empty observacion (preserved, may legitimately be blank)', async () => {
      mockService.editarDetalle.mockResolvedValue({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });

      const result = await controller.editarDetalle(
        '9',
        { ...validBody, observacion: '' },
        req as never,
      );

      expect(result).toEqual({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });
      expect(mockService.editarDetalle).toHaveBeenCalledTimes(1);
    });
  });
});
