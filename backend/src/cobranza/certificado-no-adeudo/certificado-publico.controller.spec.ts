/// <reference types="jest" />

import { Response } from 'express';
import { CertificadoPublicoController } from './certificado-publico.controller';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';

/** Solo los metodos de `Response` que el controller toca. */
interface MockResponse {
  set: jest.Mock;
  end: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
}

function mockRes(): MockResponse {
  const res: MockResponse = {
    set: jest.fn(),
    end: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  // `status(...)` devuelve `this` para poder encadenar `.json(...)`.
  res.status.mockReturnValue(res);
  return res;
}

/**
 * El controller solo usa `set/end/status/json`, asi que el doble no implementa
 * el resto de `Response`. El cast queda acotado a este helper.
 */
const asResponse = (res: MockResponse): Response =>
  res as unknown as Response;

/**
 * La ruta publica es la unica del modulo sin sesion: el contrato que importa
 * es (a) no llevar guard, (b) no filtrar mas de lo necesario y (c) responder
 * el PDF con `inline` y sin cache.
 */
describe('CertificadoPublicoController', () => {
  let controller: CertificadoPublicoController;
  let service: jest.Mocked<
    Pick<CertificadoNoAdeudoService, 'getImpresionPorToken'>
  >;

  const buffer = Buffer.from('%PDF-1.4 fake');
  const token = 'v1.MDIwMDE4Mi8xNzAtMjAyNQ.ipl8M-x4qEYA_0HqIxdYEPoJFKuUnLZO_-ttrgcjjVw';

  beforeEach(() => {
    service = { getImpresionPorToken: jest.fn() };
    controller = new CertificadoPublicoController(
      service as unknown as CertificadoNoAdeudoService,
    );
  });

  it('no aplica guards (el QR se escanea sin sesion)', () => {
    expect(
      Reflect.getMetadata('__guards__', CertificadoPublicoController),
    ).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', controller.pdf)).toBeUndefined();
  });

  it('sirve el PDF inline, sin cache y con el nombre del certificado', async () => {
    service.getImpresionPorToken.mockResolvedValue({
      success: true,
      data: {
        buffer,
        filename: 'certificado_0200182_170_2025.pdf',
      },
    });
    const res = mockRes();

    await controller.pdf(token, asResponse(res));

    expect(service.getImpresionPorToken).toHaveBeenCalledWith(token);
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'inline; filename="certificado_0200182_170_2025.pdf"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store',
    });
    expect(res.end).toHaveBeenCalledWith(buffer);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza sin token y no llama al service', async () => {
    const res = mockRes();

    await controller.pdf(undefined, asResponse(res));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'PARAMETROS_INVALIDOS',
      error: 'El parametro codigo es obligatorio',
    });
    expect(service.getImpresionPorToken).not.toHaveBeenCalled();
  });

  it('rechaza un token vacio o solo espacios', async () => {
    const res = mockRes();

    await controller.pdf('   ', asResponse(res));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'PARAMETROS_INVALIDOS',
      error: 'El parametro codigo es obligatorio',
    });
    expect(service.getImpresionPorToken).not.toHaveBeenCalled();
  });

  it('rechaza un token gigante antes de verificar la firma', async () => {
    const res = mockRes();

    await controller.pdf(
      'v1.' + 'a'.repeat(600),
      asResponse(res),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'PARAMETROS_INVALIDOS',
      error: 'El token de verificacion es demasiado largo',
    });
    expect(service.getImpresionPorToken).not.toHaveBeenCalled();
  });

  it.each([
    ['TOKEN_INVALIDO', 404],
    ['NO_ENCONTRADO', 404],
    ['RECIBO_NO_CANCELADO', 409],
    ['PDF_ERROR', 500],
  ] as const)('mapea %s a %i', async (code, status) => {
    service.getImpresionPorToken.mockResolvedValue({
      success: false,
      code,
      error: 'mensaje del service',
    });
    const res = mockRes();

    await controller.pdf(token, asResponse(res));

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code,
      error: 'mensaje del service',
    });
    expect(res.end).not.toHaveBeenCalled();
  });
});
