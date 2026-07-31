/// <reference types="jest" />

import { CrearAlcabalaSchema } from './crear-alcabala.dto';

describe('CrearAlcabalaSchema', () => {
  const validDto = {
    codigoCompra: 'C001',
    nombres: 'JUAN CARLOS',
    numDoc: '12345678',
    direccFiscal: 'Av. Principal 123',
    codigoVenta: 'V001',
    nombres1: 'MARIA',
    numDoc1: '87654321',
    direccFiscal1: 'Jr. Secundaria 456',
    codPred: 'P001',
    anioPred: '2026',
    tipoPred: 'CASA',
    direccionPredio: 'Av. Real 789',
    fechaContrato: '2026-07-30',
    contrato: 'C-001',
    transferencia: 'COMPRA VENTA',
    observacion: '',
    montoInafecto: 0,
    montoAfecto: 100000,
    montoAlcabala: 3000,
    autoavaluo: 80000,
    anexo: '',
    subAnexo: '',
  };

  describe('valid payload', () => {
    it('should parse a valid full DTO', () => {
      const result = CrearAlcabalaSchema.parse(validDto);
      expect(result.codigoCompra).toBe('C001');
      expect(result.nombres).toBe('JUAN CARLOS');
      expect(result.numDoc).toBe('12345678');
      expect(result.codPred).toBe('P001');
      expect(result.anioPred).toBe('2026');
      expect(result.montoAfecto).toBe(100000);
      expect(result.montoAlcabala).toBe(3000);
    });
  });

  describe('required fields', () => {
    it('should reject when codigoCompra is missing', () => {
      const { codigoCompra: _, ...rest } = validDto;
      expect(() => CrearAlcabalaSchema.parse(rest)).toThrow();
    });

    it('should reject when nombres is missing', () => {
      const { nombres: _, ...rest } = validDto;
      expect(() => CrearAlcabalaSchema.parse(rest)).toThrow();
    });

    it('should reject when numDoc is missing', () => {
      const { numDoc: _, ...rest } = validDto;
      expect(() => CrearAlcabalaSchema.parse(rest)).toThrow();
    });

    it('should reject when codPred is missing', () => {
      const { codPred: _, ...rest } = validDto;
      expect(() => CrearAlcabalaSchema.parse(rest)).toThrow();
    });

    it('should reject when anioPred is missing', () => {
      const { anioPred: _, ...rest } = validDto;
      expect(() => CrearAlcabalaSchema.parse(rest)).toThrow();
    });

    it('should reject empty codigoCompra string', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, codigoCompra: '' }),
      ).toThrow('Comprador es obligatorio');
    });

    it('should reject empty codPred string', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, codPred: '' }),
      ).toThrow('Código de predio es obligatorio');
    });
  });

  describe('montos validation', () => {
    it('should reject negative montoAfecto', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, montoAfecto: -1 }),
      ).toThrow('Monto afecto debe ser >= 0');
    });

    it('should reject negative montoAlcabala', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, montoAlcabala: -1 }),
      ).toThrow('Monto alcabala debe ser >= 0');
    });

    it('should reject negative montoInafecto', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, montoInafecto: -1 }),
      ).toThrow();
    });

    it('should allow zero montos', () => {
      const result = CrearAlcabalaSchema.parse({
        ...validDto,
        montoInafecto: 0,
        montoAfecto: 0,
        montoAlcabala: 0,
      });
      expect(result.montoAfecto).toBe(0);
      expect(result.montoAlcabala).toBe(0);
      expect(result.montoInafecto).toBe(0);
    });
  });

  describe('defaults', () => {
    it('should default optional string fields to empty string when omitted', () => {
      const result = CrearAlcabalaSchema.parse({
        codigoCompra: 'C001',
        nombres: 'JUAN',
        numDoc: '12345678',
        codPred: 'P001',
        anioPred: '2026',
        montoAfecto: 1000,
        montoAlcabala: 30,
      });
      expect(result.direccFiscal).toBe('');
      expect(result.codigoVenta).toBe('');
      expect(result.nombres1).toBe('');
      expect(result.numDoc1).toBe('');
      expect(result.direccFiscal1).toBe('');
      expect(result.tipoPred).toBe('');
      expect(result.direccionPredio).toBe('');
      expect(result.fechaContrato).toBe('');
      expect(result.contrato).toBe('');
      expect(result.transferencia).toBe('');
      expect(result.observacion).toBe('');
      expect(result.anexo).toBe('');
      expect(result.subAnexo).toBe('');
    });

    it('should default optional numeric fields to 0 when omitted', () => {
      const result = CrearAlcabalaSchema.parse({
        codigoCompra: 'C001',
        nombres: 'JUAN',
        numDoc: '12345678',
        codPred: 'P001',
        anioPred: '2026',
        montoAfecto: 1000,
        montoAlcabala: 30,
      });
      expect(result.montoInafecto).toBe(0);
      expect(result.autoavaluo).toBe(0);
    });

    it('should not default required montos', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({
          codigoCompra: 'C001',
          nombres: 'JUAN',
          numDoc: '12345678',
          codPred: 'P001',
          anioPred: '2026',
        }),
      ).toThrow();
    });
  });

  describe('coerce types', () => {
    it('should coerce string numbers to number for numeric fields', () => {
      const result = CrearAlcabalaSchema.parse({
        ...validDto,
        montoInafecto: '100',
        montoAfecto: '5000',
        montoAlcabala: '150',
        autoavaluo: '80000',
      });
      expect(typeof result.montoInafecto).toBe('number');
      expect(result.montoInafecto).toBe(100);
      expect(result.montoAfecto).toBe(5000);
      expect(result.montoAlcabala).toBe(150);
      expect(result.autoavaluo).toBe(80000);
    });
  });

  describe('anioPred format', () => {
    it('should accept valid 4-digit year', () => {
      const result = CrearAlcabalaSchema.parse({ ...validDto, anioPred: '2026' });
      expect(result.anioPred).toBe('2026');
    });

    it('should reject value with less than 4 digits', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, anioPred: '202' }),
      ).toThrow();
    });

    it('should reject value with more than 4 digits', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, anioPred: '20260' }),
      ).toThrow();
    });

    it('should reject non-numeric 4-char string', () => {
      expect(() =>
        CrearAlcabalaSchema.parse({ ...validDto, anioPred: 'abcd' }),
      ).toThrow();
    });
  });
});
