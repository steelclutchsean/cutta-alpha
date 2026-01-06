import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@cutta/db';
import { signupSchema, loginSchema } from '@cutta/shared';
import { validate } from '../middleware/validate.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

export const authRouter = Router();

// Sign up
authRouter.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        balance: true,
        kycVerified: true,
        createdAt: true,
      },
    });
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Login
authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        balance: user.balance,
        kycVerified: user.kycVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        balance: true,
        kycVerified: true,
        createdAt: true,
        _count: {
          select: {
            poolMemberships: true,
            ownerships: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }
    
    res.json({
      ...user,
      poolsJoined: user._count.poolMemberships,
      ownedTeams: user._count.ownerships,
    });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can track it)
authRouter.post('/logout', authenticate, async (req, res) => {
  // In a production app, you might want to:
  // - Add the token to a blacklist in Redis
  // - Track logout events
  res.json({ message: 'Logged out successfully' });
});

