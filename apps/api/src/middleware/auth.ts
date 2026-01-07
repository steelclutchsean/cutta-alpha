import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/express';
import jwt from 'jsonwebtoken';
import { prisma } from '@cutta/db';
import { config } from '../config/index.js';

export interface AuthUser {
  id: string;
  clerkId: string;
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
    
    // Try Clerk token verification first
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const verified = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        
        if (verified && verified.sub) {
          // Find or lookup user by Clerk ID
          const user = await prisma.user.findFirst({
            where: { clerkId: verified.sub },
            select: { id: true, clerkId: true, email: true, displayName: true },
          });
          
          if (user) {
            req.user = user as AuthUser;
            next();
            return;
          }
          
          // User not found in DB - they need to sync first
          // Return a temporary user object for sync endpoint
          req.user = {
            id: '',
            clerkId: verified.sub,
            email: (verified as any).email || '',
            displayName: '',
          };
          next();
          return;
        }
      } catch (clerkError) {
        // If Clerk verification fails, fall back to legacy JWT
        console.log('Clerk token verification failed, trying legacy JWT');
      }
    }
    
    // Development mode: decode Clerk JWT without verification (keyless mode)
    // This allows local development without setting up Clerk keys
    if (config.nodeEnv === 'development' && !process.env.CLERK_SECRET_KEY) {
      try {
        // Decode the JWT without verification (UNSAFE - dev only!)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const clerkId = payload.sub;
          
          if (clerkId) {
            // Find or create user by Clerk ID
            let user = await prisma.user.findFirst({
              where: { clerkId },
              select: { id: true, clerkId: true, email: true, displayName: true },
            });
            
            if (!user) {
              // Auto-create user in dev mode
              const email = payload.email || `${clerkId}@dev.local`;
              user = await prisma.user.create({
                data: {
                  clerkId,
                  email,
                  displayName: payload.name || payload.first_name || 'Dev User',
                },
                select: { id: true, clerkId: true, email: true, displayName: true },
              });
              console.log(`[DEV] Auto-created user: ${user.email}`);
            }
            
            req.user = user as AuthUser;
            next();
            return;
          }
        }
      } catch (devError) {
        console.log('[DEV] Failed to decode Clerk keyless token:', devError);
      }
    }
    
    // Fall back to legacy JWT verification for backwards compatibility
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, clerkId: true, email: true, displayName: true },
      });
      
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      req.user = {
        ...user,
        clerkId: user.clerkId || '',
      };
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
    expiresIn: config.jwtExpiresIn,
  });
}
