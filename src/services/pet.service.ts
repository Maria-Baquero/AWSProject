import * as petRepository from '../repositories/pet.repository';
import * as appointmentRepository from '../repositories/appointment.repository';
import { ConflictError, NotFoundError } from '../errors';
import { CreatePetDTO, UpdatePetDTO } from '../validators/pet.validator';

export async function create(data: CreatePetDTO) {
  return petRepository.create(data);
}

export async function findByClient(clientId: string) {
  return petRepository.findByClient(clientId);
}

export async function findById(id: string) {
  const pet = await petRepository.findById(id);
  if (!pet) {
    throw new NotFoundError('Mascota', id);
  }
  return pet;
}

export async function update(id: string, data: UpdatePetDTO) {
  const pet = await petRepository.update(id, data);
  if (!pet) {
    throw new NotFoundError('Mascota', id);
  }
  return pet;
}

export async function deactivate(id: string) {
  const appointments = await appointmentRepository.findByPet(id);
  const hasActiveAppointments = appointments.some(a => a.status === 'scheduled');
  if (hasActiveAppointments) {
    throw new ConflictError('No se puede desactivar la mascota porque tiene citas activas pendientes');
  }

  const pet = await petRepository.deactivate(id);
  if (!pet) {
    throw new NotFoundError('Mascota', id);
  }
  return pet;
}
