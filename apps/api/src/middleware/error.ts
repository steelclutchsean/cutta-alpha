import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

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

// PostgreSQL error codes for reference
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
};

// Type guard for postgres-js database errors
interface PostgresError {
  code?: string;
  detail?: string;
  constraint?: string;
  message: string;
}

function isPostgresError(err: unknown): err is PostgresError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PostgresError).code === 'string'
  );
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
  
  // Database errors (postgres-js)
  if (isPostgresError(err)) {
    const pgErr = err as PostgresError;
    switch (pgErr.code) {
      case PG_ERROR_CODES.UNIQUE_VIOLATION:
        res.status(409).json({
          error: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
        });
        return;
      case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        res.status(400).json({
          error: 'Referenced record does not exist',
          code: 'FOREIGN_KEY_ERROR',
        });
        return;
      case PG_ERROR_CODES.NOT_NULL_VIOLATION:
        res.status(400).json({
          error: 'Required field is missing',
          code: 'NOT_NULL_ERROR',
        });
        return;
      default:
        // Log unhandled DB errors for debugging
        console.error('Unhandled database error code:', pgErr.code);
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }
  
  // Default error - use optional chaining to safely access message
  const errorMessage = (err as Error).message || 'Internal server error';
  res.status(500).json({
    error: errorMessage,
    code: 'INTERNAL_ERROR',
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
}
