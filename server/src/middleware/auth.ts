import type { NextFunction, Request, Response } from 'express';
import { findSession } from '../services/auth';
import { ApiError } from './errors';
export interface AuthRequest extends Request {
  owner?: string;
  csrf?: string;
}
export async function protect(req: AuthRequest, _res: Response, next: NextFunction) {
  const found = await findSession(req.cookies?.streakly_session || '');
  if (!found) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to open your workspace.');
  req.owner = String(found.user._id);
  req.csrf = found.session.csrf;
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.get('x-csrf-token') !== found.session.csrf
  )
    throw new ApiError(403, 'CSRF', 'Your session verification expired. Reload before retrying.');
  next();
}
