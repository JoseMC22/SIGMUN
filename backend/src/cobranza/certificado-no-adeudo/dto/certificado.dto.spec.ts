import {
  CertificadosSchema,
  ContribuyenteSchema,
  DetalleCertificadoItemSchema,
  DetalleCertificadoSchema,
  EmptyBodySchema,
  GenerarCertificadoSchema,
  PrediosSchema,
} from './certificado.dto';

const codigoValido = '0012345';
const anioValido = '2024';

const detalleValido = {
  codigo: codigoValido,
  anio: anioValido,
  codPred: '0015981',
  anexo: '000',
  subAnexo: '000',
};

const generarValido = {
  codigo: codigoValido,
  tipoDeuda: '00.01',
  tipoPeriodo: 1,
  observacion: 'SIN DEUDA',
  aniosDeuda: anioValido,
  detalles: [detalleValido],
};

describe('CertificadosSchema / ContribuyenteSchema (codigo de 7 digitos)', () => {
  it('acepta el codigo de 7 digitos y lo recorta', () => {
    expect(CertificadosSchema.parse({ codigo: ' 0012345 ' }).codigo).toBe(
      '0012345',
    );
    expect(ContribuyenteSchema.parse({ codigo: codigoValido }).codigo).toBe(
      codigoValido,
    );
  });

  it('preserva los ceros a la izquierda', () => {
    expect(CertificadosSchema.parse({ codigo: '0000001' }).codigo).toBe(
      '0000001',
    );
  });

  it('rechaza codigos que no tengan exactamente 7 digitos', () => {
    for (const codigo of ['123456', '12345678', '123456a', '', ' 1 2345 ']) {
      expect(() => CertificadosSchema.parse({ codigo })).toThrow(
        'El codigo debe tener 7 digitos',
      );
      expect(() => ContribuyenteSchema.parse({ codigo })).toThrow();
    }
  });
});

describe('DetalleCertificadoSchema', () => {
  it('acepta numero no negativo y anio de 4 digitos', () => {
    expect(
      DetalleCertificadoSchema.parse({
        certNro: 0,
        certAnio: ` ${anioValido} `,
      }),
    ).toEqual({ certNro: 0, certAnio: anioValido });
  });

  it('rechaza certNro negativo, decimal o string', () => {
    for (const certNro of [-1, 1.5, '7']) {
      expect(() =>
        DetalleCertificadoSchema.parse({ certNro, certAnio: anioValido }),
      ).toThrow();
    }
  });

  it('rechaza certAnio que no tenga 4 digitos', () => {
    for (const certAnio of ['24', '20245', '202a', '']) {
      expect(() =>
        DetalleCertificadoSchema.parse({ certNro: 7, certAnio }),
      ).toThrow('El anio debe tener 4 digitos');
    }
  });

  it('exige ambos campos', () => {
    expect(() =>
      DetalleCertificadoSchema.parse({ certAnio: anioValido }),
    ).toThrow();
    expect(() => DetalleCertificadoSchema.parse({ certNro: 7 })).toThrow();
  });
});

describe('PrediosSchema', () => {
  const valido = {
    codigo: codigoValido,
    anio: anioValido,
    tipoDeuda: '00.01',
  };

  it('acepta idTbl opcional (alta sin id y edicion con id)', () => {
    expect(PrediosSchema.parse(valido)).toEqual(valido);
    expect(PrediosSchema.parse({ ...valido, idTbl: 10 }).idTbl).toBe(10);
  });

  it('rechaza idTbl negativo o decimal', () => {
    for (const idTbl of [-1, 1.5]) {
      expect(() => PrediosSchema.parse({ ...valido, idTbl })).toThrow();
    }
  });

  it('exige tipoDeuda de 1 a 5 caracteres sobre el texto recortado', () => {
    expect(
      PrediosSchema.parse({ ...valido, tipoDeuda: ' 00.30 ' }).tipoDeuda,
    ).toBe('00.30');
    for (const tipoDeuda of ['', '   ', '00.300']) {
      expect(() => PrediosSchema.parse({ ...valido, tipoDeuda })).toThrow();
    }
  });

  it('aplica las mismas reglas de codigo y anio que el resto del modulo', () => {
    expect(() =>
      PrediosSchema.parse({ ...valido, codigo: '123456' }),
    ).toThrow();
    expect(() => PrediosSchema.parse({ ...valido, anio: '20245' })).toThrow();
  });
});

