import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../errors';
import { CreateUserDTO } from '../validators/user.validator';

const SALT_ROUNDS = 12;

export async function createUser(data: CreateUserDTO) {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    throw new ConflictError('El correo electrónico ya está registrado');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  return userRepository.create({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    role: data.role,
  });
}

export async function findAll() {
  return userRepository.findAll();
}

export async function findById(id: string) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError('Usuario', id);
  }
  return user;
}

export async function update(id: string, data: { fullName?: string; email?: string; role?: 'veterinarian' | 'receptionist' }) {
  const user = await userRepository.update(id, data);
  if (!user) {
    throw new NotFoundError('Usuario', id);
  }
  return user;
}

export async function deactivate(id: string) {
  const user = await userRepository.deactivate(id);
  if (!user) {
    throw new NotFoundError('Usuario', id);
  }
  return user;
}
