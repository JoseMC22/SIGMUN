import { z } from 'zod';

export const ConsultaCoactivoSchema = z.object({
  placa: z.string().optional().default(''),
  propie: z.string().optional().default(''),
  infrac: z.string().optional().default(''),
  infracanio: z.string().optional().default(''),
  conductor: z.string().optional().default(''),
  dniconduc: z.string().optional().default(''),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
});

export type ConsultaCoactivoDto = z.infer<typeof ConsultaCoactivoSchema>;

export const GrabarEnvioCoactivoSchema = z.object({
  ninfrac: z.string().min(1, 'Número de infracción requerido'),
  observacion: z.string().optional().default(''),
});

export type GrabarEnvioCoactivoDto = z.infer<typeof GrabarEnvioCoactivoSchema>;
