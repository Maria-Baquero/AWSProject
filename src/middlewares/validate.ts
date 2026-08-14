import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const error = result.error as ZodError;
      const firstIssue = error.issues[0];
      const field = firstIssue.path.join('.');
      const message = field
        ? `El campo '${field}' no es válido: ${firstIssue.message}`
        : firstIssue.message;

      res.status(400).json({
        statusCode: 400,
        message,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
