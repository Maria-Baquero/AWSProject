import { describe, it, expect } from 'vitest';
import { createClientSchema, updateClientSchema } from '../../../src/validators/client.validator';

describe('createClientSchema', () => {
  const validClient = {
    fullName: 'Juan García López',
    phone: '+5491155667788',
    email: 'juan@example.com',
    address: 'Calle Falsa 123',
  };

  it('should accept valid client data with all fields', () => {
    const result = createClientSchema.safeParse(validClient);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validClient);
    }
  });

  it('should accept client with only phone (no email)', () => {
    const { email, ...clientWithPhone } = validClient;
    const result = createClientSchema.safeParse(clientWithPhone);
    expect(result.success).toBe(true);
  });

  it('should accept client with only email (no phone)', () => {
    const { phone, ...clientWithEmail } = validClient;
    const result = createClientSchema.safeParse(clientWithEmail);
    expect(result.success).toBe(true);
  });

  it('should accept client without address', () => {
    const { address, ...clientNoAddress } = validClient;
    const result = createClientSchema.safeParse(clientNoAddress);
    expect(result.success).toBe(true);
  });

  it('should reject client without both phone and email', () => {
    const { phone, email, ...clientNoContact } = validClient;
    const result = createClientSchema.safeParse(clientNoContact);
    expect(result.success).toBe(false);
  });

  // fullName validations
  it('should reject empty fullName', () => {
    const result = createClientSchema.safeParse({ ...validClient, fullName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing fullName', () => {
    const { fullName, ...noName } = validClient;
    const result = createClientSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('should accept fullName of exactly 1 character', () => {
    const result = createClientSchema.safeParse({ ...validClient, fullName: 'A' });
    expect(result.success).toBe(true);
  });

  it('should accept fullName of exactly 100 characters', () => {
    const result = createClientSchema.safeParse({ ...validClient, fullName: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('should reject fullName longer than 100 characters', () => {
    const result = createClientSchema.safeParse({ ...validClient, fullName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  // phone validations
  it('should accept phone with + prefix', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '+1234567890' });
    expect(result.success).toBe(true);
  });

  it('should accept phone without + prefix', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '1234567890' });
    expect(result.success).toBe(true);
  });

  it('should accept phone with minimum 7 digits', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '1234567' });
    expect(result.success).toBe(true);
  });

  it('should accept phone with maximum 15 digits', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '123456789012345' });
    expect(result.success).toBe(true);
  });

  it('should reject phone with less than 7 digits', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '123456' });
    expect(result.success).toBe(false);
  });

  it('should reject phone with more than 15 digits', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '1234567890123456' });
    expect(result.success).toBe(false);
  });

  it('should reject phone with letters', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '123456abc' });
    expect(result.success).toBe(false);
  });

  it('should reject phone with spaces', () => {
    const result = createClientSchema.safeParse({ ...validClient, phone: '123 456 7890' });
    expect(result.success).toBe(false);
  });

  // email validations
  it('should accept valid email format', () => {
    const result = createClientSchema.safeParse({ ...validClient, email: 'test@domain.com' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = createClientSchema.safeParse({ ...validClient, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject email without domain', () => {
    const result = createClientSchema.safeParse({ ...validClient, email: 'user@' });
    expect(result.success).toBe(false);
  });

  // address validations
  it('should accept address of exactly 200 characters', () => {
    const result = createClientSchema.safeParse({ ...validClient, address: 'a'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('should reject address longer than 200 characters', () => {
    const result = createClientSchema.safeParse({ ...validClient, address: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('updateClientSchema', () => {
  it('should accept partial update with only fullName', () => {
    const result = updateClientSchema.safeParse({ fullName: 'Nuevo Nombre' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only phone', () => {
    const result = updateClientSchema.safeParse({ phone: '+1234567890' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only email', () => {
    const result = updateClientSchema.safeParse({ email: 'nuevo@email.com' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (no fields to update)', () => {
    const result = updateClientSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept nullable phone (setting to null)', () => {
    const result = updateClientSchema.safeParse({ phone: null, email: 'keep@email.com' });
    expect(result.success).toBe(true);
  });

  it('should accept nullable email (setting to null)', () => {
    const result = updateClientSchema.safeParse({ email: null, phone: '+1234567890' });
    expect(result.success).toBe(true);
  });

  it('should reject both phone and email set to null', () => {
    const result = updateClientSchema.safeParse({ phone: null, email: null });
    expect(result.success).toBe(false);
  });

  it('should reject invalid fullName (too long)', () => {
    const result = updateClientSchema.safeParse({ fullName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid fullName (empty string)', () => {
    const result = updateClientSchema.safeParse({ fullName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid phone format in update', () => {
    const result = updateClientSchema.safeParse({ phone: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format in update', () => {
    const result = updateClientSchema.safeParse({ email: 'not-valid' });
    expect(result.success).toBe(false);
  });

  it('should reject address longer than 200 characters in update', () => {
    const result = updateClientSchema.safeParse({ address: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('should accept nullable address', () => {
    const result = updateClientSchema.safeParse({ address: null });
    expect(result.success).toBe(true);
  });
});
