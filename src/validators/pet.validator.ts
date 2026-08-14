import { z } from 'zod';

export const createPetSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  breed: z.string().max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight: z.number().min(0.01).max(999.99).optional(),
  microchipNumber: z.string().max(25).regex(/^[a-zA-Z0-9]*$/).optional().nullable(),
  medicalNotes: z.string().max(2000).optional(),
});

export const updatePetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  species: z.string().min(1).max(50).optional(),
  breed: z.string().max(50).optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  weight: z.number().min(0.01).max(999.99).optional().nullable(),
  microchipNumber: z.string().max(25).regex(/^[a-zA-Z0-9]*$/).optional().nullable(),
  medicalNotes: z.string().max(2000).optional().nullable(),
});

export type CreatePetDTO = z.infer<typeof createPetSchema>;
export type UpdatePetDTO = z.infer<typeof updatePetSchema>;
