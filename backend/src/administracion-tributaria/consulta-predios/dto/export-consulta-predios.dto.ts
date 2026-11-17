import { z } from 'zod';
import { ConsultaPrediosFiltersSchema } from './search-consulta-predios.dto';

/**
 * Reutiliza los 10 filtros de search (incluido el padding de `codigo` y todos
 * sus defaults). El flag de pisos viaja en el body como booleano real: no se
 * usa `z.coerce.boolean()` porque `Boolean('false')` sería `true`.
 */
export const ExportConsultaPrediosSchema = ConsultaPrediosFiltersSchema.extend({
  mostrarPisos: z.boolean().default(false),
});

export type ExportConsultaPrediosDto = z.infer<
  typeof ExportConsultaPrediosSchema
>;
