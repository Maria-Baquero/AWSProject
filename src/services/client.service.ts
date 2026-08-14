import * as clientRepository from '../repositories/client.repository';
import { ConflictError, NotFoundError } from '../errors';
import { CreateClientDTO, UpdateClientDTO } from '../validators/client.validator';

export async function create(data: CreateClientDTO) {
  if (data.email) {
    const existingByEmail = await clientRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new ConflictError('El correo electrónico ya está registrado para otro cliente');
    }
  }

  if (data.phone) {
    const existingByPhone = await clientRepository.findByPhone(data.phone);
    if (existingByPhone) {
      throw new ConflictError('El teléfono ya está registrado para otro cliente');
    }
  }

  return clientRepository.create(data);
}

export async function findAll(page: number = 1) {
  return clientRepository.findAll(page);
}

export async function search(term: string) {
  return clientRepository.search(term);
}

export async function findById(id: string) {
  const client = await clientRepository.findById(id);
  if (!client) {
    throw new NotFoundError('Cliente', id);
  }
  return client;
}

export async function update(id: string, data: UpdateClientDTO) {
  // Check existence first
  const existing = await clientRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Cliente', id);
  }

  // Check email uniqueness excluding current client
  if (data.email) {
    const existingByEmail = await clientRepository.findByEmail(data.email);
    if (existingByEmail && existingByEmail.id !== id) {
      throw new ConflictError('El correo electrónico ya está registrado para otro cliente');
    }
  }

  // Check phone uniqueness excluding current client
  if (data.phone) {
    const existingByPhone = await clientRepository.findByPhone(data.phone);
    if (existingByPhone && existingByPhone.id !== id) {
      throw new ConflictError('El teléfono ya está registrado para otro cliente');
    }
  }

  const updated = await clientRepository.update(id, data);
  if (!updated) {
    throw new NotFoundError('Cliente', id);
  }
  return updated;
}
