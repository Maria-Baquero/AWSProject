import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from '../../../src/services/auth.service';
import * as userRepository from '../../../src/repositories/user.repository';
import { UnauthorizedError } from '../../../src/errors';

vi.mock('../../../src/repositories/user.repository');

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  fullName: 'Dr. Carlos Pérez',
  email: 'carlos@clinica.com',
  passwordHash: '$2b$12$hashedpassword',
  role: 'veterinarian' as const,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should return token and user data on valid credentials', async () => {
      const password = 'securePass123';
      const hashed = await bcrypt.hash(password, 12);
      const user = { ...mockUser, passwordHash: hashed };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

      const result = await authService.login('carlos@clinica.com', password);

      expect(result.token).toBeDefined();
      expect(result.user).toEqual({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      });
    });

    it('should generate a JWT with id, email, and role in the payload', async () => {
      const password = 'securePass123';
      const hashed = await bcrypt.hash(password, 12);
      const user = { ...mockUser, passwordHash: hashed };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

      const result = await authService.login('carlos@clinica.com', password);
      const decoded = jwt.decode(result.token) as any;

      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should throw UnauthorizedError when user does not exist', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      await expect(authService.login('noexiste@clinica.com', 'password'))
        .rejects.toThrow(UnauthorizedError);
      await expect(authService.login('noexiste@clinica.com', 'password'))
        .rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedError when password is incorrect', async () => {
      const hashed = await bcrypt.hash('correctPassword', 12);
      const user = { ...mockUser, passwordHash: hashed };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

      await expect(authService.login('carlos@clinica.com', 'wrongPassword'))
        .rejects.toThrow(UnauthorizedError);
      await expect(authService.login('carlos@clinica.com', 'wrongPassword'))
        .rejects.toThrow('Credenciales inválidas');
    });

    it('should not reveal whether email or password is incorrect', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      try {
        await authService.login('noexiste@clinica.com', 'password');
      } catch (e: any) {
        expect(e.message).toBe('Credenciales inválidas');
      }

      const hashed = await bcrypt.hash('correctPassword', 12);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...mockUser, passwordHash: hashed });

      try {
        await authService.login('carlos@clinica.com', 'wrongPassword');
      } catch (e: any) {
        expect(e.message).toBe('Credenciales inválidas');
      }
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for a valid token', () => {
      const payload = { id: mockUser.id, email: mockUser.email, role: mockUser.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', { expiresIn: '24h' });

      const result = authService.verifyToken(token);

      expect(result.id).toBe(payload.id);
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
    });

    it('should throw UnauthorizedError for an invalid token', () => {
      expect(() => authService.verifyToken('invalid-token'))
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for an expired token', () => {
      const payload = { id: mockUser.id, email: mockUser.email, role: mockUser.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', { expiresIn: '-1s' });

      expect(() => authService.verifyToken(token))
        .toThrow(UnauthorizedError);
    });
  });
});
