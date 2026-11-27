import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getEnv } from '@xgrowth/config';

export interface AuthenticatedRequest extends Request {
  user?: {
    role: 'owner';
    id: string;
  };
}

function timingSafeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function singleOwnerAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const env = getEnv();
  const nodeEnv = process.env.NODE_ENV || env.NODE_ENV;
  const isProduction = nodeEnv === 'production';

  // Allow bypass in test mode only when no explicit Authorization header is sent
  if (nodeEnv === 'test' && !req.headers.authorization) {
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

  // Local development fallback is strictly prohibited in production
  if (!token && !isProduction && (nodeEnv === 'development' || !env.APP_SESSION_SECRET)) {
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

  const matchesSessionSecret = Boolean(env.APP_SESSION_SECRET) && timingSafeEquals(token, env.APP_SESSION_SECRET);
  const matchesDevToken = !isProduction && timingSafeEquals(token, 'dev-owner-token');

  if (!matchesSessionSecret && !matchesDevToken) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Invalid session secret or token.',
    });
    return;
  }

  req.user = { role: 'owner', id: 'system-owner' };
  next();
}
