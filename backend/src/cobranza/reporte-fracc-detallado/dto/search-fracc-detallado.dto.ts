import { z } from 'zod';

/**
 * Esquema de búsqueda del Reporte de Fraccionamientos Detallado.
 *
 * pageSize es el selector de modo: 15 = grilla (paginación pedida por el
 * usuario), 100000 = exportación (re-consulta completa para Excel).
 * Patrón canónico del repo: nunca usar .max(100). Unión de literales estricta.
 *
 * Criterios (semántica medida contra la BD, probe T0):
 * - page: número de página (1-based), default 1
 * - pageSize: selector de modo (15 | 100000), default 15
 * - Codigo: código del contribuyente, opcional y de hasta 7 caracteres
 *   (varchar(7) en el SP). Se recorta antes de validar: un valor de solo
 *   espacios es "sin acotar", igual que el vacío. El SP lo filtra con
 *   LIKE '%'+@CODIGO+'%' (contiene): vacío = sin acotar y un código parcial es
 *   una búsqueda válida. NO aplicar padCodigo: rellenar con ceros a la
 *   izquierda cambiaría la búsqueda.
 * - Anno: 4 dígitos, obligatorio. Igualdad exacta sobre ANIO_SALDO;
 *   vacío = 0 filas en el SP, así que el DTO lo exige y el vacío no llega ahí.
 * - IdMes: entero 1-12, obligatorio. Igualdad exacta sobre MES_SALDO;
 *   vacío = 0 filas. Se manda al SP sin ceros a la izquierda ('8', no '08').
 *
 * OJO con las claves: zod NO valida claves desconocidas, las descarta en
 * silencio. Si el action mandara `codigo` en minúscula, el DTO devolvería
 * Codigo: '' y el reporte traería TODOS los registros sin ningún error visible.
 * Ver el spec del dto.
 */
export const SearchFraccDetalladoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
  Codigo: z
    .string()
    .trim()
    .max(7)
    .optional()
    .transform((v) => v ?? ''),
  // Igualdad exacta sobre ANIO_SALDO; obligatorio (4 dígitos).
  Anno: z.coerce.string().trim().regex(/^\d{4}$/, 'Anno debe tener 4 dígitos'),
  // Igualdad exacta sobre MES_SALDO; obligatorio. Sin ceros a la izquierda.
  IdMes: z.coerce.number().int().min(1).max(12),
});

export type SearchFraccDetalladoDto = z.infer<typeof SearchFraccDetalladoSchema>;
