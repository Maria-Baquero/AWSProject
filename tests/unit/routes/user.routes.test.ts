import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import userRoutes from '../../../src/routes/user.routes';
import { errorHandler } from '../../../src/middlewares/errorHandler';

vi.mock('../../../src/services/user.service');

import * as userService from '../../../src/services/user.service';

const JWT_SECRET = 'test-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
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

const mockCreatedUser = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeee1111',
  fullName: 'Dra. María López',
  email: 'maria@clinica.com',
  role: 'receptionist' as const,
  active: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/users', () => {
    it('should create a user and return 201', async () => {
      vi.mocked(userService.createUser).mockResolvedValue(mockCreatedUser);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Dra. María López',
          email: 'maria@clinica.com',
          password: 'securePass123',
          role: 'receptionist',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(mockCreatedUser.id);
      expect(res.body.fullName).toBe(mockCreatedUser.fullName);
      expect(res.body.email).toBe(mockCreatedUser.email);
      expect(res.body.role).toBe(mockCreatedUser.role);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/users')
        .send({
          fullName: 'Dra. María López',
          email: 'maria@clinica.com',
          password: 'securePass123',
          role: 'receptionist',
        });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 400 when fullName is missing', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'maria@clinica.com',
          password: 'securePass123',
          role: 'receptionist',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when password is too short', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Dra. María López',
          email: 'maria@clinica.com',
          password: 'short',
          role: 'receptionist',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when role is invalid', async () => {
      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Dra. María López',
          email: 'maria@clinica.com',
          password: 'securePass123',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 409 when email already exists', async () => {
      const { ConflictError } = await import('../../../src/errors');
      vi.mocked(userService.createUser).mockRejectedValue(
        new ConflictError('El correo electrónico ya está registrado')
      );

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Dra. María López',
          email: 'maria@clinica.com',
          password: 'securePass123',
          role: 'receptionist',
        });

      expect(res.status).toBe(409);
      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toBe('El correo electrónico ya está registrado');
    });
  });

  describe('GET /api/users', () => {
    it('should return list of active users', async () => {
      const users = [
        mockCreatedUser,
        {
          id: 'bbb22222-cccc-dddd-eeee-ffffffffffff',
          fullName: 'Dr. Pedro Ruiz',
          email: 'pedro@clinica.com',
          role: 'veterinarian' as const,
          active: true,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];
      vi.mocked(userService.findAll).mockResolvedValue(users);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].fullName).toBe('Dra. María López');
      expect(res.body[1].fullName).toBe('Dr. Pedro Ruiz');
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return empty array when no users exist', async () => {
      vi.mocked(userService.findAll).mockResolvedValue([]);

      const app = createApp();
      const token = generateToken();

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
