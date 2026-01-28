import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, eq, users } from '@cutta/db';
import { config } from '../config/index.js';

export interface AuthUser {
  id: string;
  googleId: string | null;
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
        columns: { id: true, googleId: true, email: true, displayName: true },
      });
      
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      req.user = user as AuthUser;
      next();
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  authenticate(req, res, next);
}

export function generateToken(user: { id: string; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}
