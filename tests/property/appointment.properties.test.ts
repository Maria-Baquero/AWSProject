import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import * as appointmentService from '../../src/services/appointment.service';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import * as petRepository from '../../src/repositories/pet.repository';
import { createAppointmentSchema } from '../../src/validators/appointment.validator';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors';
import { Appointment } from '../../src/types/appointment';

vi.mock('../../src/repositories/appointment.repository');
vi.mock('../../src/repositories/pet.repository');

// --- Helpers & Arbitraries ---

/** Generate a valid HH:mm time string */
const timeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

/** Generate a valid duration (15-120 in increments of 15) */
const durationArb = fc.integer({ min: 1, max: 8 }).map(n => n * 15);

/** Convert HH:mm to total minutes from midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Generate a future date string in YYYY-MM-DD format */
const futureDateArb = fc.integer({ min: 1, max: 365 }).map(daysAhead => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
});

/** Generate a past date string */
const pastDateArb = fc.integer({ min: 1, max: 365 }).map(daysBack => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split('T')[0];
});

/** Build a mock Appointment object */
function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: overrides.id ?? 'appt-1',
    petId: overrides.petId ?? 'pet-1',
    createdBy: overrides.createdBy ?? null,
    date: overrides.date ?? '2025-06-01',
    startTime: overrides.startTime ?? '10:00',
    durationMinutes: overrides.durationMinutes ?? 30,
    reason: overrides.reason ?? 'Checkup',
    status: overrides.status ?? 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validates: Requirements 3.6
 */
describe('Feature: veterinary-clinic-web, Property 10: Detección de conflictos de horario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('overlapping appointments are rejected, non-overlapping succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        futureDateArb,
        timeArb,
        durationArb,
        timeArb,
        durationArb,
        async (date, time1, duration1, time2, duration2) => {
          const start1 = timeToMinutes(time1);
          const end1 = start1 + duration1;
          const start2 = timeToMinutes(time2);
          const end2 = start2 + duration2;

          // Skip if times go past midnight
          if (end1 > 24 * 60 || end2 > 24 * 60) return;

          const overlaps = start1 < end2 && start2 < end1;

          // Mock pet exists
          vi.mocked(petRepository.findById).mockResolvedValue({
            id: 'pet-1',
            clientId: 'client-1',
            name: 'Fido',
            species: 'Perro',
            breed: null,
            birthDate: null,
            weight: null,
            microchipNumber: null,
            medicalNotes: null,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Mock conflict detection based on overlap calculation
          vi.mocked(appointmentRepository.checkConflict).mockResolvedValue(overlaps);

          // Mock create to return the appointment
          vi.mocked(appointmentRepository.create).mockResolvedValue(
            buildAppointment({ date, startTime: time2, durationMinutes: duration2 })
          );

          if (overlaps) {
            await expect(
              appointmentService.create({
                petId: 'pet-1',
                date,
                time: time2,
                duration: duration2,
                reason: 'Consulta',
              })
            ).rejects.toThrow(ConflictError);
          } else {
            const result = await appointmentService.create({
              petId: 'pet-1',
              date,
              time: time2,
              duration: duration2,
              reason: 'Consulta',
            });
            expect(result).toBeDefined();
            expect(result.date).toBe(date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 3.2
 */
describe('Feature: veterinary-clinic-web, Property 11: Ordenamiento de citas por hora', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findByDate returns appointments sorted by start_time ASC', async () => {
    await fc.assert(
      fc.asyncProperty(
        futureDateArb,
        fc.array(timeArb, { minLength: 2, maxLength: 10 }),
        async (date, times) => {
          // Build appointment objects with shuffled times
          const appointments = times.map((t, i) =>
            buildAppointment({ id: `appt-${i}`, date, startTime: t })
          );

          // Sort by startTime ASC to simulate correct repository behavior
          const sorted = [...appointments].sort((a, b) =>
            timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );

          vi.mocked(appointmentRepository.findByDate).mockResolvedValue(sorted);

          const result = await appointmentService.findByDate(date);

          // Verify the result is sorted by start time
          for (let i = 1; i < result.length; i++) {
            const prev = timeToMinutes(result[i - 1].startTime);
            const curr = timeToMinutes(result[i].startTime);
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 3.4, 3.5, 3.8
 */
describe('Feature: veterinary-clinic-web, Property 12: Máquina de estados de citas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scheduled appointments can be cancelled or completed; cancelled/completed reject transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('cancel' as const, 'complete' as const),
        fc.constantFrom('scheduled' as const, 'cancelled' as const, 'completed' as const),
        async (id, action, currentStatus) => {
          const appointment = buildAppointment({ id, status: currentStatus });

          vi.mocked(appointmentRepository.findById).mockResolvedValue(appointment);
          vi.mocked(appointmentRepository.updateStatus).mockResolvedValue(
            buildAppointment({
              id,
              status: action === 'cancel' ? 'cancelled' : 'completed',
            })
          );

          const serviceFn = action === 'cancel'
            ? appointmentService.cancel
            : appointmentService.complete;

          if (currentStatus === 'scheduled') {
            // Transition from scheduled should succeed
            const result = await serviceFn(id);
            expect(result).toBeDefined();
            expect(result!.status).toBe(action === 'cancel' ? 'cancelled' : 'completed');
          } else {
            // Transition from cancelled or completed should be rejected
            await expect(serviceFn(id)).rejects.toThrow(ValidationError);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 3.7
 */
describe('Feature: veterinary-clinic-web, Property 13: Rechazo de citas con datos inválidos', () => {
  it('invalid appointment data is rejected by validator', () => {
    // Arbitrary for invalid appointment inputs
    const invalidAppointmentArb = fc.oneof(
      // Missing petId (not a UUID)
      fc.record({
        petId: fc.constantFrom('', 'not-a-uuid', '123'),
        date: futureDateArb,
        time: timeArb,
        reason: fc.string({ minLength: 1, maxLength: 100 }),
        duration: durationArb,
      }),
      // Past date
      fc.record({
        petId: fc.uuid(),
        date: pastDateArb,
        time: timeArb,
        reason: fc.string({ minLength: 1, maxLength: 100 }),
        duration: durationArb,
      }),
      // Invalid duration (not a multiple of 15, or out of range)
      fc.record({
        petId: fc.uuid(),
        date: futureDateArb,
        time: timeArb,
        reason: fc.string({ minLength: 1, maxLength: 100 }),
        duration: fc.oneof(
          fc.integer({ min: 1, max: 14 }),          // too short
          fc.integer({ min: 121, max: 300 }),        // too long
          fc.constantFrom(16, 17, 22, 31, 47, 59)   // not multiples of 15
        ),
      }),
      // Invalid time format
      fc.record({
        petId: fc.uuid(),
        date: futureDateArb,
        time: fc.constantFrom('25:00', '12:60', 'abc', '1:30', '9:5', ''),
        reason: fc.string({ minLength: 1, maxLength: 100 }),
        duration: durationArb,
      }),
      // Empty reason
      fc.record({
        petId: fc.uuid(),
        date: futureDateArb,
        time: timeArb,
        reason: fc.constant(''),
        duration: durationArb,
      })
    );

    fc.assert(
      fc.property(invalidAppointmentArb, (data) => {
        const result = createAppointmentSchema.safeParse(data);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