describe('DetalleCertificadoItemSchema', () => {
  it('acepta el item completo y lo recorta', () => {
    expect(
      DetalleCertificadoItemSchema.parse({
        codigo: ` ${codigoValido} `,
        anio: ` ${anioValido} `,
        codPred: ' 0015981 ',
        anexo: ' 000 ',
        subAnexo: ' 000 ',
      }),
    ).toEqual(detalleValido);
  });

  it('respeta los maximos codPred=9, anexo=4, subAnexo=4', () => {
    const maximos = { codPred: 9, anexo: 4, subAnexo: 4 } as const;

    for (const [campo, maximo] of Object.entries(maximos) as [
      keyof typeof maximos,
      number,
    ][]) {
      expect(() =>
        DetalleCertificadoItemSchema.parse({
          ...detalleValido,
          [campo]: 'a'.repeat(maximo + 1),
        }),
      ).toThrow();
      expect(
        DetalleCertificadoItemSchema.parse({
          ...detalleValido,
          [campo]: 'a'.repeat(maximo),
        })[campo],
      ).toHaveLength(maximo);
    }
  });

  it('rechaza codPred, anexo o subAnexo vacios', () => {
    for (const campo of ['codPred', 'anexo', 'subAnexo'] as const) {
      expect(() =>
        DetalleCertificadoItemSchema.parse({
          ...detalleValido,
          [campo]: '   ',
        }),
      ).toThrow();
    }
  });
});

describe('GenerarCertificadoSchema', () => {
  it('acepta un alta valida sin certNro/certAnio y recorta observacion', () => {
    const dto = GenerarCertificadoSchema.parse({
      ...generarValido,
      observacion: '  SIN DEUDA  ',
    });

    expect(dto.observacion).toBe('SIN DEUDA');
    expect(dto.certNro).toBeUndefined();
    expect(dto.certAnio).toBeUndefined();
  });

  it('permite detalles vacio (decision de negocio documentada)', () => {
    expect(
      GenerarCertificadoSchema.parse({ ...generarValido, detalles: [] })
        .detalles,
    ).toEqual([]);
  });

  it('limita observacion a 100 caracteres sobre el texto recortado', () => {
    expect(
      GenerarCertificadoSchema.parse({
        ...generarValido,
        observacion: 'a'.repeat(100),
      }).observacion,
    ).toHaveLength(100);
    expect(() =>
      GenerarCertificadoSchema.parse({
        ...generarValido,
        observacion: 'a'.repeat(101),
      }),
    ).toThrow();
    for (const observacion of ['', '   ']) {
      expect(() =>
        GenerarCertificadoSchema.parse({ ...generarValido, observacion }),
      ).toThrow();
    }
  });

  it('exige tipoPeriodo entero no negativo y tipoDeuda de 1 a 5 caracteres', () => {
    for (const tipoPeriodo of [-1, 1.5]) {
      expect(() =>
        GenerarCertificadoSchema.parse({ ...generarValido, tipoPeriodo }),
      ).toThrow();
    }
    for (const tipoDeuda of ['', '00.300']) {
      expect(() =>
        GenerarCertificadoSchema.parse({ ...generarValido, tipoDeuda }),
      ).toThrow();
    }
  });

  it('exige aniosDeuda de 4 digitos', () => {
    for (const aniosDeuda of ['24', '20245', '202a', '']) {
      expect(() =>
        GenerarCertificadoSchema.parse({ ...generarValido, aniosDeuda }),
      ).toThrow('El anio debe tener 4 digitos');
    }
  });

  it('exige que certNro y certAnio viajen juntos (solo numero)', () => {
    const parsed = GenerarCertificadoSchema.safeParse({
      ...generarValido,
      certNro: 12,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(['certNro']);
    expect(parsed.error.issues[0].message).toContain(
      'deben enviarse juntos para editar',
    );
  });

  it('exige que certNro y certAnio viajen juntos (solo anio)', () => {
    const parsed = GenerarCertificadoSchema.safeParse({
      ...generarValido,
      certAnio: anioValido,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(['certNro']);
    expect(parsed.error.issues[0].message).toContain(
      'deben enviarse juntos para editar',
    );
  });

  it('exige certNro > 0 cuando se edita', () => {
    const parsed = GenerarCertificadoSchema.safeParse({
      ...generarValido,
      certNro: 0,
      certAnio: anioValido,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].message).toContain(
      'debe ser mayor que cero para editar',
    );
  });

  it('acepta la edicion cuando certNro > 0 y certAnio acompanan', () => {
    const dto = GenerarCertificadoSchema.parse({
      ...generarValido,
      certNro: 12,
      certAnio: anioValido,
    });

    expect(dto.certNro).toBe(12);
    expect(dto.certAnio).toBe(anioValido);
  });
});

describe('EmptyBodySchema', () => {
  it('acepta el body vacio de los catalogos', () => {
    expect(EmptyBodySchema.parse({})).toEqual({});
  });

  it('descarta claves desconocidas en vez de fallar', () => {
    expect(EmptyBodySchema.parse({ foo: 1 })).toEqual({});
  });

  it('rechaza un body ausente', () => {
    expect(() => EmptyBodySchema.parse(undefined)).toThrow();
  });
});
