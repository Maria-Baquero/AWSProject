import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../../src/middlewares/validate';

function createMockReqResNext(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('should call next() when validation passes', () => {
    const { req, res, next } = createMockReqResNext({ name: 'Test', age: 25 });
    validate(testSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should set req.body to parsed data on success', () => {
    const { req, res, next } = createMockReqResNext({ name: 'Test', age: 25, extra: 'field' });
    validate(testSchema)(req, res, next);
    expect(req.body).toEqual({ name: 'Test', age: 25 });
    expect(req.body.extra).toBeUndefined();
  });

  it('should return 400 when validation fails', () => {
    const { req, res, next } = createMockReqResNext({ name: '', age: 25 });
    validate(testSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: expect.stringContaining('name'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 with field name when type is wrong', () => {
    const { req, res, next } = createMockReqResNext({ name: 'Test', age: 'not-a-number' });
    validate(testSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: expect.stringContaining('age'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when body is empty', () => {
    const { req, res, next } = createMockReqResNext({});
    validate(testSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
