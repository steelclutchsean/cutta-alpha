import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@cutta/db';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);
  
  // Custom app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  
  // Zod validation errors - check by name since instanceof can fail across packages
  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: zodErr.errors?.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })) || [{ field: 'unknown', message: err.message }],
    });
    return;
  }
  
  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          error: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
        });
        return;
      case 'P2025':
        res.status(404).json({
          error: 'Record not found',
          code: 'NOT_FOUND',
        });
        return;
      default:
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }
  
  // Default error
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
}

