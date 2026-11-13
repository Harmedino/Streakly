import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  const status =
    error instanceof ApiError
      ? error.status
      : error instanceof ZodError
        ? 422
        : error?.code === 11000
          ? 409
          : error?.type === 'entity.too.large'
            ? 413
            : error instanceof SyntaxError
              ? 400
              : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof ZodError
        ? error.issues.map((i) => `${i.path.join('.') || 'Request'}: ${i.message}`).join('; ')
        : status === 409
          ? 'This email is already registered.'
          : status === 413
            ? 'This workspace exceeds the 8 MB request limit. Export and split large notes before retrying.'
            : status === 400
              ? 'The request body must be valid JSON.'
              : 'The server could not complete this request. Please retry.';
  if (status === 500) console.error('Request failed:', error?.name || 'Error');
  res.status(status).json({
    ok: false,
    error: { code: error instanceof ApiError ? error.code : 'REQUEST_FAILED', message },
  });
}
