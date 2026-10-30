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

/** Body vacio para catalogos sin parametros. */
export const EmptyBodySchema = z.object({});

export type EmptyBodyDto = z.infer<typeof EmptyBodySchema>;
