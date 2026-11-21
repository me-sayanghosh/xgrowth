import { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP read methods are exempt
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Exempt test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const csrfHeader = req.headers['x-xgrowth-csrf'];
  if (!csrfHeader || csrfHeader !== '1') {
    res.status(403).json({
      error: 'CSRF_BLOCKED',
      message: 'Missing or invalid x-xgrowth-csrf security header.',
    });
    return;
  }

  next();
}
