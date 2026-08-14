import { z } from 'zod';

export const createAppointmentSchema = z.object({
  petId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  }).refine(val => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, { message: 'La fecha no puede ser en el pasado' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'El formato de hora debe ser HH:mm',
  }),
  reason: z.string().min(1).max(500),
  duration: z.number()
    .int()
    .min(15)
    .max(120)
    .refine(val => val % 15 === 0, {
      message: 'La duración debe ser en incrementos de 15 minutos',
    }),
});

export type CreateAppointmentDTO = z.infer<typeof createAppointmentSchema>;
