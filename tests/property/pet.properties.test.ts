import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import * as petRepository from '../../src/repositories/pet.repository';
import * as petService from '../../src/services/pet.service';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { createPetSchema } from '../../src/validators/pet.validator';
import { NotFoundError } from '../../src/errors';
import { Pet } from '../../src/types/pet';

vi.mock('../../src/repositories/pet.repository');
vi.mock('../../src/repositories/appointment.repository');

/**
 * Validates: Requirements 2.1
 */
describe('Feature: veterinary-clinic-web, Property 6: Creación de mascota con datos válidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any valid pet data with name (1-100), species (1-50), weight (0.01-999.99) linked to existing client, creation succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.option(fc.double({ min: 0.01, max: 999.99, noNaN: true })),
        fc.option(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 25 })),
        async (name, species, weight, microchipNumber) => {
          const clientId = '550e8400-e29b-41d4-a716-446655440000';

          const expectedPet: Pet = {
            id: 'pet-uuid-123',
            clientId,
            name,
            species,
            breed: null,
            birthDate: null,
            weight: weight ?? null,
            microchipNumber: microchipNumber ?? null,
            medicalNotes: null,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          vi.mocked(petRepository.create).mockResolvedValue(expectedPet);

          const result = await petService.create({
            clientId,
            name,
            species,
            weight: weight ?? undefined,
            microchipNumber: microchipNumber ?? undefined,
          });

          // Creation succeeds and returns pet with correct fields
          expect(result).toBeDefined();
          expect(result.name).toBe(name);
          expect(result.species).toBe(species);
          expect(result.active).toBe(true);
          expect(result.clientId).toBe(clientId);
          if (weight !== null) {
            expect(result.weight).toBe(weight);
          }
          if (microchipNumber !== null) {
            expect(result.microchipNumber).toBe(microchipNumber);
          }

          // Repository was called with correct data
          expect(petRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
              clientId,
              name,
              species,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.2
 */
describe('Feature: veterinary-clinic-web, Property 7: Filtrado de mascotas inactivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any set of pets where some are active/inactive, findByClient only returns active ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            active: fc.boolean(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            species: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (petConfigs) => {
          const clientId = '550e8400-e29b-41d4-a716-446655440000';

          // The repository findByClient already filters to only active pets (SQL WHERE active = true)
          const activePets: Pet[] = petConfigs
            .filter(p => p.active)
            .map((p, i) => ({
              id: `pet-${i}`,
              clientId,
              name: p.name,
              species: p.species,
              breed: null,
              birthDate: null,
              weight: null,
              microchipNumber: null,
              medicalNotes: null,
              active: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

          vi.mocked(petRepository.findByClient).mockResolvedValue(activePets);

          const result = await petService.findByClient(clientId);

          // All returned pets must be active
          result.forEach(pet => {
            expect(pet.active).toBe(true);
          });

          // Number of returned pets equals number of active configs
          const expectedActiveCount = petConfigs.filter(p => p.active).length;
          expect(result.length).toBe(expectedActiveCount);

          // No inactive pets appear in results
          const inactiveCount = petConfigs.filter(p => !p.active).length;
          expect(result.length).toBe(petConfigs.length - inactiveCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.4
 */
describe('Feature: veterinary-clinic-web, Property 8: Soft-delete preserva registro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any pet that is deactivated, it exists in DB with active=false but does not appear in findByClient', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name, species) => {
          const clientId = '550e8400-e29b-41d4-a716-446655440000';
          const petId = 'pet-uuid-to-deactivate';

          // Pet after deactivation - still exists but with active=false
          const deactivatedPet: Pet = {
            id: petId,
            clientId,
            name,
            species,
            breed: null,
            birthDate: null,
            weight: null,
            microchipNumber: null,
            medicalNotes: null,
            active: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // No active appointments for this pet
          vi.mocked(appointmentRepository.findByPet).mockResolvedValue([]);
          // Deactivate returns the pet with active=false
          vi.mocked(petRepository.deactivate).mockResolvedValue(deactivatedPet);
          // After deactivation, findByClient returns empty (the pet is now inactive)
          vi.mocked(petRepository.findByClient).mockResolvedValue([]);

          const result = await petService.deactivate(petId);

          // The record still exists (returned from deactivate) with active=false
          expect(result).toBeDefined();
          expect(result.active).toBe(false);
          expect(result.id).toBe(petId);
          expect(result.name).toBe(name);
          expect(result.species).toBe(species);

          // After deactivation, findByClient does not return the pet
          const clientPets = await petService.findByClient(clientId);
          const foundDeactivated = clientPets.find(p => p.id === petId);
          expect(foundDeactivated).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.5
 */
describe('Feature: veterinary-clinic-web, Property 9: Rechazo de datos de mascota inválidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any invalid pet data (empty name, empty species, invalid client, out-of-range values), the validator rejects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty name
          fc.record({
            clientId: fc.uuid(),
            name: fc.constant(''),
            species: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          // Empty species
          fc.record({
            clientId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            species: fc.constant(''),
          }),
          // Invalid clientId (not a UUID)
          fc.record({
            clientId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            species: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          // Weight out of range (too low)
          fc.record({
            clientId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            species: fc.string({ minLength: 1, maxLength: 50 }),
            weight: fc.double({ min: -1000, max: 0, noNaN: true }),
          }),
          // Weight out of range (too high)
          fc.record({
            clientId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            species: fc.string({ minLength: 1, maxLength: 50 }),
            weight: fc.double({ min: 1000, max: 10000, noNaN: true }),
          }),
          // Name too long
          fc.record({
            clientId: fc.uuid(),
            name: fc.string({ minLength: 101, maxLength: 150 }),
            species: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          // Species too long
          fc.record({
            clientId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            species: fc.string({ minLength: 51, maxLength: 100 }),
          })
        ),
        (invalidData) => {
          const result = createPetSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
