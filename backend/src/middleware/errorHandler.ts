import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/env.js';

export const errorHandler = (
  err: Error | AppError | ZodError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Handle Zod validation errors (e.g., from inline .parse() calls in controllers)
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join('; ');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
      },
    });
    return;
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'Internal Server Error';

  if (!config.isProduction && !isAppError) {
    console.error('Unhandled Server Error:', err);
  }

  // Exact assessment response format: { "error": { "code": "...", "message": "..." } }
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
};
