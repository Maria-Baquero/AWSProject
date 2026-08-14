import { z } from 'zod';

export const createClientSchema = z.object({
  fullName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?\d{7,15}$/).optional(),
  email: z.string().email().optional(),
  address: z.string().max(200).optional()
}).refine(data => data.phone || data.email, {
  message: 'Se requiere al menos un dato de contacto (teléfono o correo electrónico)'
});

export const updateClientSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?\d{7,15}$/).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(200).optional().nullable()
}).refine(data => {
  // If both phone and email are explicitly set to null, reject
  if (data.phone === null && data.email === null) return false;
  return true;
}, { message: 'Se requiere al menos un dato de contacto' });

export type CreateClientDTO = z.infer<typeof createClientSchema>;
export type UpdateClientDTO = z.infer<typeof updateClientSchema>;
