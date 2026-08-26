import { z } from 'zod';

export const CrearAlcabalaSchema = z.object({
  codigoCompra: z.string().min(1, 'Comprador es obligatorio'),
  nombres: z.string().min(1, 'Nombre de comprador es obligatorio'),
  numDoc: z.string().min(1, 'Documento de comprador es obligatorio'),
  direccFiscal: z.string().optional().default(''),
  codigoVenta: z.string().optional().default(''),
  nombres1: z.string().optional().default(''),
  numDoc1: z.string().optional().default(''),
  direccFiscal1: z.string().optional().default(''),
  codPred: z.string().min(1, 'Código de predio es obligatorio'),
  anioPred: z.string().regex(/^\d{4}$/, 'Año de predio debe ser 4 dígitos'),
  tipoPred: z.string().optional().default(''),
  direccionPredio: z.string().optional().default(''),
  fechaContrato: z.string().optional().default(''),
  contrato: z.string().optional().default(''),
  transferencia: z.string().optional().default(''),
  porcTransferencia: z.coerce
    .number()
    .min(0, 'El porcentaje debe estar entre 0 y 100')
    .max(100, 'El porcentaje debe estar entre 0 y 100')
    .optional()
    .default(0),
  observacion: z.string().optional().default(''),
  montoInafecto: z.coerce.number().min(0).default(0),
  montoAfecto: z.coerce.number().min(0, 'Monto afecto debe ser >= 0'),
  montoAlcabala: z.coerce.number().min(0, 'Monto alcabala debe ser >= 0'),
  autoavaluo: z.coerce.number().min(0).optional().default(0),
  anexo: z.string().optional().default(''),
  subAnexo: z.string().optional().default(''),
});

export type CrearAlcabalaDto = z.infer<typeof CrearAlcabalaSchema>;
