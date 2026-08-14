import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as petService from '../../../src/services/pet.service';
import * as petRepository from '../../../src/repositories/pet.repository';
import * as appointmentRepository from '../../../src/repositories/appointment.repository';
import { ConflictError, NotFoundError } from '../../../src/errors';

vi.mock('../../../src/repositories/pet.repository');
vi.mock('../../../src/repositories/appointment.repository');

const mockPet = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  clientId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Firulais',
  species: 'Perro',
  breed: 'Labrador',
  birthDate: '2020-05-15',
  weight: 25.5,
  microchipNumber: 'ABC123',
  medicalNotes: 'Vacunas al día',
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAppointmentScheduled = {
  id: '123e4567-e89b-12d3-a456-426614174010',
  petId: mockPet.id,
  createdBy: null,
  date: '2024-06-15',
  startTime: '10:00',
  durationMinutes: 30,
  reason: 'Consulta general',
  status: 'scheduled' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAppointmentCompleted = {
  ...mockAppointmentScheduled,
  id: '123e4567-e89b-12d3-a456-426614174011',
  status: 'completed' as const,
};

describe('PetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a pet linked to an existing client', async () => {
      vi.mocked(petRepository.create).mockResolvedValue(mockPet);

      const result = await petService.create({
        clientId: mockPet.clientId,
        name: 'Firulais',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-05-15',
        weight: 25.5,
        microchipNumber: 'ABC123',
        medicalNotes: 'Vacunas al día',
      });

      expect(result).toEqual(mockPet);
      expect(petRepository.create).toHaveBeenCalledWith({
        clientId: mockPet.clientId,
        name: 'Firulais',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-05-15',
        weight: 25.5,
        microchipNumber: 'ABC123',
        medicalNotes: 'Vacunas al día',
      });
    });

    it('should propagate NotFoundError when client does not exist', async () => {
      vi.mocked(petRepository.create).mockRejectedValue(
        new NotFoundError('Cliente', 'nonexistent-client-id')
      );

      await expect(petService.create({
        clientId: 'nonexistent-client-id',
        name: 'Firulais',
        species: 'Perro',
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByClient', () => {
    it('should return active pets for a client', async () => {
      vi.mocked(petRepository.findByClient).mockResolvedValue([mockPet]);

      const result = await petService.findByClient(mockPet.clientId);

      expect(result).toEqual([mockPet]);
      expect(petRepository.findByClient).toHaveBeenCalledWith(mockPet.clientId);
    });

    it('should return empty array when client has no pets', async () => {
      vi.mocked(petRepository.findByClient).mockResolvedValue([]);

      const result = await petService.findByClient('some-client-id');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return pet when found', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(mockPet);

      const result = await petService.findById(mockPet.id);

      expect(result).toEqual(mockPet);
    });

    it('should throw NotFoundError when pet does not exist', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(null);

      await expect(petService.findById('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should return updated pet when found', async () => {
      const updatedPet = { ...mockPet, name: 'Firulais Jr.' };
      vi.mocked(petRepository.update).mockResolvedValue(updatedPet);

      const result = await petService.update(mockPet.id, { name: 'Firulais Jr.' });

      expect(result.name).toBe('Firulais Jr.');
      expect(petRepository.update).toHaveBeenCalledWith(mockPet.id, { name: 'Firulais Jr.' });
    });

    it('should throw NotFoundError when pet does not exist', async () => {
      vi.mocked(petRepository.update).mockResolvedValue(null);

      await expect(petService.update('nonexistent-id', { name: 'Nuevo' }))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivate', () => {
    it('should deactivate pet when no active appointments exist', async () => {
      const deactivatedPet = { ...mockPet, active: false };
      vi.mocked(appointmentRepository.findByPet).mockResolvedValue([mockAppointmentCompleted]);
      vi.mocked(petRepository.deactivate).mockResolvedValue(deactivatedPet);

      const result = await petService.deactivate(mockPet.id);

      expect(result.active).toBe(false);
      expect(appointmentRepository.findByPet).toHaveBeenCalledWith(mockPet.id);
      expect(petRepository.deactivate).toHaveBeenCalledWith(mockPet.id);
    });

    it('should deactivate pet when there are no appointments at all', async () => {
      const deactivatedPet = { ...mockPet, active: false };
      vi.mocked(appointmentRepository.findByPet).mockResolvedValue([]);
      vi.mocked(petRepository.deactivate).mockResolvedValue(deactivatedPet);

      const result = await petService.deactivate(mockPet.id);

      expect(result.active).toBe(false);
    });

    it('should throw ConflictError when pet has active scheduled appointments', async () => {
      vi.mocked(appointmentRepository.findByPet).mockResolvedValue([mockAppointmentScheduled]);

      await expect(petService.deactivate(mockPet.id))
        .rejects.toThrow(ConflictError);

      await expect(petService.deactivate(mockPet.id))
        .rejects.toThrow('No se puede desactivar la mascota porque tiene citas activas pendientes');

      expect(petRepository.deactivate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when pet does not exist', async () => {
      vi.mocked(appointmentRepository.findByPet).mockResolvedValue([]);
      vi.mocked(petRepository.deactivate).mockResolvedValue(null);

      await expect(petService.deactivate('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
