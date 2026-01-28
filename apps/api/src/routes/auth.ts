import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { db, eq, count, users, poolMembers, ownerships } from '@cutta/db';
import { signupSchema, loginSchema } from '@cutta/shared';
import { validate } from '../middleware/validate.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { config } from '../config/index.js';

export const authRouter = Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

// Sign up
authRouter.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (existingUser) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const [user] = await db.insert(users)
      .values({
        email,
        passwordHash,
        displayName,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        balance: users.balance,
        kycVerified: users.kycVerified,
        createdAt: users.createdAt,
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
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
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
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
      columns: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        balance: true,
        kycVerified: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get counts
    const [poolMembershipCount] = await db.select({ count: count() })
      .from(poolMembers)
      .where(eq(poolMembers.userId, req.user!.id));
    
    const [ownershipCount] = await db.select({ count: count() })
      .from(ownerships)
      .where(eq(ownerships.userId, req.user!.id));
    
    res.json({
      ...user,
      poolsJoined: poolMembershipCount?.count || 0,
      ownedTeams: ownershipCount?.count || 0,
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

// Google OAuth - Redirect to Google consent screen
authRouter.get('/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ];

  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

// Google OAuth - Callback handler
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error) {
      // User cancelled or error occurred
      return res.redirect(`${config.webUrl}/login?error=google_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.webUrl}/login?error=no_code`);
    }

    // Exchange code for tokens
    let tokens;
    try {
      const result = await googleClient.getToken(code);
      tokens = result.tokens;
    } catch (tokenError: any) {
      throw tokenError;
    }
    googleClient.setCredentials(tokens);

    // Get user info from Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${config.webUrl}/login?error=no_email`);
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, googleId!),
    });

    if (!user) {
      // Check if user exists by email (link accounts)
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        // Link existing user to Google
        const shouldUpdateAvatar = user.avatarType === 'GOOGLE' || !user.avatarUrl;
        const [updated] = await db.update(users)
          .set({
            googleId: googleId!,
            ...(shouldUpdateAvatar && picture && {
              avatarUrl: picture,
              avatarType: 'GOOGLE' as const,
            }),
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      } else {
        // Create new user
        const [created] = await db.insert(users)
          .values({
            googleId: googleId!,
            email,
            displayName: name || email.split('@')[0],
            avatarUrl: picture || null,
            avatarType: picture ? 'GOOGLE' : 'CUSTOM',
            passwordHash: null, // Google users don't have passwords
          })
          .returning();
        user = created;
      }
    } else {
      // Update user info if using Google avatar
      if (user.avatarType === 'GOOGLE' && picture) {
        const [updated] = await db.update(users)
          .set({
            displayName: name || user.displayName,
            avatarUrl: picture,
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }
    }

    // Generate JWT token
    const token = generateToken(user);

    // Redirect back to web app with token
    res.redirect(`${config.webUrl}/auth/callback?token=${token}`);
  } catch (error: any) {
    console.error('Google OAuth error:', error);
    res.redirect(`${config.webUrl}/login?error=google_auth_failed`);
  }
});

// Sync Google user (for web app to sync user data after OAuth)
authRouter.post('/google/sync', authenticate, async (req, res, next) => {
  try {
    const { googleId, email, displayName, avatarUrl } = req.body;

    if (!googleId || !email) {
      throw new AppError(400, 'googleId and email are required', 'VALIDATION_ERROR');
    }

    // Find user by googleId
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, googleId),
    });

    if (!user) {
      // Check if user exists by email
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        // Link existing user to Google
        const shouldUpdateAvatar = user.avatarType === 'GOOGLE' || !user.avatarUrl;
        const [updated] = await db.update(users)
          .set({
            googleId,
            ...(shouldUpdateAvatar && avatarUrl && {
              avatarUrl,
              avatarType: 'GOOGLE' as const,
            }),
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      } else {
        // Create new user
        const [created] = await db.insert(users)
          .values({
            googleId,
            email,
            displayName: displayName || email.split('@')[0],
            avatarUrl,
            avatarType: avatarUrl ? 'GOOGLE' : 'CUSTOM',
            passwordHash: null,
          })
          .returning();
        user = created;
      }
    } else {
      // Update existing user info
      const shouldUpdateAvatar = user.avatarType === 'GOOGLE';
      const [updated] = await db.update(users)
        .set({
          displayName: displayName || user.displayName,
          ...(shouldUpdateAvatar && avatarUrl && { avatarUrl }),
        })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
    }

    res.json({
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarType: user.avatarType,
      presetAvatarId: user.presetAvatarId,
      phone: user.phone,
      balance: user.balance,
      kycVerified: user.kycVerified,
    });
  } catch (error) {
    next(error);
  }
});
