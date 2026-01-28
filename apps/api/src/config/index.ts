import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  },
  
  // LiveKit
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
    url: process.env.LIVEKIT_URL!,
  },
  
  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
  },
  
  // Web App URL (for OAuth redirects)
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  
  // Sports Data API
  sportsDataApiKey: process.env.SPORTS_DATA_API_KEY,
  
  // Expo Push Notifications
  expoPushToken: process.env.EXPO_ACCESS_TOKEN,
  
  // Auction settings
  auction: {
    timerDuration: 15, // seconds
    timerExtension: 10, // seconds on new bid
    minBidIncrement: 1, // $1
  },
  
  // Platform settings
  platform: {
    feeRate: 0.01, // 1% secondary market fee
    minWithdrawal: 10, // $10 minimum
  },
} as const;

// Validate required config
const requiredEnvVars = [
  'DATABASE_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Missing required environment variable: ${envVar}`);
  }
}

export type Config = typeof config;

