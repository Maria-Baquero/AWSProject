import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import * as petService from '../../src/services/pet.service';
import * as petRepository from '../../src/repositories/pet.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import * as appointmentService from '../../src/services/appointment.service';
import { createClientSchema, updateClientSchema } from '../../src/validators/client.validator';
import { createPetSchema } from '../../src/validators/pet.validator';
import { createAppointmentSchema } from '../../src/validators/appointment.validator';
import { AppError, NotFoundError, ConflictError, ValidationError, UnauthorizedError } from '../../src/errors';
import { errorHandler } from '../../src/middlewares/errorHandler';
import { Request, Response, NextFunction } from 'express';

vi.mock('../../src/repositories/pet.repository', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    findById: vi.fn(),
  };
});
vi.mock('../../src/repositories/appointment.repository');
vi.mock('../../src/config/database');

/**
 * Validates: Requirements 5.4
 */
describe('Feature: veterinary-clinic-web, Property 14: Integridad referencial en creación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creating a pet with nonexistent clientId is rejected with NotFoundError', async () => {
    // Import the mocked query function
    const { query } = await import('../../src/config/database');

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (clientId, name, species) => {
          // Mock the database query to simulate nonexistent client
          vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

          await expect(
            petRepository.create({ clientId, name, species })
          ).rejects.toThrow(NotFoundError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('creating an appointment with nonexistent petId is rejected with NotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (petId) => {
          // Mock petRepository.findById to return null (pet doesn't exist)
          vi.mocked(petRepository.findById).mockResolvedValue(null);

          const today = new Date();
          today.setDate(today.getDate() + 1);
          const dateStr = today.toISOString().split('T')[0];

          await expect(
            appointmentService.create({
              petId,
              date: dateStr,
              time: '10:00',
              reason: 'Consulta general',
              duration: 30,
            })
          ).rejects.toThrow(NotFoundError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 5.5
 */
describe('Feature: veterinary-clinic-web, Property 15: Protección de eliminación con dependientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivating a pet with active (scheduled) appointments is rejected with ConflictError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.date(),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (petId, date, reason) => {
          // Mock findByPet to return at least one scheduled appointment
          vi.mocked(appointmentRepository.findByPet).mockResolvedValue([
            {
              id: 'appt-1',
              petId,
              createdBy: null,
              date: date.toISOString().split('T')[0],
              startTime: '10:00',
              durationMinutes: 30,
              reason,
              status: 'scheduled',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);

          await expect(petService.deactivate(petId)).rejects.toThrow(ConflictError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 7.1
 */
describe('Feature: veterinary-clinic-web, Property 16: Validación de formatos de email, teléfono y fecha', () => {
  it('invalid emails are rejected by the client validator', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // No @ sign
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes('@')),
          // No dot after @
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}@nodot`),
          // Empty local part
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `@${s}.com`),
          // Multiple @ signs
          fc.string({ minLength: 1, maxLength: 10 }).map(s => `${s}@${s}@domain.com`)
        ),
        (invalidEmail) => {
          const result = createClientSchema.safeParse({
            fullName: 'Test User',
            email: invalidEmail,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid phone numbers are rejected by the client validator', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Too short (less than 7 digits)
          fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1, maxLength: 6 }),
          // Too long (more than 15 digits)
          fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 16, maxLength: 25 }),
          // Non-digit characters (but not starting with +)
          fc.string({ minLength: 7, maxLength: 15 }).filter(s => /[^+\d]/.test(s) && !s.startsWith('+'))
        ),
        (invalidPhone) => {
          const result = createClientSchema.safeParse({
            fullName: 'Test User',
            phone: invalidPhone,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid date formats are rejected by the appointment validator', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Wrong separators
          fc.string({ minLength: 8, maxLength: 10 }).filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
          // Invalid format strings
          fc.constantFrom('2024/01/15', '15-01-2024', '01-15-2024', '2024.01.15', 'not-a-date', ''),
          // Day/month out of range but correct format
          fc.constantFrom('2024-13-01', '2024-00-15', '2024-01-32', '2024-02-30')
        ),
        (invalidDate) => {
          const result = createAppointmentSchema.safeParse({
            petId: '550e8400-e29b-41d4-a716-446655440000',
            date: invalidDate,
            time: '10:00',
            reason: 'Consulta',
            duration: 30,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid email formats are accepted by the client validator', () => {
    // Generate simple valid emails that conform to both RFC and Zod's stricter validation
    const simpleEmailArb = fc.tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 15 }),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 10 }),
      fc.constantFrom('com', 'org', 'net', 'io', 'dev')
    ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    fc.assert(
      fc.property(
        simpleEmailArb,
        (validEmail) => {
          const result = createClientSchema.safeParse({
            fullName: 'Test User',
            email: validEmail,
          });
          // If it fails, it must not be because of email format
          if (!result.success) {
            const emailErrors = result.error.issues.filter(i =>
              i.path.includes('email')
            );
            expect(emailErrors).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid phone formats are accepted by the client validator', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 7, maxLength: 15 }),
        (validPhone) => {
          const result = createClientSchema.safeParse({
            fullName: 'Test User',
            phone: validPhone,
          });
          if (!result.success) {
            const phoneErrors = result.error.issues.filter(i =>
              i.path.includes('phone')
            );
            expect(phoneErrors).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 7.3
 */
describe('Feature: veterinary-clinic-web, Property 17: Formato consistente de errores', () => {
  it('all AppError instances produce JSON responses with statusCode and message fields', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.tuple(fc.constant(400), fc.string({ minLength: 1, maxLength: 200 })).map(
            ([code, msg]) => new ValidationError(msg)
          ),
          fc.tuple(fc.string({ minLength: 1, maxLength: 50 }), fc.uuid()).map(
            ([resource, id]) => new NotFoundError(resource, id)
          ),
          fc.string({ minLength: 1, maxLength: 200 }).map(
            (msg) => new ConflictError(msg)
          ),
          fc.string({ minLength: 1, maxLength: 200 }).map(
            (msg) => new UnauthorizedError(msg)
          )
        ),
        (error) => {
          let responseBody: any = null;
          let responseStatus: number = 0;

          const mockRes = {
            status: (code: number) => {
              responseStatus = code;
              return mockRes;
            },
            json: (body: any) => {
              responseBody = body;
              return mockRes;
            },
          } as unknown as Response;

          const mockReq = {} as Request;
          const mockNext = vi.fn() as NextFunction;

          errorHandler(error, mockReq, mockRes, mockNext);

          // Verify JSON has statusCode and message fields
          expect(responseBody).toHaveProperty('statusCode');
          expect(responseBody).toHaveProperty('message');
          expect(typeof responseBody.statusCode).toBe('number');
          expect(typeof responseBody.message).toBe('string');
          expect(responseBody.statusCode).toBe(responseStatus);
          expect(responseBody.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('unhandled errors also produce JSON with statusCode and message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (msg) => {
          const error = new Error(msg);
          let responseBody: any = null;
          let responseStatus: number = 0;

          const mockRes = {
            status: (code: number) => {
              responseStatus = code;
              return mockRes;
            },
            json: (body: any) => {
              responseBody = body;
              return mockRes;
            },
          } as unknown as Response;

          const mockReq = {} as Request;
          const mockNext = vi.fn() as NextFunction;

          errorHandler(error, mockReq, mockRes, mockNext);

          expect(responseBody).toHaveProperty('statusCode');
          expect(responseBody).toHaveProperty('message');
          expect(responseBody.statusCode).toBe(500);
          expect(typeof responseBody.message).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 7.5
 */
describe('Feature: veterinary-clinic-web, Property 18: Rechazo de campos de texto excesivos', () => {
  it('client fullName exceeding 100 chars is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 600 }),
        (longName) => {
          const result = createClientSchema.safeParse({
            fullName: longName,
            email: 'test@example.com',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('client address exceeding 200 chars is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 201, maxLength: 600 }),
        (longAddress) => {
          const result = createClientSchema.safeParse({
            fullName: 'Test User',
            email: 'test@example.com',
            address: longAddress,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('appointment reason exceeding 500 chars is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (longReason) => {
          const result = createAppointmentSchema.safeParse({
            petId: '550e8400-e29b-41d4-a716-446655440000',
            date: '2025-12-15',
            time: '10:00',
            reason: longReason,
            duration: 30,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pet medicalNotes exceeding 2000 chars is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2001, maxLength: 3000 }),
        (longNotes) => {
          const result = createPetSchema.safeParse({
            clientId: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Rex',
            species: 'Perro',
            medicalNotes: longNotes,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pet name exceeding 100 chars is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 600 }),
        (longName) => {
          const result = createPetSchema.safeParse({
            clientId: '550e8400-e29b-41d4-a716-446655440000',
            name: longName,
            species: 'Perro',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fields within limits are accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (name, address, reason) => {
          // Client with valid name and address
          const clientResult = createClientSchema.safeParse({
            fullName: name,
            email: 'valid@example.com',
            address: address || undefined,
          });
          if (!clientResult.success) {
            // Failure should NOT be due to length exceeding limits
            const lengthErrors = clientResult.error.issues.filter(i =>
              i.message.toLowerCase().includes('too_big') ||
              i.code === 'too_big'
            );
            expect(lengthErrors).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
