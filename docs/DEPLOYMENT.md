# Cutta Deployment Guide

This guide covers deploying Cutta to a Hostinger VPS (or any Ubuntu-based VPS).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Hostinger VPS                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Nginx                              │    │
│  │  yourdomain.com → localhost:3000 (Next.js)           │    │
│  │  api.yourdomain.com → localhost:3001 (API)           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│          ┌────────────────┼────────────────┐                │
│          ▼                ▼                ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Next.js    │ │   Node API   │ │  PostgreSQL  │        │
│  │   :3000      │ │   :3001      │ │   :5432      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│          │                │                ▲                │
│          │                ▼                │                │
│          │        ┌──────────────┐         │                │
│          │        │    Redis     │         │                │
│          │        │    :6379     │         │                │
│          │        └──────────────┘         │                │
│          └────────────────┼────────────────┘                │
│                           ▼                                  │
│                   External Services                          │
│             (Google OAuth, Stripe, LiveKit)                  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Ubuntu 22.04+ VPS (2GB+ RAM recommended)
- Domain name pointing to VPS IP
- SSH access to VPS

## Quick Setup

1. **SSH into your VPS:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Run the setup script:**
   ```bash
   wget -O vps-setup.sh https://raw.githubusercontent.com/yourrepo/cutta/main/scripts/vps-setup.sh
   chmod +x vps-setup.sh
   sudo ./vps-setup.sh
   ```

## Manual Setup

### 1. System Updates

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. Node.js (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pnpm
```

### 3. PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql << EOF
CREATE USER cutta WITH PASSWORD 'your_secure_password';
CREATE DATABASE cutta OWNER cutta;
GRANT ALL PRIVILEGES ON DATABASE cutta TO cutta;
EOF
```

### 4. Redis

```bash
sudo apt install -y redis-server
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo systemctl restart redis
sudo systemctl enable redis
```

### 5. Nginx

```bash
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/cutta
```

Add this configuration:

```nginx
# Main web app
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cutta /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 7. PM2 Process Manager

```bash
npm install -g pm2
pm2 startup systemd
```

## Application Deployment

### 1. Clone Repository

```bash
cd /var/www
git clone git@github.com:yourrepo/cutta.git
cd cutta
```

### 2. Configure Environment

```bash
# Copy example configs
cp config/env.example .env
cp config/env.api.example apps/api/.env
cp config/env.web.example apps/web/.env.local

# Edit with your values
nano .env
nano apps/api/.env
nano apps/web/.env.local
```

### 3. Install & Build

```bash
pnpm install
pnpm --filter @cutta/db prisma generate
pnpm --filter @cutta/db prisma migrate deploy
pnpm build
```

### 4. Start Services

```bash
pm2 start ecosystem.config.js
pm2 save
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Choose **Web application**
6. Add Authorized JavaScript origins:
   - `https://yourdomain.com`
   - `http://localhost:3000` (for development)
7. Add Authorized redirect URIs:
   - `https://api.yourdomain.com/auth/google/callback`
   - `http://localhost:3001/auth/google/callback` (for development)
8. Get your credentials:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
9. Configure OAuth consent screen (APIs & Services > OAuth consent screen):
   - Add app name, user support email
   - Add scopes: email, profile, openid

## LiveKit Setup (Video Streaming)

LiveKit is used for live video streaming in the commissioner studio. We recommend using LiveKit Cloud for production.

### LiveKit Cloud Setup (Recommended)

1. Go to [cloud.livekit.io](https://cloud.livekit.io) and create an account
2. Create a new project
3. Copy your credentials:
   - API Key: `APIxxxxxxx`
   - API Secret: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - WebSocket URL: `wss://your-project.livekit.cloud`

4. Add to your environment files:

**apps/api/.env:**
```env
LIVEKIT_API_KEY=APIxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### LiveKit Features

The LiveKit integration enables:
- **Commissioner Studio**: Live video broadcasting from the commissioner's camera
- **Viewer Count**: Real-time viewer count in the studio
- **Video Controls**: Mute/unmute audio, enable/disable video

### Free Tier Limits

LiveKit Cloud free tier includes:
- 50 participants per room
- 500 minutes/month
- Perfect for development and small pools

### Self-Hosted Alternative

For larger deployments, you can self-host LiveKit:

```bash
# Install LiveKit server
curl -sSL https://get.livekit.io | bash

# Generate config
livekit-server generate-config

# Start server
livekit-server --config config.yaml
```

See [LiveKit self-hosting docs](https://docs.livekit.io/realtime/self-hosting/) for details.

## Monitoring & Maintenance

### View Logs

```bash
pm2 logs              # All logs
pm2 logs cutta-api    # API logs only
pm2 logs cutta-web    # Web logs only
```

### Restart Services

```bash
pm2 restart all
pm2 restart cutta-api
pm2 restart cutta-web
```

### Health Check

```bash
curl https://api.yourdomain.com/health
```

### Database Backup

Set up automated backups:

```bash
# Add to crontab
crontab -e

# Add this line (runs at 3 AM daily)
0 3 * * * /var/www/cutta/scripts/backup-db.sh
```

### Updates

```bash
cd /var/www/cutta
./scripts/deploy.sh
```

## Troubleshooting

### App won't start

```bash
pm2 logs --lines 100
cat apps/api/.env  # Check env vars
```

### Database connection issues

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1;"
```

### Nginx issues

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Redis issues

```bash
sudo systemctl status redis
redis-cli ping
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Configure firewall (UFW)
- [ ] Enable SSL certificates
- [ ] Set up automated backups
- [ ] Configure fail2ban
- [ ] Keep system updated
- [ ] Use SSH keys (disable password auth)

