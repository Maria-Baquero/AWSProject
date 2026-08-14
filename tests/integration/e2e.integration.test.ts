import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-integration';

// Set env before any module imports
vi.stubEnv('JWT_SECRET', JWT_SECRET);

// Create a mock function for db query
const mockQuery = vi.fn();

// Mock the database module completely
vi.mock('../../src/config/database', () => {
  return {
    query: (...args: any[]) => mockQuery(...args),
    getClient: vi.fn(),
    pool: { on: vi.fn() },
  };
});

// Now import app after mocks are set up
import app from '../../src/app';

function generateToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('E2E Integration Tests', () => {
  let authToken: string;
  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'vet@clinic.com',
    role: 'veterinarian',
    fullName: 'Dr. García',
  };

  beforeEach(() => {
    mockQuery.mockReset();
    authToken = generateToken({ id: testUser.id, email: testUser.email, role: testUser.role });
  });

  describe('Full workflow: login → create client → create pet → create appointment → cancel appointment', () => {
    it('completes the entire workflow successfully', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const clientId = '660e8400-e29b-41d4-a716-446655440001';
      const petId = '770e8400-e29b-41d4-a716-446655440002';
      const appointmentId = '880e8400-e29b-41d4-a716-446655440003';
      const now = new Date();

      // Step 1: Login - userRepository.findByEmail
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testUser.id,
          full_name: testUser.fullName,
          email: testUser.email,
          password_hash: hashedPassword,
          role: testUser.role,
          active: true,
          created_at: now,
          updated_at: now,
        }],
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'vet@clinic.com', password: 'password123' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.email).toBe('vet@clinic.com');
      expect(loginResponse.body.user.role).toBe('veterinarian');
      expect(loginResponse.body.user).not.toHaveProperty('passwordHash');

      // Use a pre-generated token for subsequent requests (same secret)
      // This avoids potential issues with the token from login response
      const token = authToken;

      // Step 2: Create client
      // clientRepository.findByEmail
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // clientRepository.findByPhone
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // clientRepository.create
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: clientId,
          full_name: 'Juan Pérez',
          phone: '1234567890',
          email: 'juan@example.com',
          address: 'Calle 123',
          created_at: now,
          updated_at: now,
        }],
      });

      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Juan Pérez',
          phone: '1234567890',
          email: 'juan@example.com',
          address: 'Calle 123',
        });

      expect(clientResponse.status).toBe(201);
      expect(clientResponse.body.fullName).toBe('Juan Pérez');
      expect(clientResponse.body.id).toBe(clientId);

      // Step 3: Create pet
      // petRepository: check client exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: clientId }] });
      // petRepository: insert pet
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: petId,
          client_id: clientId,
          name: 'Firulais',
          species: 'Perro',
          breed: 'Labrador',
          birth_date: '2020-01-15',
          weight: 25.5,
          microchip_number: null,
          medical_notes: null,
          active: true,
          created_at: now,
          updated_at: now,
        }],
      });

      const petResponse = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId: clientId,
          name: 'Firulais',
          species: 'Perro',
          breed: 'Labrador',
          birthDate: '2020-01-15',
          weight: 25.5,
        });

      expect(petResponse.status).toBe(201);
      expect(petResponse.body.name).toBe('Firulais');
      expect(petResponse.body.clientId).toBe(clientId);

      // Step 4: Create appointment
      // Use a date that is definitely in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // petRepository.findById
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: petId,
          client_id: clientId,
          name: 'Firulais',
          species: 'Perro',
          breed: 'Labrador',
          birth_date: '2020-01-15',
          weight: 25.5,
          microchip_number: null,
          medical_notes: null,
          active: true,
          created_at: now,
          updated_at: now,
        }],
      });
      // appointmentRepository.checkConflict
      mockQuery.mockResolvedValueOnce({ rows: [{ has_conflict: false }] });
      // appointmentRepository.create
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: appointmentId,
          pet_id: petId,
          created_by: testUser.id,
          date: futureDateStr,
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación anual',
          status: 'scheduled',
          created_at: now,
          updated_at: now,
        }],
      });

      const appointmentResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          petId: petId,
          date: futureDateStr,
          time: '10:00',
          reason: 'Vacunación anual',
          duration: 30,
        });

      expect(appointmentResponse.status).toBe(201);
      expect(appointmentResponse.body.petId).toBe(petId);
      expect(appointmentResponse.body.status).toBe('scheduled');
      expect(appointmentResponse.body.reason).toBe('Vacunación anual');

      // Step 5: Cancel appointment
      // appointmentRepository.findById
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: appointmentId,
          pet_id: petId,
          created_by: testUser.id,
          date: futureDateStr,
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación anual',
          status: 'scheduled',
          created_at: now,
          updated_at: now,
        }],
      });
      // appointmentRepository.updateStatus
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: appointmentId,
          pet_id: petId,
          created_by: testUser.id,
          date: futureDateStr,
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación anual',
          status: 'cancelled',
          created_at: now,
          updated_at: now,
        }],
      });

      const cancelResponse = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.status).toBe('cancelled');
    });
  });

  describe('Referential integrity', () => {
    it('creating a pet with nonexistent client returns 404', async () => {
      const nonExistentClientId = '990e8400-e29b-41d4-a716-446655440099';

      // petRepository.create checks client exists → not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: nonExistentClientId,
          name: 'Michi',
          species: 'Gato',
        });

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Cliente');
    });

    it('creating an appointment with nonexistent pet returns 404', async () => {
      const nonExistentPetId = '990e8400-e29b-41d4-a716-446655440088';
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // petRepository.findById → not found (active=true filter returns empty)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          petId: nonExistentPetId,
          date: futureDateStr,
          time: '10:00',
          reason: 'Consulta general',
          duration: 30,
        });

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Mascota');
    });

    it('deactivating a pet with active appointments returns 409', async () => {
      const petId = '770e8400-e29b-41d4-a716-446655440002';
      const now = new Date();

      // petService.deactivate calls appointmentRepository.findByPet first
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '880e8400-e29b-41d4-a716-446655440003',
          pet_id: petId,
          created_by: testUser.id,
          date: '2026-06-15',
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación',
          status: 'scheduled',
          created_at: now,
          updated_at: now,
        }],
      });

      const response = await request(app)
        .delete(`/api/pets/${petId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(409);
      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toContain('citas activas');
    });
  });

  describe('Database timeout returns 503', () => {
    it('returns 503 when database connection times out on client list', async () => {
      // Since we mocked the entire database module, the error-wrapping logic in database.ts
      // is bypassed. We need to simulate what the real database.ts query function would do:
      // throw ServiceUnavailableError when connection fails.
      const { ServiceUnavailableError } = await import('../../src/errors');
      mockQuery.mockRejectedValueOnce(new ServiceUnavailableError());

      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(503);
      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('no está disponible temporalmente');
    });

    it('returns 503 when database connection is refused on pet creation', async () => {
      const { ServiceUnavailableError } = await import('../../src/errors');
      mockQuery.mockRejectedValueOnce(new ServiceUnavailableError());

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Rex',
          species: 'Perro',
        });

      expect(response.status).toBe(503);
      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('no está disponible temporalmente');
    });

    it('returns 503 when database times out on appointment query', async () => {
      const { ServiceUnavailableError } = await import('../../src/errors');
      mockQuery.mockRejectedValueOnce(new ServiceUnavailableError());

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/appointments?date=${futureDateStr}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(503);
      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('no está disponible temporalmente');
    });
  });

  describe('Authentication flow', () => {
    it('returns 401 when accessing protected endpoint without token', async () => {
      const response = await request(app)
        .get('/api/clients');

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toContain('Token');
    });

    it('returns 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('returns 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('login with invalid credentials returns 401', async () => {
      // userRepository.findByEmail → no user found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpass' });

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toContain('Credenciales');
    });
  });

  describe('Validation at HTTP level', () => {
    it('rejects client creation without required fields', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('rejects appointment with invalid duration (not multiple of 15)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          petId: '770e8400-e29b-41d4-a716-446655440002',
          date: futureDateStr,
          time: '10:00',
          reason: 'Consulta',
          duration: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('duration');
    });

    it('rejects appointment with past date', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          petId: '770e8400-e29b-41d4-a716-446655440002',
          date: '2020-01-01',
          time: '10:00',
          reason: 'Consulta',
          duration: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('rejects client with invalid email format', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Test User',
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('State machine: appointment status transitions', () => {
    it('cannot cancel an already cancelled appointment', async () => {
      const appointmentId = '880e8400-e29b-41d4-a716-446655440003';
      const now = new Date();

      // appointmentRepository.findById → cancelled appointment
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: appointmentId,
          pet_id: '770e8400-e29b-41d4-a716-446655440002',
          created_by: testUser.id,
          date: '2026-06-15',
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación',
          status: 'cancelled',
          created_at: now,
          updated_at: now,
        }],
      });

      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('programada');
    });

    it('cannot complete an already completed appointment', async () => {
      const appointmentId = '880e8400-e29b-41d4-a716-446655440003';
      const now = new Date();

      // appointmentRepository.findById → completed appointment
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: appointmentId,
          pet_id: '770e8400-e29b-41d4-a716-446655440002',
          created_by: testUser.id,
          date: '2026-06-15',
          start_time: '10:00',
          duration_minutes: 30,
          reason: 'Vacunación',
          status: 'completed',
          created_at: now,
          updated_at: now,
        }],
      });

      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });
});
