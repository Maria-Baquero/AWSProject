import { Router } from 'express';
import { createAppointment, getAppointments, cancelAppointment, completeAppointment } from '../controllers/appointment.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createAppointmentSchema } from '../validators/appointment.validator';

const router = Router();

router.post('/', authenticate, validate(createAppointmentSchema), createAppointment);
router.get('/', authenticate, getAppointments);
router.patch('/:id/cancel', authenticate, cancelAppointment);
router.patch('/:id/complete', authenticate, completeAppointment);

export default router;
