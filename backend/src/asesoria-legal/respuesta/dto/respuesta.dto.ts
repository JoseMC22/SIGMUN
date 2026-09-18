import { z } from 'zod';

export const RegistrarRespuestaSchema = z.object({
  iCodSolicitudOficina: z.coerce.number().positive('ID de solicitud-oficina requerido'),
  cRespuesta: z.string().min(1, 'La respuesta no puede estar vacía').max(8000),
  cNombreArchivo: z.string().max(500).nullable().optional(),
  cRutaArchivo: z.string().max(1000).nullable().optional(),
});

export type RegistrarRespuestaDto = z.infer<typeof RegistrarRespuestaSchema>;
