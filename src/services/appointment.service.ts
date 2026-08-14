import * as appointmentRepository from '../repositories/appointment.repository';
import * as petRepository from '../repositories/pet.repository';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import { CreateAppointmentDTO } from '../validators/appointment.validator';

export async function create(data: CreateAppointmentDTO, createdBy?: string) {
  // Verify pet exists and is active (findById filters by active=true)
  const pet = await petRepository.findById(data.petId);
  if (!pet) {
    throw new NotFoundError('Mascota', data.petId);
  }

  // Check for time conflicts
  const hasConflict = await appointmentRepository.checkConflict(data.date, data.time, data.duration);
  if (hasConflict) {
    throw new ConflictError('Existe un conflicto de horario con otra cita programada');
  }

  return appointmentRepository.create({
    petId: data.petId,
    createdBy,
    date: data.date,
    startTime: data.time,
    durationMinutes: data.duration,
    reason: data.reason,
  });
}

export async function findByDate(date: string) {
  return appointmentRepository.findByDate(date);
}

export async function findByPet(petId: string) {
  return appointmentRepository.findByPet(petId);
}

export async function cancel(id: string) {
  const appointment = await appointmentRepository.findById(id);
  if (!appointment) {
    throw new NotFoundError('Cita', id);
  }
  if (appointment.status !== 'scheduled') {
    throw new ValidationError('Solo se puede cancelar una cita en estado "programada"');
  }
  return appointmentRepository.updateStatus(id, 'cancelled');
}

export async function complete(id: string) {
  const appointment = await appointmentRepository.findById(id);
  if (!appointment) {
    throw new NotFoundError('Cita', id);
  }
  if (appointment.status !== 'scheduled') {
    throw new ValidationError('Solo se puede completar una cita en estado "programada"');
  }
  return appointmentRepository.updateStatus(id, 'completed');
}
