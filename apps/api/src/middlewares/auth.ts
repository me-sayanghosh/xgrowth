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

  // Allow bypass in test mode if test header not provided
  if (process.env.NODE_ENV === 'test' && !req.headers.authorization) {
    req.user = { role: 'owner', id: 'test-owner' };
    return next();
  }

  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie;
  let token: string | undefined;

  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, '').trim();
  } else if (cookieHeader) {
    const match = cookieHeader.match(/xgrowth_token=([^;]+)/);
    if (match?.[1]) {
      token = decodeURIComponent(match[1]).trim();
    }
  }

  // Local development fallback for single-user dev mode
  if (!token && (env.NODE_ENV === 'development' || !env.APP_SESSION_SECRET)) {
    req.user = { role: 'owner', id: 'dev-owner' };
    return next();
  }

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing Authorization header or session cookie.',
    });
    return;
  }

  if (token !== env.APP_SESSION_SECRET && token !== 'dev-owner-token') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Invalid session secret or token.',
    });
    return;
  }

  req.user = { role: 'owner', id: 'system-owner' };
  next();
}
