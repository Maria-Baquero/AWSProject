import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../../../src/routes/auth.routes';
import { errorHandler } from '../../../src/middlewares/errorHandler';

vi.mock('../../../src/services/auth.service');
vi.mock('../../../src/services/user.service');

import * as authService from '../../../src/services/auth.service';
import * as userService from '../../../src/services/user.service';

const JWT_SECRET = 'test-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  fullName: 'Dr. Carlos Pérez',
  email: 'carlos@clinica.com',
  role: 'veterinarian' as const,
};

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return token and user on valid credentials', async () => {
      const loginResult = {
        token: 'jwt-token-123',
        user: mockUser,
      };
      vi.mocked(authService.login).mockResolvedValue(loginResult);

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@clinica.com', password: 'securePass123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('jwt-token-123');
      expect(res.body.user.id).toBe(mockUser.id);
      expect(res.body.user.fullName).toBe(mockUser.fullName);
      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.user.role).toBe(mockUser.role);
    });

    it('should return 400 when email is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'securePass123' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@clinica.com' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when email format is invalid', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'securePass123' });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('should return 401 when credentials are invalid', async () => {
      const { UnauthorizedError } = await import('../../../src/errors');
      vi.mocked(authService.login).mockRejectedValue(
        new UnauthorizedError('Credenciales inválidas')
      );

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@clinica.com', password: 'wrongPass' });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Credenciales inválidas');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated user data', async () => {
      const userResult = {
        id: mockUser.id,
        fullName: mockUser.fullName,
        email: mockUser.email,
        role: mockUser.role,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      vi.mocked(userService.findById).mockResolvedValue(userResult);

      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const app = createApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(mockUser.id);
      expect(res.body.fullName).toBe(mockUser.fullName);
      expect(res.body.email).toBe(mockUser.email);
      expect(res.body.role).toBe(mockUser.role);
    });

    it('should return 401 when no token is provided', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const app = createApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });
});
