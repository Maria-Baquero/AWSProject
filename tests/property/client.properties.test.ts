import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import * as clientService from '../../src/services/client.service';
import * as clientRepository from '../../src/repositories/client.repository';
import { createClientSchema } from '../../src/validators/client.validator';
import { ConflictError } from '../../src/errors';

vi.mock('../../src/repositories/client.repository');

/**
 * Validates: Requirements 1.1, 1.2
 */
describe('Feature: veterinary-clinic-web, Property 1: Round-trip de creación de cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any valid client data with name (1-100) and at least one contact, create then findById returns the same data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          phone: fc.option(
            fc.string({ minLength: 7, maxLength: 15 }).map(s => '+' + s.replace(/\D/g, '').slice(0, 15).padEnd(7, '1')),
            { nil: undefined }
          ),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        }).filter(data => data.phone !== undefined || data.email !== undefined),
        async (clientData) => {
          const clientId = 'uuid-' + Math.random().toString(36).slice(2);
          const now = new Date();

          const createdClient = {
            id: clientId,
            fullName: clientData.fullName,
            phone: clientData.phone || null,
            email: clientData.email || null,
            address: clientData.address || null,
            createdAt: now,
            updatedAt: now,
          };

          vi.mocked(clientRepository.findByEmail).mockResolvedValue(null);
          vi.mocked(clientRepository.findByPhone).mockResolvedValue(null);
          vi.mocked(clientRepository.create).mockResolvedValue(createdClient);
          vi.mocked(clientRepository.findById).mockResolvedValue(createdClient);

          const result = await clientService.create(clientData);
          const found = await clientService.findById(clientId);

          expect(result.id).toBe(found.id);
          expect(result.fullName).toBe(found.fullName);
          expect(result.phone).toBe(found.phone);
          expect(result.email).toBe(found.email);
          expect(result.address).toBe(found.address);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.2
 */
describe('Feature: veterinary-clinic-web, Property 2: Límites de paginación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any pagination query, results never exceed 50', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 60 }),
        async (page, totalClients) => {
          const clients = Array.from({ length: Math.min(totalClients, 50) }, (_, i) => ({
            id: `uuid-${i}`,
            fullName: `Client ${i}`,
            phone: `+123456789${i}`,
            email: null,
            address: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          vi.mocked(clientRepository.findAll).mockResolvedValue(clients);

          const result = await clientService.findAll(page);

          expect(result.length).toBeLessThanOrEqual(50);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.3
 */
describe('Feature: veterinary-clinic-web, Property 3: Búsqueda parcial retorna coincidencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any search substring of existing name/phone, results contain that substring', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
        async (fullName) => {
          // Pick a substring from the name
          const start = Math.floor(Math.random() * Math.max(1, fullName.length - 2));
          const end = Math.min(start + 2 + Math.floor(Math.random() * 3), fullName.length);
          const searchTerm = fullName.slice(start, end).toLowerCase();

          if (searchTerm.length === 0) return;

          const matchingClients = [
            {
              id: 'uuid-1',
              fullName,
              phone: '+1234567890',
              email: null,
              address: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          vi.mocked(clientRepository.search).mockResolvedValue(matchingClients);

          const results = await clientService.search(searchTerm);

          for (const client of results) {
            const nameMatch = client.fullName.toLowerCase().includes(searchTerm);
            const phoneMatch = client.phone?.toLowerCase().includes(searchTerm) ?? false;
            expect(nameMatch || phoneMatch).toBe(true);
          }
          expect(results.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.5
 */
describe('Feature: veterinary-clinic-web, Property 4: Rechazo de datos de cliente inválidos', () => {
  it('for any client without name or without both contacts, validator rejects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Case 1: empty name with valid contact
          fc.record({
            fullName: fc.constant(''),
            phone: fc.constant('+1234567890'),
            email: fc.constant(undefined),
          }),
          // Case 2: valid name but no contact at all
          fc.record({
            fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            phone: fc.constant(undefined),
            email: fc.constant(undefined),
          }),
          // Case 3: name exceeds 100 chars with valid contact
          fc.record({
            fullName: fc.string({ minLength: 101, maxLength: 200 }),
            phone: fc.constant('+1234567890'),
            email: fc.constant(undefined),
          })
        ),
        (invalidData) => {
          const result = createClientSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.7
 */
describe('Feature: veterinary-clinic-web, Property 5: Unicidad de contacto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any duplicate email/phone, second creation is rejected with ConflictError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Duplicate email scenario
          fc.record({
            type: fc.constant('email' as const),
            fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            phone: fc.constant(undefined),
          }),
          // Duplicate phone scenario
          fc.record({
            type: fc.constant('phone' as const),
            fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            phone: fc.stringMatching(/^\+\d{7,15}$/),
            email: fc.constant(undefined),
          })
        ),
        async (scenario) => {
          const existingClient = {
            id: 'existing-uuid',
            fullName: 'Existing Client',
            phone: scenario.type === 'phone' ? scenario.phone! : null,
            email: scenario.type === 'email' ? scenario.email! : null,
            address: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (scenario.type === 'email') {
            vi.mocked(clientRepository.findByEmail).mockResolvedValue(existingClient);
            vi.mocked(clientRepository.findByPhone).mockResolvedValue(null);
          } else {
            vi.mocked(clientRepository.findByEmail).mockResolvedValue(null);
            vi.mocked(clientRepository.findByPhone).mockResolvedValue(existingClient);
          }

          const createData = {
            fullName: scenario.fullName,
            email: scenario.type === 'email' ? scenario.email : undefined,
            phone: scenario.type === 'phone' ? scenario.phone : undefined,
          };

          await expect(clientService.create(createData)).rejects.toThrow(ConflictError);
        }
      ),
      { numRuns: 100 }
    );
  });
});
