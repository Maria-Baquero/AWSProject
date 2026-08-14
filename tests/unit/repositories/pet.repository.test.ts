import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as petRepository from '../../../src/repositories/pet.repository';

const mockQuery = vi.fn();

vi.mock('../../../src/config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('PetRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const sampleRow = {
    id: 'pet-uuid-001',
    client_id: 'client-uuid-001',
    name: 'Firulais',
    species: 'Perro',
    breed: 'Labrador',
    birth_date: '2020-05-15',
    weight: 25.5,
    microchip_number: 'ABC123456',
    medical_notes: 'Vacunas al día',
    active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('should verify client exists and insert a pet', async () => {
      // First call: client check, Second call: insert
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'client-uuid-001' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [sampleRow], rowCount: 1 });

      const result = await petRepository.create({
        clientId: 'client-uuid-001',
        name: 'Firulais',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-05-15',
        weight: 25.5,
        microchipNumber: 'ABC123456',
        medicalNotes: 'Vacunas al día',
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT id FROM clients WHERE id = $1'),
        ['client-uuid-001']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO pets'),
        ['client-uuid-001', 'Firulais', 'Perro', 'Labrador', '2020-05-15', 25.5, 'ABC123456', 'Vacunas al día']
      );
      expect(result).toEqual({
        id: 'pet-uuid-001',
        clientId: 'client-uuid-001',
        name: 'Firulais',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-05-15',
        weight: 25.5,
        microchipNumber: 'ABC123456',
        medicalNotes: 'Vacunas al día',
        active: true,
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        petRepository.create({
          clientId: 'nonexistent-client',
          name: 'Firulais',
          species: 'Perro',
        })
      ).rejects.toThrow("Cliente con identificador 'nonexistent-client' no fue encontrado");
    });

    it('should handle optional fields as null when not provided', async () => {
      const minimalRow = {
        ...sampleRow,
        breed: null,
        birth_date: null,
        weight: null,
        microchip_number: null,
        medical_notes: null,
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'client-uuid-001' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [minimalRow], rowCount: 1 });

      const result = await petRepository.create({
        clientId: 'client-uuid-001',
        name: 'Michi',
        species: 'Gato',
      });

      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO pets'),
        ['client-uuid-001', 'Michi', 'Gato', null, null, null, null, null]
      );
      expect(result.breed).toBeNull();
      expect(result.birthDate).toBeNull();
      expect(result.weight).toBeNull();
      expect(result.microchipNumber).toBeNull();
      expect(result.medicalNotes).toBeNull();
    });
  });

  describe('findByClient', () => {
    it('should return active pets for a given client ordered by name', async () => {
      const rows = [
        { ...sampleRow, name: 'Bolita', id: 'pet-uuid-002' },
        { ...sampleRow, name: 'Firulais', id: 'pet-uuid-001' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });

      const result = await petRepository.findByClient('client-uuid-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE client_id = $1 AND active = true'),
        ['client-uuid-001']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name'),
        expect.anything()
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bolita');
      expect(result[1].name).toBe('Firulais');
    });

    it('should return empty array when client has no active pets', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await petRepository.findByClient('client-uuid-001');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return pet when found and active', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await petRepository.findById('pet-uuid-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND active = true'),
        ['pet-uuid-001']
      );
      expect(result).toEqual({
        id: 'pet-uuid-001',
        clientId: 'client-uuid-001',
        name: 'Firulais',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-05-15',
        weight: 25.5,
        microchipNumber: 'ABC123456',
        medicalNotes: 'Vacunas al día',
        active: true,
        createdAt: sampleRow.created_at,
        updatedAt: sampleRow.updated_at,
      });
    });

    it('should return null when pet not found or inactive', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await petRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update specified fields and return updated pet', async () => {
      const updatedRow = { ...sampleRow, name: 'Firulais Jr.' };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await petRepository.update('pet-uuid-001', {
        name: 'Firulais Jr.',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pets SET'),
        expect.arrayContaining(['Firulais Jr.', 'pet-uuid-001'])
      );
      expect(result?.name).toBe('Firulais Jr.');
    });

    it('should update multiple fields at once', async () => {
      const updatedRow = {
        ...sampleRow,
        name: 'Firulais Jr.',
        species: 'Canino',
        weight: 30.0,
      };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await petRepository.update('pet-uuid-001', {
        name: 'Firulais Jr.',
        species: 'Canino',
        weight: 30.0,
      });

      expect(result?.name).toBe('Firulais Jr.');
      expect(result?.species).toBe('Canino');
      expect(result?.weight).toBe(30.0);
    });

    it('should allow setting nullable fields to null', async () => {
      const updatedRow = { ...sampleRow, breed: null, weight: null };
      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1 });

      const result = await petRepository.update('pet-uuid-001', {
        breed: null,
        weight: null,
      });

      expect(result?.breed).toBeNull();
      expect(result?.weight).toBeNull();
    });

    it('should return null when pet not found or inactive', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await petRepository.update('nonexistent-id', {
        name: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should call findById when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await petRepository.update('pet-uuid-001', {});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['pet-uuid-001']
      );
    });
  });

  describe('deactivate', () => {
    it('should set active to false and return deactivated pet', async () => {
      const deactivatedRow = { ...sampleRow, active: false };
      mockQuery.mockResolvedValue({ rows: [deactivatedRow], rowCount: 1 });

      const result = await petRepository.deactivate('pet-uuid-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET active = false'),
        ['pet-uuid-001']
      );
      expect(result?.active).toBe(false);
    });

    it('should return null when pet not found or already inactive', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await petRepository.deactivate('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
