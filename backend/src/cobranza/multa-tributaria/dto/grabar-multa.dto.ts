import { z } from 'zod';

const IsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe estar en formato YYYY-MM-DD');

/**
 * Una multa a generar. La grilla permite varias filas (una por periodo).
 */
export const MultaItemSchema = z.object({
  tipo: z.string().trim().min(1).max(5),
  tipoRec: z.string().trim().min(1).max(5),
  periodo: z.string().trim().regex(/^(0[1-9]|1[0-2])$/, 'Periodo invalido'),
  importeOriginal: z.coerce.number().min(0),
  insoluto: z.coerce.number().min(0),
  derechoEmision: z.coerce.number().min(0),
  glosa: z.string().trim().max(200).optional().default(''),
  fechaVencimiento: IsoDate,
  gradualidad: z.coerce.number().int().min(0).max(9).optional().default(0),
});

/**
 * Alta o edicion de multas tributarias.
 *
 * - Sin `idMulta`: alta. `multas` puede traer N filas y se insertan en una
 *   sola transaccion (todo o nada).
 * - Con `idMulta`: edicion. Se exige exactamente una fila.
 */
export const GrabarMultaSchema = z
  .object({
    idMulta: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    codigo: z.string().trim().min(1).max(7),
    /**
     * La multa tributaria no se asocia a un predio: el formulario no pide
     * seleccionarlo. Se mantiene opcional por compatibilidad (filas legacy
     * conservan su cod_pred, pero el alta nueva lo deja vacio).
     */
    codPred: z.string().trim().max(9).optional().default(''),
    anexo: z.string().trim().max(4).optional().default(''),
    subAnexo: z.string().trim().max(4).optional().default(''),
    anno: z.string().trim().regex(/^\d{4}$/, 'El anio debe tener 4 digitos'),
    operador: z.string().trim().max(50).optional().default(''),
    estacion: z.string().trim().max(50).optional().default(''),
    multas: z.array(MultaItemSchema).min(1).max(50),
  })
  .superRefine((value, ctx) => {
    if (value.idMulta && value.multas.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multas'],
        message: 'La edicion admite una sola multa',
      });
    }
  });

export type GrabarMultaDto = z.infer<typeof GrabarMultaSchema>;

/** Eliminacion logica de una multa. El motivo es obligatorio (auditoria). */
export const EliminarMultaSchema = z.object({
  codigo: z.string().trim().min(1).max(7),
  idMulta: z.string().trim().min(1).max(20),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio').max(250),
  operador: z.string().trim().max(50).optional().default(''),
  estacion: z.string().trim().max(50).optional().default(''),
});

export type EliminarMultaDto = z.infer<typeof EliminarMultaSchema>;
