import { z } from 'zod';

const CodigoSchema = z
  .string()
  .trim()
  .regex(/^\d{7}$/, 'El codigo debe tener 7 digitos');
const AnioSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'El anio debe tener 4 digitos');

/** Certificados registrados de un contribuyente. */
export const CertificadosSchema = z.object({
  codigo: CodigoSchema,
});

export type CertificadosDto = z.infer<typeof CertificadosSchema>;

/** Detalle de un certificado por numero y anio. */
export const DetalleCertificadoSchema = z.object({
  certNro: z.number().int().nonnegative(),
  certAnio: AnioSchema,
});

export type DetalleCertificadoDto = z.infer<typeof DetalleCertificadoSchema>;

/** Cabecera del contribuyente para el certificado. */
export const ContribuyenteSchema = z.object({
  codigo: CodigoSchema,
});

export type ContribuyenteDto = z.infer<typeof ContribuyenteSchema>;

/** Predios o vehiculos que pueden incorporarse al certificado. */
export const PrediosSchema = z.object({
  codigo: CodigoSchema,
  anio: AnioSchema,
  tipoDeuda: z.string().trim().min(1).max(5),
  idTbl: z.number().int().nonnegative().optional(),
});

export type PrediosDto = z.infer<typeof PrediosSchema>;

export const DetalleCertificadoItemSchema = z.object({
  codigo: CodigoSchema,
  anio: AnioSchema,
  codPred: z.string().trim().min(1).max(9),
  anexo: z.string().trim().min(1).max(4),
  subAnexo: z.string().trim().min(1).max(4),
});

export type DetalleCertificadoItemDto = z.infer<
  typeof DetalleCertificadoItemSchema
>;

/** Alta o edicion de un certificado de no adeudo. */
export const GenerarCertificadoSchema = z
  .object({
    codigo: CodigoSchema,
    tipoDeuda: z.string().trim().min(1).max(5),
    tipoPeriodo: z.number().int().nonnegative(),
    observacion: z.string().trim().min(1).max(100),
    aniosDeuda: AnioSchema,
    detalles: z.array(DetalleCertificadoItemSchema),
    certNro: z.number().int().nonnegative().optional(),
    certAnio: AnioSchema.optional(),
  })
  .superRefine((value, ctx) => {
    // El SP decide entre alta y edicion por @certanio: ambos datos van juntos
    // o el SP toma la rama equivocada y falla por llave foranea.
    const tieneNro = value.certNro !== undefined;
    const tieneAnio = value.certAnio !== undefined;
    if (tieneNro !== tieneAnio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['certNro'],
        message:
          'El numero y el anio del certificado deben enviarse juntos para editar',
      });
      return;
    }
    if (tieneAnio && (value.certNro ?? 0) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['certNro'],
        message:
          'El numero del certificado debe ser mayor que cero para editar',
      });
    }
  });

export type GenerarCertificadoDto = z.infer<typeof GenerarCertificadoSchema>;

/** Body vacio para catalogos sin parametros. */
export const EmptyBodySchema = z.object({});

export type EmptyBodyDto = z.infer<typeof EmptyBodySchema>;
