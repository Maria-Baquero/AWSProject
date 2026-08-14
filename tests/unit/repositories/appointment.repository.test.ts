import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as appointmentRepository from '../../../src/repositories/appointment.repository';

const mockQuery = vi.fn();

vi.mock('../../../src/config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('AppointmentRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const sampleRow = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    pet_id: '660e8400-e29b-41d4-a716-446655440000',
    created_by: '770e8400-e29b-41d4-a716-446655440000',
    date: '2024-06-15',
    start_time: '10:00',
    duration_minutes: 30,
    reason: 'Consulta general',
    status: 'scheduled' as const,
    created_at: new Date('2024-06-01T00:00:00Z'),
    updated_at: new Date('2024-06-01T00:00:00Z'),
  };

  const expectedAppointment = {
    id: sampleRow.id,
    petId: sampleRow.pet_id,
    createdBy: sampleRow.created_by,
    date: sampleRow.date,
    startTime: sampleRow.start_time,
    durationMinutes: sampleRow.duration_minutes,
    reason: sampleRow.reason,
    status: sampleRow.status,
    createdAt: sampleRow.created_at,
    updatedAt: sampleRow.updated_at,
  };

  describe('create', () => {
    it('should insert an appointment and return it mapped to camelCase', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await appointmentRepository.create({
        petId: sampleRow.pet_id,
        createdBy: sampleRow.created_by!,
        date: '2024-06-15',
        startTime: '10:00',
        durationMinutes: 30,
        reason: 'Consulta general',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO appointments'),
        [sampleRow.pet_id, sampleRow.created_by, '2024-06-15', '10:00', 30, 'Consulta general']
      );
      expect(result).toEqual(expectedAppointment);
    });

    it('should pass null for createdBy when not provided', async () => {
      const rowWithoutCreator = { ...sampleRow, created_by: null };
      mockQuery.mockResolvedValue({ rows: [rowWithoutCreator], rowCount: 1 });

      const result = await appointmentRepository.create({
        petId: sampleRow.pet_id,
        date: '2024-06-15',
        startTime: '10:00',
        durationMinutes: 30,
        reason: 'Consulta general',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO appointments'),
        [sampleRow.pet_id, null, '2024-06-15', '10:00', 30, 'Consulta general']
      );
      expect(result.createdBy).toBeNull();
    });
  });

  describe('findByDate', () => {
    it('should return appointments ordered by start_time ASC', async () => {
      const rows = [
        { ...sampleRow, start_time: '09:00' },
        { ...sampleRow, id: 'other-id', start_time: '11:00' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });

      const result = await appointmentRepository.findByDate('2024-06-15');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY start_time ASC'),
        ['2024-06-15']
      );
      expect(result).toHaveLength(2);
      expect(result[0].startTime).toBe('09:00');
      expect(result[1].startTime).toBe('11:00');
    });

    it('should return empty array when no appointments exist for the date', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await appointmentRepository.findByDate('2024-12-25');

      expect(result).toEqual([]);
    });
  });

  describe('findByPet', () => {
    it('should return appointments ordered by date DESC, start_time DESC with limit 100', async () => {
      const rows = [
        { ...sampleRow, date: '2024-06-15', start_time: '14:00' },
        { ...sampleRow, id: 'other-id', date: '2024-06-10', start_time: '09:00' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });

      const result = await appointmentRepository.findByPet(sampleRow.pet_id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC, start_time DESC LIMIT 100'),
        [sampleRow.pet_id]
      );
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-06-15');
      expect(result[1].date).toBe('2024-06-10');
    });

    it('should return empty array when pet has no appointments', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await appointmentRepository.findByPet('nonexistent-pet-id');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return appointment when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow], rowCount: 1 });

      const result = await appointmentRepository.findById(sampleRow.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [sampleRow.id]
      );
      expect(result).toEqual(expectedAppointment);
    });

    it('should return null when appointment not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await appointmentRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status to cancelled and return the updated appointment', async () => {
      const cancelledRow = { ...sampleRow, status: 'cancelled' as const };
      mockQuery.mockResolvedValue({ rows: [cancelledRow], rowCount: 1 });

      const result = await appointmentRepository.updateStatus(sampleRow.id, 'cancelled');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE appointments SET status = $1'),
        ['cancelled', sampleRow.id]
      );
      expect(result?.status).toBe('cancelled');
    });

    it('should update status to completed and return the updated appointment', async () => {
      const completedRow = { ...sampleRow, status: 'completed' as const };
      mockQuery.mockResolvedValue({ rows: [completedRow], rowCount: 1 });

      const result = await appointmentRepository.updateStatus(sampleRow.id, 'completed');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE appointments SET status = $1'),
        ['completed', sampleRow.id]
      );
      expect(result?.status).toBe('completed');
    });

    it('should return null when appointment not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await appointmentRepository.updateStatus('nonexistent-id', 'cancelled');

      expect(result).toBeNull();
    });
  });

  describe('checkConflict', () => {
    it('should return true when a conflict exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ has_conflict: true }], rowCount: 1 });

      const result = await appointmentRepository.checkConflict('2024-06-15', '10:00', 30);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OVERLAPS'),
        ['2024-06-15', '10:00', 30, null]
      );
      expect(result).toBe(true);
    });

    it('should return false when no conflict exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ has_conflict: false }], rowCount: 1 });

      const result = await appointmentRepository.checkConflict('2024-06-15', '14:00', 30);

      expect(result).toBe(false);
    });

    it('should pass excludeId when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [{ has_conflict: false }], rowCount: 1 });

      const excludeId = '550e8400-e29b-41d4-a716-446655440000';
      const result = await appointmentRepository.checkConflict('2024-06-15', '10:00', 30, excludeId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OVERLAPS'),
        ['2024-06-15', '10:00', 30, excludeId]
      );
      expect(result).toBe(false);
    });

    it('should use COALESCE with null UUID when excludeId is not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [{ has_conflict: false }], rowCount: 1 });

      await appointmentRepository.checkConflict('2024-06-15', '10:00', 30);

      const queryStr = mockQuery.mock.calls[0][0];
      expect(queryStr).toContain('COALESCE($4');
      expect(queryStr).toContain("'00000000-0000-0000-0000-000000000000'");
    });
  });
});
