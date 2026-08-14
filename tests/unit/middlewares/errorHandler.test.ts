import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middlewares/errorHandler';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../../src/errors';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('errorHandler middleware', () => {
  it('should handle ValidationError with 400', () => {
    const err = new ValidationError('Nombre es requerido');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Nombre es requerido',
    });
  });

  it('should handle NotFoundError with 404', () => {
    const err = new NotFoundError('Mascota', 'abc-123');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: "Mascota con identificador 'abc-123' no fue encontrado",
    });
  });

  it('should handle ConflictError with 409', () => {
    const err = new ConflictError('Conflicto de horario');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Conflicto de horario',
    });
  });

  it('should handle ServiceUnavailableError with 503', () => {
    const err = new ServiceUnavailableError();
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 503,
      message: 'El servicio no está disponible temporalmente',
    });
  });

  it('should handle UnauthorizedError with 401', () => {
    const err = new UnauthorizedError();
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 401,
      message: 'Credenciales inválidas o token expirado',
    });
  });

  it('should handle generic AppError', () => {
    const err = new AppError(418, 'I am a teapot');
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 418,
      message: 'I am a teapot',
    });
  });

  it('should handle JSON parse SyntaxError with 400', () => {
    const err = new SyntaxError('Unexpected token');
    (err as any).status = 400;
    (err as any).body = '';
    const res = createMockRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'El cuerpo de la solicitud no es JSON válido',
    });
  });

  it('should handle unknown errors with 500 and generic message in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Something went wrong');
    const res = createMockRes();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
    // Must NOT include stack or error message in response
    const jsonCall = (res.json as any).mock.calls[0][0];
    expect(jsonCall).not.toHaveProperty('stack');
    expect(jsonCall.message).not.toBe('Something went wrong');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include error details in non-production (development)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Detailed error info');
    const res = createMockRes();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = (res.json as any).mock.calls[0][0];
    expect(jsonCall.statusCode).toBe(500);
    expect(jsonCall.message).toBe('Detailed error info');
    expect(jsonCall).toHaveProperty('stack');
    consoleSpy.mockRestore();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not expose env variable values in production error responses', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDbPass = process.env.DB_PASSWORD;
    process.env.NODE_ENV = 'production';
    process.env.DB_PASSWORD = 'super-secret-password-123';

    // Simulate an error that contains env variable value in its message
    const err = new Error(
      `Connection failed to DB with password: ${process.env.DB_PASSWORD}`
    );
    const res = createMockRes();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = (res.json as any).mock.calls[0][0];
    // In production, the response should NOT contain the secret
    expect(JSON.stringify(jsonCall)).not.toContain('super-secret-password-123');
    expect(jsonCall.message).toBe('Error interno del servidor');
    consoleSpy.mockRestore();

    process.env.NODE_ENV = originalEnv;
    process.env.DB_PASSWORD = originalDbPass;
  });
});
