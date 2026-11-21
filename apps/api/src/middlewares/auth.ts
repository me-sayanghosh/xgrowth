import { Request, Response, NextFunction } from 'express';
import { getEnv } from '@xgrowth/config';

export interface AuthenticatedRequest extends Request {
  user?: {
    role: 'owner';
    id: string;
  };
}

export function singleOwnerAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const env = getEnv();

  // Allow bypass in test mode if test header provided or in dev if local
  if (process.env.NODE_ENV === 'test' && !req.headers.authorization) {
    req.user = { role: 'owner', id: 'test-owner' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing Authorization header.',
    });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== env.APP_SESSION_SECRET) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Invalid session secret or token.',
    });
    return;
  }

  req.user = { role: 'owner', id: 'system-owner' };
  next();
}
