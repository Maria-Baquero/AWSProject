import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../../src/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with statusCode and message', () => {
      const error = new AppError(418, 'I am a teapot');
      expect(error.statusCode).toBe(418);
      expect(error.message).toBe('I am a teapot');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('AppError');
    });
  });

  describe('ValidationError', () => {
    it('should have statusCode 400', () => {
      const error = new ValidationError('Campo inválido');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Campo inválido');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    it('should have statusCode 404 and formatted message', () => {
      const error = new NotFoundError('Cliente', '123');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Cliente con identificador '123' no fue encontrado");
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ConflictError', () => {
    it('should have statusCode 409', () => {
      const error = new ConflictError('Email ya registrado');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email ya registrado');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should have statusCode 503 and default message', () => {
      const error = new ServiceUnavailableError();
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('El servicio no está disponible temporalmente');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('UnauthorizedError', () => {
    it('should have statusCode 401 and default message', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Credenciales inválidas o token expirado');
      expect(error).toBeInstanceOf(AppError);
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Token expirado');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token expirado');
    });
  });
});
