import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as appointmentService from '../../../src/services/appointment.service';
import * as appointmentRepository from '../../../src/repositories/appointment.repository';
import * as petRepository from '../../../src/repositories/pet.repository';
import { ConflictError, NotFoundError, ValidationError } from '../../../src/errors';

vi.mock('../../../src/repositories/appointment.repository');
vi.mock('../../../src/repositories/pet.repository');

const mockPet = {
  id: 'pet-001',
  clientId: 'client-001',
  name: 'Firulais',
  species: 'Perro',
  breed: 'Labrador',
  birthDate: '2020-01-15',
  weight: 25.5,
  microchipNumber: null,
  medicalNotes: null,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAppointment = {
  id: 'appt-001',
  petId: 'pet-001',
  createdBy: 'user-001',
  date: '2025-03-15',
  startTime: '10:00',
  durationMinutes: 30,
  reason: 'Consulta general',
  status: 'scheduled' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const validCreateDTO = {
  petId: 'pet-001',
  date: '2025-03-15',
  time: '10:00',
  reason: 'Consulta general',
  duration: 30,
};

describe('AppointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an appointment successfully when pet exists and no conflict', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(mockPet);
      vi.mocked(appointmentRepository.checkConflict).mockResolvedValue(false);
      vi.mocked(appointmentRepository.create).mockResolvedValue(mockAppointment);

      const result = await appointmentService.create(validCreateDTO, 'user-001');

      expect(petRepository.findById).toHaveBeenCalledWith('pet-001');
      expect(appointmentRepository.checkConflict).toHaveBeenCalledWith('2025-03-15', '10:00', 30);
      expect(appointmentRepository.create).toHaveBeenCalledWith({
        petId: 'pet-001',
        createdBy: 'user-001',
        date: '2025-03-15',
        startTime: '10:00',
        durationMinutes: 30,
        reason: 'Consulta general',
      });
      expect(result).toEqual(mockAppointment);
    });

    it('should throw NotFoundError when pet does not exist', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(null);

      await expect(appointmentService.create(validCreateDTO))
        .rejects.toThrow(NotFoundError);

      expect(appointmentRepository.checkConflict).not.toHaveBeenCalled();
      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when pet is inactive (findById returns null for inactive)', async () => {
      // petRepository.findById filters by active=true, so inactive pets return null
      vi.mocked(petRepository.findById).mockResolvedValue(null);

      await expect(appointmentService.create({ ...validCreateDTO, petId: 'inactive-pet' }))
        .rejects.toThrow(NotFoundError);

      await expect(appointmentService.create({ ...validCreateDTO, petId: 'inactive-pet' }))
        .rejects.toThrow("Mascota con identificador 'inactive-pet' no fue encontrado");
    });

    it('should throw ConflictError when there is a scheduling conflict', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(mockPet);
      vi.mocked(appointmentRepository.checkConflict).mockResolvedValue(true);

      await expect(appointmentService.create(validCreateDTO))
        .rejects.toThrow(ConflictError);

      await expect(appointmentService.create(validCreateDTO))
        .rejects.toThrow('Existe un conflicto de horario con otra cita programada');

      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it('should pass createdBy as undefined when not provided', async () => {
      vi.mocked(petRepository.findById).mockResolvedValue(mockPet);
      vi.mocked(appointmentRepository.checkConflict).mockResolvedValue(false);
      vi.mocked(appointmentRepository.create).mockResolvedValue({ ...mockAppointment, createdBy: null });

      await appointmentService.create(validCreateDTO);

      expect(appointmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: undefined })
      );
    });
  });

  describe('findByDate', () => {
    it('should return appointments for a given date', async () => {
      const appointments = [mockAppointment];
      vi.mocked(appointmentRepository.findByDate).mockResolvedValue(appointments);

      const result = await appointmentService.findByDate('2025-03-15');

      expect(appointmentRepository.findByDate).toHaveBeenCalledWith('2025-03-15');
      expect(result).toEqual(appointments);
    });

    it('should return empty array when no appointments exist for date', async () => {
      vi.mocked(appointmentRepository.findByDate).mockResolvedValue([]);

      const result = await appointmentService.findByDate('2025-12-25');

      expect(result).toEqual([]);
    });
  });

  describe('findByPet', () => {
    it('should return appointments for a given pet', async () => {
      const appointments = [mockAppointment];
      vi.mocked(appointmentRepository.findByPet).mockResolvedValue(appointments);

      const result = await appointmentService.findByPet('pet-001');

      expect(appointmentRepository.findByPet).toHaveBeenCalledWith('pet-001');
      expect(result).toEqual(appointments);
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled appointment', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'cancelled' as const };
      vi.mocked(appointmentRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentRepository.updateStatus).mockResolvedValue(cancelledAppointment);

      const result = await appointmentService.cancel('appt-001');

      expect(appointmentRepository.findById).toHaveBeenCalledWith('appt-001');
      expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('appt-001', 'cancelled');
      expect(result!.status).toBe('cancelled');
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue(null);

      await expect(appointmentService.cancel('nonexistent'))
        .rejects.toThrow(NotFoundError);

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when appointment is already cancelled', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled',
      });

      await expect(appointmentService.cancel('appt-001'))
        .rejects.toThrow(ValidationError);

      await expect(appointmentService.cancel('appt-001'))
        .rejects.toThrow('Solo se puede cancelar una cita en estado "programada"');

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when appointment is already completed', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(appointmentService.cancel('appt-001'))
        .rejects.toThrow(ValidationError);

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('should complete a scheduled appointment', async () => {
      const completedAppointment = { ...mockAppointment, status: 'completed' as const };
      vi.mocked(appointmentRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentRepository.updateStatus).mockResolvedValue(completedAppointment);

      const result = await appointmentService.complete('appt-001');

      expect(appointmentRepository.findById).toHaveBeenCalledWith('appt-001');
      expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('appt-001', 'completed');
      expect(result!.status).toBe('completed');
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue(null);

      await expect(appointmentService.complete('nonexistent'))
        .rejects.toThrow(NotFoundError);

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when appointment is already completed', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(appointmentService.complete('appt-001'))
        .rejects.toThrow(ValidationError);

      await expect(appointmentService.complete('appt-001'))
        .rejects.toThrow('Solo se puede completar una cita en estado "programada"');

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when appointment is already cancelled', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled',
      });

      await expect(appointmentService.complete('appt-001'))
        .rejects.toThrow(ValidationError);

      expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
