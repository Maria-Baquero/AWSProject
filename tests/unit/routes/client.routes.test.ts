import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../src/app';
import * as clientService from '../../../src/services/client.service';
import jwt from 'jsonwebtoken';

vi.mock('../../../src/services/client.service');

const mockedClientService = vi.mocked(clientService);

const TEST_SECRET = 'test-secret';
process.env.JWT_SECRET = TEST_SECRET;

function generateToken() {
  return jwt.sign(
    { id: 'user-1', email: 'admin@test.com', role: 'veterinarian' },
    TEST_SECRET
  );
}

const sampleClient = {
  id: 'client-1',
  fullName: 'Juan Pérez',
  phone: '1234567890',
  email: 'juan@example.com',
  address: 'Calle 123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Client Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/clients', () => {
    it('should create a client and return 201', async () => {
      mockedClientService.create.mockResolvedValue(sampleClient);

      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ fullName: 'Juan Pérez', phone: '1234567890', email: 'juan@example.com' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('fullName', 'Juan Pérez');
      expect(mockedClientService.create).toHaveBeenCalledWith({
        fullName: 'Juan Pérez',
        phone: '1234567890',
        email: 'juan@example.com',
      });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/clients')
        .send({ fullName: 'Juan Pérez', phone: '1234567890' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when fullName is missing', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ phone: '1234567890' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when no contact info is provided', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ fullName: 'Juan Pérez' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/clients', () => {
    it('should return paginated clients', async () => {
      mockedClientService.findAll.mockResolvedValue([sampleClient]);

      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${generateToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(mockedClientService.findAll).toHaveBeenCalledWith(1);
    });

    it('should pass page parameter', async () => {
      mockedClientService.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/clients?page=2')
        .set('Authorization', `Bearer ${generateToken()}`);

      expect(res.status).toBe(200);
      expect(mockedClientService.findAll).toHaveBeenCalledWith(2);
    });

    it('should search clients when search param is provided', async () => {
      mockedClientService.search.mockResolvedValue([sampleClient]);

      const res = await request(app)
        .get('/api/clients?search=Juan')
        .set('Authorization', `Bearer ${generateToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(mockedClientService.search).toHaveBeenCalledWith('Juan');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/clients');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should return a client by id', async () => {
      mockedClientService.findById.mockResolvedValue(sampleClient);

      const res = await request(app)
        .get('/api/clients/client-1')
        .set('Authorization', `Bearer ${generateToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'client-1');
      expect(mockedClientService.findById).toHaveBeenCalledWith('client-1');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/clients/client-1');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/clients/:id', () => {
    it('should update a client and return 200', async () => {
      const updatedClient = { ...sampleClient, fullName: 'Juan Actualizado' };
      mockedClientService.update.mockResolvedValue(updatedClient);

      const res = await request(app)
        .put('/api/clients/client-1')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ fullName: 'Juan Actualizado' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('fullName', 'Juan Actualizado');
      expect(mockedClientService.update).toHaveBeenCalledWith('client-1', {
        fullName: 'Juan Actualizado',
      });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .put('/api/clients/client-1')
        .send({ fullName: 'Juan Actualizado' });

      expect(res.status).toBe(401);
    });
  });
});
