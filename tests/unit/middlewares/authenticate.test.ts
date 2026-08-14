import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, UserPayload } from '../../../src/middlewares/authenticate';
import { UnauthorizedError } from '../../../src/errors';

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const JWT_SECRET = 'test-secret-key';

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = vi.fn();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  function createToken(payload: UserPayload, options?: jwt.SignOptions): string {
    return jwt.sign(payload, JWT_SECRET, options);
  }

  describe('when no token is provided', () => {
    it('should throw UnauthorizedError when Authorization header is missing', () => {
      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token de acceso requerido');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when Authorization header is empty', () => {
      mockReq.headers = { authorization: '' };

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token de acceso requerido');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when Authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic some-token' };

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token de acceso requerido');

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('when an invalid token is provided', () => {
    it('should throw UnauthorizedError for a malformed token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token-string' };

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token inválido o expirado');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for a token signed with a different secret', () => {
      const payload: UserPayload = {
        id: '123',
        email: 'vet@clinic.com',
        role: 'veterinarian',
      };
      const wrongToken = jwt.sign(payload, 'wrong-secret');
      mockReq.headers = { authorization: `Bearer ${wrongToken}` };

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token inválido o expirado');

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('when an expired token is provided', () => {
    it('should throw UnauthorizedError for an expired token', () => {
      const payload: UserPayload = {
        id: '123',
        email: 'vet@clinic.com',
        role: 'veterinarian',
      };
      const expiredToken = createToken(payload, { expiresIn: '-1s' });
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(UnauthorizedError);

      expect(() =>
        authenticate(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow('Token inválido o expirado');

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('when a valid token is provided', () => {
    it('should call next() and attach user payload to request', () => {
      const payload: UserPayload = {
        id: 'user-uuid-123',
        email: 'vet@clinic.com',
        role: 'veterinarian',
      };
      const validToken = createToken(payload, { expiresIn: '1h' });
      mockReq.headers = { authorization: `Bearer ${validToken}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user!.id).toBe(payload.id);
      expect(mockReq.user!.email).toBe(payload.email);
      expect(mockReq.user!.role).toBe(payload.role);
    });

    it('should work with receptionist role', () => {
      const payload: UserPayload = {
        id: 'user-uuid-456',
        email: 'receptionist@clinic.com',
        role: 'receptionist',
      };
      const validToken = createToken(payload, { expiresIn: '1h' });
      mockReq.headers = { authorization: `Bearer ${validToken}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user!.id).toBe(payload.id);
      expect(mockReq.user!.email).toBe(payload.email);
      expect(mockReq.user!.role).toBe(payload.role);
    });
  });
});
