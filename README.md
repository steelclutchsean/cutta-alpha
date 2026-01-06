# Cutta - Calcutta Auction Platform

A full-stack mobile and web application for Calcutta-style auctions, featuring live draft rooms with streaming, real-time bidding, automatic payments, secondary market trading, and live tournament tracking.

## Features

- **Live Auctions**: Real-time bidding with built-in video streaming for commissioners
- **Draft Room Experience**: Interactive draft rooms with live chat, countdown timers, and bid tracking
- **Automatic Payments**: Credit card on file with automatic charging when you win
- **Secondary Market**: Trade team ownership (full or percentage) with a 1% platform fee
- **Real-time Payouts**: Watch your balance update as your teams win
- **Commissioner Tools**: Create pools, set custom payout structures, manage auctions
- **March Madness Ready**: Pre-loaded with tournament brackets and teams

## Tech Stack

### Frontend
- **Mobile**: Expo/React Native
- **Web**: Next.js 14 (App Router)
- **UI**: Custom design system with Tailwind CSS
- **State**: Zustand, SWR for data fetching
- **Real-time**: Socket.io client

### Backend
- **API**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io
- **Payments**: Stripe (Connect for payouts)
- **Streaming**: LiveKit
- **Cache**: Redis

## Project Structure

```
cutta/
├── apps/
│   ├── mobile/          # Expo React Native app
│   ├── web/             # Next.js web app
│   └── api/             # Node.js backend
├── packages/
│   ├── shared/          # Shared types, constants, utilities
│   ├── ui/              # Shared UI components
│   └── db/              # Prisma schema and client
├── docker-compose.yml   # Local development services
├── turbo.json          # Turborepo configuration
└── package.json        # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for local PostgreSQL and Redis)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cutta.git
cd cutta
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the database services:
```bash
docker-compose up -d
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Generate Prisma client and push schema:
```bash
pnpm db:generate
pnpm db:push
```

6. Seed the database:
```bash
pnpm --filter @cutta/db db:seed
```

7. Start the development servers:
```bash
pnpm dev
```

This will start:
- API server at http://localhost:3001
- Web app at http://localhost:3000
- Mobile app via Expo (scan QR code or run in simulator)

## Environment Variables

### Required

```env
# Database
DATABASE_URL="postgresql://cutta:cutta_dev_password@localhost:5432/cutta"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
```

### Optional (for full functionality)

```env
# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# LiveKit
LIVEKIT_API_KEY="xxx"
LIVEKIT_API_SECRET="xxx"
LIVEKIT_URL="wss://your-app.livekit.cloud"

# Sports Data API (for live scores)
SPORTS_DATA_API_KEY="xxx"

# Expo Push Notifications
EXPO_ACCESS_TOKEN="xxx"
```

## Key Features Explained

### Auction System

The auction uses a countdown timer system:
- Each team starts with a configurable starting bid
- Bids must be at least $1 higher than the current bid
- Timer resets to 15 seconds on each new bid
- When timer expires, the highest bidder wins
- Payment is automatically charged to their card on file

### Secondary Market

Users can list their owned teams for sale:
- List full or partial ownership percentages
- Set a fixed price or accept offers
- Platform takes 1% fee on all transactions
- Ownership transfers atomically with payment

### Payout System

Commissioners configure payout rules:
- Percentage-based payouts for each achievement
- Automatic calculation when teams advance/win
- Real-time balance updates via WebSocket
- Full transaction history

## Development

### Running Tests
```bash
pnpm test
```

### Building for Production
```bash
pnpm build
```

### Database Operations
```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes
pnpm db:push

# Create migration
pnpm --filter @cutta/db db:migrate

# Open Prisma Studio
pnpm db:studio
```

## Deployment

### API
The API can be deployed to any Node.js hosting:
- Railway
- Render
- AWS ECS
- Google Cloud Run

### Web
The Next.js app can be deployed to:
- Vercel (recommended)
- Netlify
- AWS Amplify

### Mobile
Build with Expo EAS:
```bash
# iOS
pnpm --filter @cutta/mobile build:ios

# Android
pnpm --filter @cutta/mobile build:android
```

## License

MIT

