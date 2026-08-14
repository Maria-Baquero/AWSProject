import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import petRoutes from '../../../src/routes/pet.routes';
import { errorHandler } from '../../../src/middlewares/errorHandler';

vi.mock('../../../src/services/pet.service');
vi.mock('../../../src/repositories/appointment.repository');

import * as petService from '../../../src/services/pet.service';

const JWT_SECRET = 'test-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pets', petRoutes);
  app.use(errorHandler);
  return app;
}

function generateToken() {
  return jwt.sign(
    { id: '123e4567-e89b-12d3-a456-426614174000', email: 'admin@clinica.com', role: 'veterinarian' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const mockPet = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeee1111',
  clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
  name: 'Firulais',
  species: 'Perro',
  breed: 'Labrador',
  birthDate: '2020-03-15',
  weight: 25.5,
  microchipNumber: 'ABC123456789',
  medicalNotes: 'Vacunas al día',
  active: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

describe('Pet Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/pets', () => {
    it('should create a pet and return 201', async () => {
      vi.mocked(petService.create).mockResolvedValue(mockPet);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          name: 'Firulais',
          species: 'Perro',
          breed: 'Labrador',
          birthDate: '2020-03-15',
          weight: 25.5,
          microchipNumber: 'ABC123456789',
          medicalNotes: 'Vacunas al día',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(mockPet.id);
      expect(res.body.name).toBe('Firulais');
      expect(res.body.species).toBe('Perro');
      expect(res.body.clientId).toBe(mockPet.clientId);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/pets')
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          name: 'Firulais',
          species: 'Perro',
        });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          species: 'Perro',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when species is missing', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          name: 'Firulais',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when clientId is missing', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Firulais',
          species: 'Perro',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when weight is out of range', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          name: 'Firulais',
          species: 'Perro',
          weight: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when birthDate has invalid format', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa',
          name: 'Firulais',
          species: 'Perro',
          birthDate: '15-03-2020',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/pets', () => {
    it('should return list of pets for a client', async () => {
      const pets = [mockPet];
      vi.mocked(petService.findByClient).mockResolvedValue(pets);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/pets?clientId=ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Firulais');
      expect(petService.findByClient).toHaveBeenCalledWith('ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa');
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app).get('/api/pets?clientId=ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa');

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return empty array when client has no pets', async () => {
      vi.mocked(petService.findByClient).mockResolvedValue([]);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/pets?clientId=ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/pets/:id', () => {
    it('should return a pet by ID', async () => {
      vi.mocked(petService.findById).mockResolvedValue(mockPet);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get(`/api/pets/${mockPet.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(mockPet.id);
      expect(res.body.name).toBe('Firulais');
    });

    it('should return 404 when pet is not found', async () => {
      const { NotFoundError } = await import('../../../src/errors');
      vi.mocked(petService.findById).mockRejectedValue(
        new NotFoundError('Mascota', 'nonexistent-id')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/pets/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app).get(`/api/pets/${mockPet.id}`);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('PUT /api/pets/:id', () => {
    it('should update a pet and return updated data', async () => {
      const updatedPet = { ...mockPet, name: 'Firulais Jr.' };
      vi.mocked(petService.update).mockResolvedValue(updatedPet);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .put(`/api/pets/${mockPet.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Firulais Jr.' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Firulais Jr.');
      expect(petService.update).toHaveBeenCalledWith(mockPet.id, { name: 'Firulais Jr.' });
    });

    it('should return 404 when pet does not exist', async () => {
      const { NotFoundError } = await import('../../../src/errors');
      vi.mocked(petService.update).mockRejectedValue(
        new NotFoundError('Mascota', 'nonexistent-id')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .put('/api/pets/nonexistent-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nuevo nombre' });

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('should return 400 when weight is invalid', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .put(`/api/pets/${mockPet.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ weight: -5 });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .put(`/api/pets/${mockPet.id}`)
        .send({ name: 'Firulais Jr.' });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/pets/:id', () => {
    it('should soft-delete a pet and return 200', async () => {
      vi.mocked(petService.deactivate).mockResolvedValue(undefined as any);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .delete(`/api/pets/${mockPet.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mascota desactivada exitosamente');
      expect(petService.deactivate).toHaveBeenCalledWith(mockPet.id);
    });

    it('should return 404 when pet does not exist', async () => {
      const { NotFoundError } = await import('../../../src/errors');
      vi.mocked(petService.deactivate).mockRejectedValue(
        new NotFoundError('Mascota', 'nonexistent-id')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .delete('/api/pets/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('should return 409 when pet has active appointments', async () => {
      const { ConflictError } = await import('../../../src/errors');
      vi.mocked(petService.deactivate).mockRejectedValue(
        new ConflictError('No se puede desactivar la mascota porque tiene citas activas pendientes')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .delete(`/api/pets/${mockPet.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toContain('citas activas');
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app).delete(`/api/pets/${mockPet.id}`);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });
});
