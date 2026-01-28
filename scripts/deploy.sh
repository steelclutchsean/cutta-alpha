#!/bin/bash

# ============================================
# Cutta Deployment Script
# ============================================
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENV=${1:-production}
DEPLOY_DIR="/var/www/cutta"
REPO_URL="git@github.com:yourusername/cutta.git"
BRANCH="main"

echo "🚀 Deploying Cutta to $ENV..."

# Navigate to deploy directory
cd $DEPLOY_DIR

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm --filter @cutta/db prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
pnpm --filter @cutta/db prisma migrate deploy

# Build all packages
echo "🔨 Building packages..."
pnpm build

# Restart services with PM2
echo "🔄 Restarting services..."
pm2 reload ecosystem.config.js --env $ENV

# Show status
echo "✅ Deployment complete!"
pm2 status

echo "
📝 Post-deployment checklist:
  1. Check API health: curl https://api.yourdomain.com/health
  2. Check web app: https://yourdomain.com
  3. Monitor logs: pm2 logs
  4. Check error logs: tail -f logs/api-error.log
"


