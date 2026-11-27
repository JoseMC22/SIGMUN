import { z } from 'zod';

/**
 * Esquema del endpoint de catálogos (combos Año Corte / Mes Corte).
 *
 * Anno es opcional: sin Anno solo se piden los años (@BUSC=38); con Anno se
 * agregan los meses de ese año (@BUSC=39). El combo Mes Corte se refresca al
 * cambiar el año (Decisión 5 del design) — el legado lo cargaba una vez y
 * mostraba meses de un año que ya no era el seleccionado.
 */
export const CatalogosFraccDetalladoSchema = z.object({
  // 4 dígitos. Mismo contrato de formato que el Anno de la búsqueda.
  Anno: z.coerce
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Anno debe tener 4 dígitos')
    .optional(),
});

export type CatalogosFraccDetalladoDto = z.infer<
  typeof CatalogosFraccDetalladoSchema
>;
