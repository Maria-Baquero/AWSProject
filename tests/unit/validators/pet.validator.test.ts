import { describe, it, expect } from 'vitest';
import { createPetSchema, updatePetSchema } from '../../../src/validators/pet.validator';

describe('createPetSchema', () => {
  const validPet = {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Luna',
    species: 'Perro',
    breed: 'Labrador',
    birthDate: '2020-05-15',
    weight: 25.5,
    microchipNumber: 'ABC123456789',
    medicalNotes: 'Vacunación al día',
  };

  it('should accept valid pet data with all fields', () => {
    const result = createPetSchema.safeParse(validPet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validPet);
    }
  });

  it('should accept valid pet data with only required fields', () => {
    const result = createPetSchema.safeParse({
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Luna',
      species: 'Gato',
    });
    expect(result.success).toBe(true);
  });

  // clientId validations
  it('should reject missing clientId', () => {
    const { clientId, ...noCientId } = validPet;
    const result = createPetSchema.safeParse(noCientId);
    expect(result.success).toBe(false);
  });

  it('should reject invalid UUID for clientId', () => {
    const result = createPetSchema.safeParse({ ...validPet, clientId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  // name validations
  it('should reject empty name', () => {
    const result = createPetSchema.safeParse({ ...validPet, name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept name of exactly 1 character', () => {
    const result = createPetSchema.safeParse({ ...validPet, name: 'A' });
    expect(result.success).toBe(true);
  });

  it('should accept name of exactly 100 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('should reject name longer than 100 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  // species validations
  it('should reject empty species', () => {
    const result = createPetSchema.safeParse({ ...validPet, species: '' });
    expect(result.success).toBe(false);
  });

  it('should accept species of exactly 1 character', () => {
    const result = createPetSchema.safeParse({ ...validPet, species: 'A' });
    expect(result.success).toBe(true);
  });

  it('should accept species of exactly 50 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, species: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('should reject species longer than 50 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, species: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  // breed validations
  it('should accept breed up to 50 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, breed: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('should reject breed longer than 50 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, breed: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('should accept missing breed (optional)', () => {
    const { breed, ...noBreed } = validPet;
    const result = createPetSchema.safeParse(noBreed);
    expect(result.success).toBe(true);
  });

  // weight validations
  it('should accept weight of 0.01 (minimum)', () => {
    const result = createPetSchema.safeParse({ ...validPet, weight: 0.01 });
    expect(result.success).toBe(true);
  });

  it('should accept weight of 999.99 (maximum)', () => {
    const result = createPetSchema.safeParse({ ...validPet, weight: 999.99 });
    expect(result.success).toBe(true);
  });

  it('should reject weight less than 0.01', () => {
    const result = createPetSchema.safeParse({ ...validPet, weight: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject weight greater than 999.99', () => {
    const result = createPetSchema.safeParse({ ...validPet, weight: 1000 });
    expect(result.success).toBe(false);
  });

  it('should accept missing weight (optional)', () => {
    const { weight, ...noWeight } = validPet;
    const result = createPetSchema.safeParse(noWeight);
    expect(result.success).toBe(true);
  });

  // microchipNumber validations
  it('should accept valid alphanumeric microchipNumber', () => {
    const result = createPetSchema.safeParse({ ...validPet, microchipNumber: 'ABC123' });
    expect(result.success).toBe(true);
  });

  it('should accept microchipNumber of exactly 25 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, microchipNumber: 'A'.repeat(25) });
    expect(result.success).toBe(true);
  });

  it('should reject microchipNumber longer than 25 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, microchipNumber: 'A'.repeat(26) });
    expect(result.success).toBe(false);
  });

  it('should reject microchipNumber with non-alphanumeric characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, microchipNumber: 'ABC-123!' });
    expect(result.success).toBe(false);
  });

  it('should accept null microchipNumber', () => {
    const result = createPetSchema.safeParse({ ...validPet, microchipNumber: null });
    expect(result.success).toBe(true);
  });

  it('should accept missing microchipNumber (optional)', () => {
    const { microchipNumber, ...noMicrochip } = validPet;
    const result = createPetSchema.safeParse(noMicrochip);
    expect(result.success).toBe(true);
  });

  // medicalNotes validations
  it('should accept medicalNotes up to 2000 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, medicalNotes: 'a'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('should reject medicalNotes longer than 2000 characters', () => {
    const result = createPetSchema.safeParse({ ...validPet, medicalNotes: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('should accept missing medicalNotes (optional)', () => {
    const { medicalNotes, ...noNotes } = validPet;
    const result = createPetSchema.safeParse(noNotes);
    expect(result.success).toBe(true);
  });

  // birthDate validations
  it('should accept valid ISO date format', () => {
    const result = createPetSchema.safeParse({ ...validPet, birthDate: '2023-12-31' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const result = createPetSchema.safeParse({ ...validPet, birthDate: '31/12/2023' });
    expect(result.success).toBe(false);
  });

  it('should reject date with wrong separator', () => {
    const result = createPetSchema.safeParse({ ...validPet, birthDate: '2023/12/31' });
    expect(result.success).toBe(false);
  });

  it('should accept missing birthDate (optional)', () => {
    const { birthDate, ...noBirthDate } = validPet;
    const result = createPetSchema.safeParse(noBirthDate);
    expect(result.success).toBe(true);
  });

  // Missing required fields
  it('should reject missing name', () => {
    const { name, ...noName } = validPet;
    const result = createPetSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('should reject missing species', () => {
    const { species, ...noSpecies } = validPet;
    const result = createPetSchema.safeParse(noSpecies);
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = createPetSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updatePetSchema', () => {
  it('should accept partial updates with only name', () => {
    const result = updatePetSchema.safeParse({ name: 'Max' });
    expect(result.success).toBe(true);
  });

  it('should accept partial updates with only species', () => {
    const result = updatePetSchema.safeParse({ species: 'Gato' });
    expect(result.success).toBe(true);
  });

  it('should accept partial updates with only weight', () => {
    const result = updatePetSchema.safeParse({ weight: 10.5 });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (no fields to update)', () => {
    const result = updatePetSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept null values for nullable fields', () => {
    const result = updatePetSchema.safeParse({
      breed: null,
      birthDate: null,
      weight: null,
      microchipNumber: null,
      medicalNotes: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = updatePetSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty species', () => {
    const result = updatePetSchema.safeParse({ species: '' });
    expect(result.success).toBe(false);
  });

  it('should reject name longer than 100 characters', () => {
    const result = updatePetSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should reject species longer than 50 characters', () => {
    const result = updatePetSchema.safeParse({ species: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('should reject weight out of range', () => {
    const result = updatePetSchema.safeParse({ weight: 1000 });
    expect(result.success).toBe(false);
  });

  it('should reject weight of 0', () => {
    const result = updatePetSchema.safeParse({ weight: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid microchipNumber format', () => {
    const result = updatePetSchema.safeParse({ microchipNumber: 'ABC-123!' });
    expect(result.success).toBe(false);
  });

  it('should reject microchipNumber longer than 25 characters', () => {
    const result = updatePetSchema.safeParse({ microchipNumber: 'A'.repeat(26) });
    expect(result.success).toBe(false);
  });

  it('should reject medicalNotes longer than 2000 characters', () => {
    const result = updatePetSchema.safeParse({ medicalNotes: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid birthDate format', () => {
    const result = updatePetSchema.safeParse({ birthDate: '31-12-2023' });
    expect(result.success).toBe(false);
  });

  it('should not accept clientId (not updatable)', () => {
    const result = updatePetSchema.safeParse({
      name: 'Max',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('clientId');
    }
  });
});
