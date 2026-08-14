import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from '../../src/services/auth.service';
import * as userRepository from '../../src/repositories/user.repository';
import { authenticate } from '../../src/middlewares/authenticate';
import { UnauthorizedError } from '../../src/errors';

vi.mock('../../src/repositories/user.repository');

/**
 * Validates: Requirements 6.2
 */
describe('Feature: veterinary-clinic-web, Property 19: Autenticación con credenciales válidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login with valid credentials returns JWT with user data and no password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.constantFrom('veterinarian' as const, 'receptionist' as const),
        async (email, password, role) => {
          const hashed = await bcrypt.hash(password, 4); // low rounds for speed in tests
          const user = {
            id: 'uuid-123',
            fullName: 'Test User',
            email,
            passwordHash: hashed,
            role,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

          const result = await authService.login(email, password);

          // Token is decodable and contains correct payload
          const decoded = jwt.decode(result.token) as any;
          expect(decoded).not.toBeNull();
          expect(decoded.id).toBe(user.id);
          expect(decoded.email).toBe(email);
          expect(decoded.role).toBe(role);

          // User data returned without password
          expect(result.user.id).toBe(user.id);
          expect(result.user.fullName).toBe(user.fullName);
          expect(result.user.email).toBe(email);
          expect(result.user.role).toBe(role);
          expect(result.user).not.toHaveProperty('password');
          expect(result.user).not.toHaveProperty('passwordHash');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 6.4
 */
describe('Feature: veterinary-clinic-web, Property 20: Rechazo de requests sin autenticación', () => {
  it('any request without a valid JWT is rejected with 401', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(undefined),                          // no header
          fc.constant(''),                                 // empty
          fc.string().filter(s => !s.startsWith('Bearer ')), // no Bearer prefix
          fc.constant('Bearer invalid-token'),             // invalid token
          fc.constant(`Bearer ${jwt.sign({ id: 'x', email: 'x@y.com', role: 'veterinarian' }, 'wrong-secret')}`) // wrong secret
        ),
        (authHeader) => {
          const req = { headers: { authorization: authHeader } } as any;
          const res = {} as any;
          const next = vi.fn();

          expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
