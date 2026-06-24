import { z } from 'zod';

export const SaveAccoSchema = z.object({
  // TODO: Add fields when save/edit is implemented
});

export type SaveAccesoDto = z.infer<typeof SaveAccoSchema>;
