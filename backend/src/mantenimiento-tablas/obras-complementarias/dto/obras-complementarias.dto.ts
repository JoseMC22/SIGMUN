import { z } from 'zod';

const CATEG_MESSAGE = 'La categoría debe tener entre 1 y 2 caracteres';

function normalizeCateg(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

const CategSchema = z.preprocess(
  normalizeCateg,
  z.string().min(1, CATEG_MESSAGE).max(2, CATEG_MESSAGE).nullable(),
);

const SearchCategSchema = z.preprocess(
  (value) => (value === undefined ? undefined : normalizeCateg(value)),
  z
    .string()
    .min(1, CATEG_MESSAGE)
    .max(2, CATEG_MESSAGE)
    .nullable()
    .optional(),
);

export const ObraComplementariaKeySchema = z.object({
  id_instala: z
    .string()
    .trim()
    .length(3, 'El identificador de instalación debe tener 3 caracteres'),
  anno: z.string().regex(/^\d{4}$/, 'El año debe tener 4 dígitos'),
  categ: CategSchema,
});

export const ObraComplementariaDataSchema = z.object({
  instala: z
    .string()
    .trim()
    .min(1, 'La instalación es obligatoria')
    .max(200, 'La instalación no puede exceder 200 caracteres'),
  uni_med: z
    .string()
    .trim()
    .min(1, 'La unidad de medida es obligatoria')
    .max(15, 'La unidad de medida no puede exceder 15 caracteres'),
  valor: z.coerce
    .number()
    .min(0, 'El valor debe estar entre 0 y 9999999999.99')
    .max(9999999999.99, 'El valor debe estar entre 0 y 9999999999.99'),
  descri_gener: z
    .string()
    .trim()
    .min(1, 'La descripción general es obligatoria')
    .max(200, 'La descripción general no puede exceder 200 caracteres'),
});

export const CreateObraComplementariaSchema =
  ObraComplementariaKeySchema.merge(ObraComplementariaDataSchema);

export const UpdateObraComplementariaSchema = z.object({
  key: ObraComplementariaKeySchema,
  data: ObraComplementariaDataSchema,
});

export const DeleteObraComplementariaSchema = z.object({
  key: ObraComplementariaKeySchema,
});

export const CopyYearObrasComplementariasSchema = z.object({
  anno_origen: z
    .string()
    .regex(/^\d{4}$/, 'El año origen debe tener 4 dígitos'),
  anno_destino: z
    .string()
    .regex(/^\d{4}$/, 'El año destino debe tener 4 dígitos'),
});

export const SearchObrasComplementariasSchema = z.object({
  anno: z.string().regex(/^\d{4}$/, 'El año debe tener 4 dígitos'),
  categ: SearchCategSchema,
});

export type ObraComplementariaKeyDto = z.infer<
  typeof ObraComplementariaKeySchema
>;
export type ObraComplementariaDataDto = z.infer<
  typeof ObraComplementariaDataSchema
>;
export type CreateObraComplementariaDto = z.infer<
  typeof CreateObraComplementariaSchema
>;
export type UpdateObraComplementariaDto = z.infer<
  typeof UpdateObraComplementariaSchema
>;
export type SearchObrasComplementariasDto = z.infer<
  typeof SearchObrasComplementariasSchema
>;
export type CopyYearObrasComplementariasDto = z.infer<
  typeof CopyYearObrasComplementariasSchema
>;
