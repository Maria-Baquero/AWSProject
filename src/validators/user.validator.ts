import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['veterinarian', 'receptionist']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
