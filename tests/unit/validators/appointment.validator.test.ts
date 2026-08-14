import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAppointmentSchema } from '../../../src/validators/appointment.validator';

describe('createAppointmentSchema', () => {
  const validAppointment = {
    petId: '550e8400-e29b-41d4-a716-446655440000',
    date: '2099-06-15',
    time: '10:30',
    reason: 'Consulta general',
    duration: 30,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('valid data', () => {
    it('should accept valid appointment data', () => {
      const result = createAppointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validAppointment);
      }
    });

    it('should accept today as a valid date', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        date: '2024-01-15',
      });
      expect(result.success).toBe(true);
    });

    it('should accept duration of 15 minutes', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should accept duration of 120 minutes', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 120,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid durations (multiples of 15 within range)', () => {
      for (const duration of [15, 30, 45, 60, 75, 90, 105, 120]) {
        const result = createAppointmentSchema.safeParse({
          ...validAppointment,
          duration,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept time 00:00', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '00:00',
      });
      expect(result.success).toBe(true);
    });

    it('should accept time 23:59', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '23:59',
      });
      expect(result.success).toBe(true);
    });

    it('should accept reason of exactly 500 characters', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        reason: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('past date validation', () => {
    it('should reject a date in the past', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        date: '2023-12-01',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La fecha no puede ser en el pasado');
      }
    });

    it('should reject yesterday', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        date: '2024-01-14',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid time format', () => {
    it('should reject time without leading zero', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '9:30',
      });
      expect(result.success).toBe(false);
    });

    it('should reject time with hour 24', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '24:00',
      });
      expect(result.success).toBe(false);
    });

    it('should reject time with minutes 60', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '10:60',
      });
      expect(result.success).toBe(false);
    });

    it('should reject time with seconds', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: '10:30:00',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid time string', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        time: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid duration', () => {
    it('should reject duration not a multiple of 15', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 20,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'La duración debe ser en incrementos de 15 minutos'
        );
      }
    });

    it('should reject duration of 10 (below minimum)', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration of 121 (above maximum)', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 121,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration of 135 (above max even if multiple of 15)', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 135,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration of 0', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: -15,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer duration', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration: 30.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('missing fields', () => {
    it('should reject empty object', () => {
      const result = createAppointmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject missing petId', () => {
      const { petId, ...noPetId } = validAppointment;
      const result = createAppointmentSchema.safeParse(noPetId);
      expect(result.success).toBe(false);
    });

    it('should reject missing date', () => {
      const { date, ...noDate } = validAppointment;
      const result = createAppointmentSchema.safeParse(noDate);
      expect(result.success).toBe(false);
    });

    it('should reject missing time', () => {
      const { time, ...noTime } = validAppointment;
      const result = createAppointmentSchema.safeParse(noTime);
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const { reason, ...noReason } = validAppointment;
      const result = createAppointmentSchema.safeParse(noReason);
      expect(result.success).toBe(false);
    });

    it('should reject missing duration', () => {
      const { duration, ...noDuration } = validAppointment;
      const result = createAppointmentSchema.safeParse(noDuration);
      expect(result.success).toBe(false);
    });
  });

  describe('reason validation', () => {
    it('should reject reason longer than 500 characters', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        reason: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        reason: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('petId validation', () => {
    it('should reject invalid UUID for petId', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        petId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty petId', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        petId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('date format validation', () => {
    it('should reject invalid date format', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        date: '15-06-2099',
      });
      expect(result.success).toBe(false);
    });

    it('should reject date with time component', () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        date: '2099-06-15T10:30:00Z',
      });
      expect(result.success).toBe(false);
    });
  });
});
