import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Handle JSON parse errors
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as any).status === 400 &&
    'body' in err
  ) {
    res.status(400).json({
      statusCode: 400,
      message: 'El cuerpo de la solicitud no es JSON válido',
    });
    return;
  }

  // Unhandled errors — log error message internally (never log full err object
  // which could contain env variable values in nested properties)
  console.error('Unhandled error:', err.message);

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production: generic message only — no stack trace, no error details,
    // no env variable values can leak through this response
    res.status(500).json({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
  } else {
    // In development: include error message and stack for debugging
    res.status(500).json({
      statusCode: 500,
      message: err.message,
      stack: err.stack,
    });
  }
}
