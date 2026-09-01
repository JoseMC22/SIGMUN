import { z } from 'zod';

// ── Generar Deuda — conceptos (Rentas.sp_generardeuda @busc=10) ──
// POST body filter. The frontend only needs to pass the user's area code;
// @busc=10 is fixed in the backend (this endpoint is purpose-built for
// the "Generar Deuda" modal's "Concepto" combobox).

export const GenerarDeudaConceptoSchema = z.object({
  codigo_area: z
    .string()
    .min(1, 'El código de área del usuario es obligatorio.'),
});

export type GenerarDeudaConceptoDto = z.infer<typeof GenerarDeudaConceptoSchema>;
