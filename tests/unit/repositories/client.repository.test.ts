import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientRepository from '../../../src/repositories/client.repository';

const mockQuery = vi.fn();

vi.mock('../../../src/config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('ClientRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const sampleRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    full_name: 'Juan Pérez',
    phone: '+5491155667788',
    email: 'juan@email.com',
    address: 'Av. Libertador 1234',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('should insert a client and return mapped result', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.create({
        fullName: 'Juan Pérez',
        phone: '+5491155667788',
        email: 'juan@email.com',
        address: 'Av. Libertador 1234',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        ['Juan Pérez', '+5491155667788', 'juan@email.com', 'Av. Libertador 1234']
      );
      expect(result).toEqual({
        id: sampleRow.id,
        fullName: 'Juan Pérez',
        phone: '+5491155667788',
        email: 'juan@email.com',
        address: 'Av. Libertador 1234',
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
    });

    it('should pass null for optional fields not provided', async () => {
      const rowWithNulls = { ...sampleRow, phone: null, address: null };
      mockQuery.mockResolvedValue({ rows: [rowWithNulls], rowCount: 1 });

      const result = await clientRepository.create({
        fullName: 'Juan Pérez',
        email: 'juan@email.com',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        ['Juan Pérez', null, 'juan@email.com', null]
      );
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated clients ordered by full_name', async () => {
      const rows = [
        { ...sampleRow, full_name: 'Ana López', email: 'ana@email.com' },
        { ...sampleRow, full_name: 'Juan Pérez', email: 'juan@email.com' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });

      const result = await clientRepository.findAll(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY full_name'),
        [50, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('Ana López');
      expect(result[1].fullName).toBe('Juan Pérez');
    });

    it('should calculate correct offset for page 2', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await clientRepository.findAll(2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 50]
      );
    });

    it('should calculate correct offset for page 3', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await clientRepository.findAll(3);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 100]
      );
    });

    it('should return empty array when no clients exist', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.findAll(1);

      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should search by name or phone with ILIKE', async () => {
      const rows = [sampleRow];
      mockQuery.mockResolvedValue({ rows, rowCount: 1 });

      const result = await clientRepository.search('Juan');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%Juan%']
      );
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Juan Pérez');
    });

    it('should search by phone number', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.search('5491155');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%5491155%']
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no matches found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.search('nonexistent');

      expect(result).toEqual([]);
    });

    it('should limit results to 50', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await clientRepository.search('test');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array)
      );
    });
  });

  describe('findById', () => {
    it('should return client when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.findById(sampleRow.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [sampleRow.id]
      );
      expect(result).toEqual({
        id: sampleRow.id,
        fullName: 'Juan Pérez',
        phone: '+5491155667788',
        email: 'juan@email.com',
        address: 'Av. Libertador 1234',
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
    });

    it('should return null when client not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update specified fields and return updated client', async () => {
      const updatedRow = { ...sampleRow, full_name: 'Juan Carlos Pérez' };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await clientRepository.update(sampleRow.id, {
        fullName: 'Juan Carlos Pérez',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE clients SET'),
        expect.arrayContaining(['Juan Carlos Pérez', sampleRow.id])
      );
      expect(result?.fullName).toBe('Juan Carlos Pérez');
    });

    it('should update multiple fields at once', async () => {
      const updatedRow = {
        ...sampleRow,
        full_name: 'Juan Carlos Pérez',
        phone: '+5491199887766',
        email: 'juancarlos@email.com',
      };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await clientRepository.update(sampleRow.id, {
        fullName: 'Juan Carlos Pérez',
        phone: '+5491199887766',
        email: 'juancarlos@email.com',
      });

      expect(result?.fullName).toBe('Juan Carlos Pérez');
      expect(result?.phone).toBe('+5491199887766');
      expect(result?.email).toBe('juancarlos@email.com');
    });

    it('should allow setting nullable fields to null', async () => {
      const updatedRow = { ...sampleRow, phone: null };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await clientRepository.update(sampleRow.id, {
        phone: null,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE clients SET'),
        expect.arrayContaining([null, sampleRow.id])
      );
      expect(result?.phone).toBeNull();
    });

    it('should return null when client not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.update('nonexistent-id', {
        fullName: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should call findById when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.update(sampleRow.id, {});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sampleRow.id]
      );
      expect(result?.fullName).toBe('Juan Pérez');
    });
  });

  describe('findByEmail', () => {
    it('should return client when email matches', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.findByEmail('juan@email.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['juan@email.com']
      );
      expect(result?.email).toBe('juan@email.com');
    });

    it('should return null when email not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.findByEmail('unknown@email.com');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return client when phone matches', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await clientRepository.findByPhone('+5491155667788');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone = $1'),
        ['+5491155667788']
      );
      expect(result?.phone).toBe('+5491155667788');
    });

    it('should return null when phone not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await clientRepository.findByPhone('+0000000000');

      expect(result).toBeNull();
    });
  });
});
