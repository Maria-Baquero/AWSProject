import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userRepository from '../../../src/repositories/user.repository';

const mockQuery = vi.fn();

vi.mock('../../../src/config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('UserRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const sampleRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    full_name: 'Dr. García',
    email: 'garcia@clinica.com',
    password_hash: '$2b$12$hashedpassword',
    role: 'veterinarian' as const,
    active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('should insert a user and return it without password_hash', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await userRepository.create({
        fullName: 'Dr. García',
        email: 'garcia@clinica.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'veterinarian',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['Dr. García', 'garcia@clinica.com', '$2b$12$hashedpassword', 'veterinarian']
      );
      expect(result).toEqual({
        id: sampleRow.id,
        fullName: 'Dr. García',
        email: 'garcia@clinica.com',
        role: 'veterinarian',
        active: true,
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('findByEmail', () => {
    it('should return user with password hash when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await userRepository.findByEmail('garcia@clinica.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['garcia@clinica.com']
      );
      expect(result).toEqual({
        id: sampleRow.id,
        fullName: 'Dr. García',
        email: 'garcia@clinica.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'veterinarian',
        active: true,
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await userRepository.findByEmail('unknown@clinica.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user without password hash when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await userRepository.findById(sampleRow.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [sampleRow.id]
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.fullName).toBe('Dr. García');
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await userRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all active users ordered by full_name without password', async () => {
      const rows = [
        { ...sampleRow, full_name: 'Ana López', email: 'ana@clinica.com' },
        { ...sampleRow, full_name: 'Dr. García', email: 'garcia@clinica.com' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });

      const result = await userRepository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY full_name')
      );
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('Ana López');
      expect(result[1].fullName).toBe('Dr. García');
      result.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
      });
    });

    it('should return empty array when no active users exist', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await userRepository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update specified fields and return updated user', async () => {
      const updatedRow = { ...sampleRow, full_name: 'Dr. García López' };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await userRepository.update(sampleRow.id, {
        fullName: 'Dr. García López',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.arrayContaining(['Dr. García López', sampleRow.id])
      );
      expect(result?.fullName).toBe('Dr. García López');
    });

    it('should update multiple fields at once', async () => {
      const updatedRow = {
        ...sampleRow,
        full_name: 'Dr. García López',
        email: 'nuevo@clinica.com',
        role: 'receptionist' as const,
      };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await userRepository.update(sampleRow.id, {
        fullName: 'Dr. García López',
        email: 'nuevo@clinica.com',
        role: 'receptionist',
      });

      expect(result?.fullName).toBe('Dr. García López');
      expect(result?.email).toBe('nuevo@clinica.com');
      expect(result?.role).toBe('receptionist');
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await userRepository.update('nonexistent-id', {
        fullName: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should call findById when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await userRepository.update(sampleRow.id, {});

      // When no fields are provided, it should call findById which uses SELECT
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sampleRow.id]
      );
    });
  });

  describe('deactivate', () => {
    it('should set active to false and return deactivated user', async () => {
      const deactivatedRow = { ...sampleRow, active: false };
      mockQuery.mockResolvedValue({ rows: [deactivatedRow], rowCount: 1 });

      const result = await userRepository.deactivate(sampleRow.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET active = false'),
        [sampleRow.id]
      );
      expect(result?.active).toBe(false);
    });

    it('should return null when user not found or already inactive', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await userRepository.deactivate('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
