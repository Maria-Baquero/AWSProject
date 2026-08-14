import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import appointmentRoutes from '../../../src/routes/appointment.routes';
import { errorHandler } from '../../../src/middlewares/errorHandler';

vi.mock('../../../src/services/appointment.service');

import * as appointmentService from '../../../src/services/appointment.service';

const JWT_SECRET = 'test-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/appointments', appointmentRoutes);
  app.use(errorHandler);
  return app;
}

function generateToken() {
  return jwt.sign(
    { id: '123e4567-e89b-12d3-a456-426614174000', email: 'vet@clinica.com', role: 'veterinarian' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const mockAppointment = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeee1111',
  petId: '999e4567-e89b-12d3-a456-426614174000',
  createdBy: '123e4567-e89b-12d3-a456-426614174000',
  date: '2030-12-20',
  startTime: '10:00',
  durationMinutes: 30,
  reason: 'Consulta general',
  status: 'scheduled',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

describe('Appointment Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/appointments', () => {
    const validBody = {
      petId: '999e4567-e89b-12d3-a456-426614174000',
      date: '2030-12-20',
      time: '10:00',
      reason: 'Consulta general',
      duration: 30,
    };

    it('should create an appointment and return 201', async () => {
      vi.mocked(appointmentService.create).mockResolvedValue(mockAppointment);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(mockAppointment.id);
      expect(res.body.petId).toBe(mockAppointment.petId);
      expect(res.body.reason).toBe(mockAppointment.reason);
      expect(appointmentService.create).toHaveBeenCalledWith(
        validBody,
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/appointments')
        .send(validBody);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 400 when petId is missing', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validBody, petId: undefined });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when date format is invalid', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validBody, date: '20-12-2025' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when time format is invalid', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validBody, time: '25:00' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when duration is not a multiple of 15', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validBody, duration: 20 });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 409 when there is a time conflict', async () => {
      const { ConflictError } = await import('../../../src/errors');
      vi.mocked(appointmentService.create).mockRejectedValue(
        new ConflictError('Existe un conflicto de horario con otra cita programada')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toBe('Existe un conflicto de horario con otra cita programada');
    });
  });

  describe('GET /api/appointments', () => {
    it('should return appointments for a specific date', async () => {
      const appointments = [mockAppointment];
      vi.mocked(appointmentService.findByDate).mockResolvedValue(appointments);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/appointments?date=2030-12-20')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].date).toBe('2030-12-20');
      expect(appointmentService.findByDate).toHaveBeenCalledWith('2030-12-20');
    });

    it('should return appointments for a specific pet', async () => {
      const appointments = [mockAppointment];
      vi.mocked(appointmentService.findByPet).mockResolvedValue(appointments);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/appointments?petId=999e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].petId).toBe('999e4567-e89b-12d3-a456-426614174000');
      expect(appointmentService.findByPet).toHaveBeenCalledWith('999e4567-e89b-12d3-a456-426614174000');
    });

    it('should return empty array when no query params provided', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app).get('/api/appointments?date=2030-12-20');

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/appointments/:id/cancel', () => {
    it('should cancel an appointment and return updated record', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'cancelled' };
      vi.mocked(appointmentService.cancel).mockResolvedValue(cancelledAppointment);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(appointmentService.cancel).toHaveBeenCalledWith(mockAppointment.id);
    });

    it('should return 404 when appointment does not exist', async () => {
      const { NotFoundError } = await import('../../../src/errors');
      vi.mocked(appointmentService.cancel).mockRejectedValue(
        new NotFoundError('Cita', 'non-existent-id')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch('/api/appointments/non-existent-id/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('should return 400 when appointment is not in scheduled state', async () => {
      const { ValidationError } = await import('../../../src/errors');
      vi.mocked(appointmentService.cancel).mockRejectedValue(
        new ValidationError('Solo se puede cancelar una cita en estado "programada"')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/cancel`);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/appointments/:id/complete', () => {
    it('should complete an appointment and return updated record', async () => {
      const completedAppointment = { ...mockAppointment, status: 'completed' };
      vi.mocked(appointmentService.complete).mockResolvedValue(completedAppointment);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(appointmentService.complete).toHaveBeenCalledWith(mockAppointment.id);
    });

    it('should return 404 when appointment does not exist', async () => {
      const { NotFoundError } = await import('../../../src/errors');
      vi.mocked(appointmentService.complete).mockRejectedValue(
        new NotFoundError('Cita', 'non-existent-id')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch('/api/appointments/non-existent-id/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('should return 400 when appointment is not in scheduled state', async () => {
      const { ValidationError } = await import('../../../src/errors');
      vi.mocked(appointmentService.complete).mockRejectedValue(
        new ValidationError('Solo se puede completar una cita en estado "programada"')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .patch(`/api/appointments/${mockAppointment.id}/complete`);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });
});
