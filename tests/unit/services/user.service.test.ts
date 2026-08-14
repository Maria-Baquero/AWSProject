import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import * as userService from '../../../src/services/user.service';
import * as userRepository from '../../../src/repositories/user.repository';
import { ConflictError, NotFoundError } from '../../../src/errors';

vi.mock('../../../src/repositories/user.repository');

const mockUserWithoutPassword = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  fullName: 'Dr. Carlos Pérez',
  email: 'carlos@clinica.com',
  role: 'veterinarian' as const,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUserWithPassword = {
  ...mockUserWithoutPassword,
  passwordHash: '$2b$12$hashedpassword',
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should hash the password with bcrypt salt rounds 12 and create the user', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(mockUserWithoutPassword);

      const hashSpy = vi.spyOn(bcrypt, 'hash') as any;

      await userService.createUser({
        fullName: 'Dr. Carlos Pérez',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'veterinarian',
      });

      expect(hashSpy).toHaveBeenCalledWith('securePass123', 12);
    });

    it('should return user without exposing the password hash', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(mockUserWithoutPassword);

      const result = await userService.createUser({
        fullName: 'Dr. Carlos Pérez',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'veterinarian',
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('carlos@clinica.com');
      expect(result.fullName).toBe('Dr. Carlos Pérez');
    });

    it('should throw ConflictError when email already exists', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUserWithPassword);

      await expect(userService.createUser({
        fullName: 'Nuevo Usuario',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'receptionist',
      })).rejects.toThrow(ConflictError);

      await expect(userService.createUser({
        fullName: 'Nuevo Usuario',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'receptionist',
      })).rejects.toThrow('El correo electrónico ya está registrado');
    });

    it('should check email uniqueness before creating user', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUserWithPassword);

      await expect(userService.createUser({
        fullName: 'Nuevo Usuario',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'receptionist',
      })).rejects.toThrow(ConflictError);

      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should pass correct data to repository create', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(mockUserWithoutPassword);

      await userService.createUser({
        fullName: 'Dr. Carlos Pérez',
        email: 'carlos@clinica.com',
        password: 'securePass123',
        role: 'veterinarian',
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dr. Carlos Pérez',
          email: 'carlos@clinica.com',
          role: 'veterinarian',
          passwordHash: expect.any(String),
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all users from repository', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([mockUserWithoutPassword]);

      const result = await userService.findAll();

      expect(result).toEqual([mockUserWithoutPassword]);
      expect(userRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUserWithoutPassword);

      const result = await userService.findById(mockUserWithoutPassword.id);

      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.findById('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should return updated user when found', async () => {
      const updatedUser = { ...mockUserWithoutPassword, fullName: 'Dr. Carlos Actualizado' };
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser);

      const result = await userService.update(mockUserWithoutPassword.id, { fullName: 'Dr. Carlos Actualizado' });

      expect(result.fullName).toBe('Dr. Carlos Actualizado');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.update).mockResolvedValue(null);

      await expect(userService.update('nonexistent-id', { fullName: 'Nuevo' }))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivate', () => {
    it('should return deactivated user when found', async () => {
      const deactivatedUser = { ...mockUserWithoutPassword, active: false };
      vi.mocked(userRepository.deactivate).mockResolvedValue(deactivatedUser);

      const result = await userService.deactivate(mockUserWithoutPassword.id);

      expect(result.active).toBe(false);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.deactivate).mockResolvedValue(null);

      await expect(userService.deactivate('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
