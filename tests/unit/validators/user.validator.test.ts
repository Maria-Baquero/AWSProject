import { describe, it, expect } from 'vitest';
import { createUserSchema, loginSchema } from '../../../src/validators/user.validator';

describe('createUserSchema', () => {
  const validUser = {
    fullName: 'Dr. Carlos Pérez',
    email: 'carlos@clinica.com',
    password: 'password123',
    role: 'veterinarian' as const,
  };

  it('should accept valid user data', () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validUser);
    }
  });

  it('should accept receptionist role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'receptionist' });
    expect(result.success).toBe(true);
  });

  it('should reject empty fullName', () => {
    const result = createUserSchema.safeParse({ ...validUser, fullName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject fullName longer than 100 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, fullName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should accept fullName of exactly 1 character', () => {
    const result = createUserSchema.safeParse({ ...validUser, fullName: 'A' });
    expect(result.success).toBe(true);
  });

  it('should accept fullName of exactly 100 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, fullName: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = createUserSchema.safeParse({ ...validUser, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject email without domain', () => {
    const result = createUserSchema.safeParse({ ...validUser, email: 'user@' });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('should accept password of exactly 8 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'admin' });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = createUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const { email, ...noEmail } = validUser;
    const result = createUserSchema.safeParse(noEmail);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const { password, ...noPassword } = validUser;
    const result = createUserSchema.safeParse(noPassword);
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  const validLogin = {
    email: 'carlos@clinica.com',
    password: 'password123',
  };

  it('should accept valid login data', () => {
    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validLogin);
    }
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({ ...validLogin, email: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ ...validLogin, password: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const result = loginSchema.safeParse({ password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({ email: 'carlos@clinica.com' });
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
