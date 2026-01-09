#!/bin/bash

# ============================================
# Cutta VPS Setup Script
# ============================================
# Run this on a fresh Ubuntu 22.04+ VPS
# Usage: sudo ./scripts/vps-setup.sh

set -e

echo "🚀 Setting up Cutta VPS..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
apt install -y curl wget git build-essential

# ============================================
# Node.js (via nvm)
# ============================================
echo "📦 Installing Node.js via nvm..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

# Install pnpm
echo "📦 Installing pnpm..."
npm install -g pnpm

# ============================================
# PostgreSQL
# ============================================
echo "🗄️ Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE USER cutta WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE cutta OWNER cutta;
GRANT ALL PRIVILEGES ON DATABASE cutta TO cutta;
EOF

echo "⚠️  Remember to change the PostgreSQL password!"

# ============================================
# Redis
# ============================================
echo "📦 Installing Redis..."
apt install -y redis-server

# Configure Redis
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
systemctl restart redis
systemctl enable redis

# ============================================
# Nginx
# ============================================
echo "🌐 Installing Nginx..."
apt install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/cutta << 'EOF'
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}

# LiveKit server (optional - can also connect directly on port 7880)
server {
    listen 80;
    server_name livekit.yourdomain.com;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/cutta /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
systemctl enable nginx

# ============================================
# Certbot (SSL)
# ============================================
echo "🔒 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

echo "
⚠️  After pointing your domains to this server, run:
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com -d livekit.yourdomain.com
"

# ============================================
# PM2
# ============================================
echo "📦 Installing PM2..."
npm install -g pm2
pm2 startup systemd

# ============================================
# Docker (for LiveKit)
# ============================================
echo "🐳 Installing Docker..."
apt install -y apt-transport-https ca-certificates gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
systemctl enable docker

# ============================================
# LiveKit Server (for streaming)
# ============================================
echo "📺 Setting up LiveKit server..."

# Generate LiveKit API keys
LIVEKIT_API_KEY=$(openssl rand -hex 16)
LIVEKIT_API_SECRET=$(openssl rand -hex 32)

# Create LiveKit config directory
mkdir -p /etc/livekit

# Create LiveKit config file
cat > /etc/livekit/livekit.yaml << EOF
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
  use_external_ip: true
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
logging:
  level: info
EOF

# Create Docker Compose file for LiveKit
cat > /etc/livekit/docker-compose.yml << 'EOF'
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: cutta-livekit
    restart: unless-stopped
    network_mode: host
    volumes:
      - /etc/livekit/livekit.yaml:/livekit.yaml
    command: --config /livekit.yaml
EOF

# Create systemd service for LiveKit
cat > /etc/systemd/system/livekit.service << 'EOF'
[Unit]
Description=LiveKit Server
Requires=docker.service
After=docker.service

[Service]
Type=simple
Restart=always
WorkingDirectory=/etc/livekit
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
EOF

# Enable and start LiveKit
systemctl daemon-reload
systemctl enable livekit
systemctl start livekit

# Save LiveKit credentials
cat > /var/www/cutta/livekit-credentials.txt << EOF
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
LIVEKIT_URL=wss://yourdomain.com:7880
EOF

echo "📺 LiveKit credentials saved to /var/www/cutta/livekit-credentials.txt"

# ============================================
# Firewall
# ============================================
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# LiveKit ports
ufw allow 7880/tcp   # LiveKit API/WebSocket
ufw allow 7881/tcp   # WebRTC TCP
ufw allow 50000:60000/udp  # WebRTC UDP
ufw --force enable

# ============================================
# Create app directory
# ============================================
echo "📁 Creating application directory..."
mkdir -p /var/www/cutta
mkdir -p /var/www/cutta/logs
chown -R $USER:$USER /var/www/cutta

echo "
✅ VPS Setup Complete!

📝 Next steps:
  1. Update PostgreSQL password in setup
  2. Clone your repository to /var/www/cutta
  3. Copy config/env.example to .env and configure
  4. Copy config/env.api.example to apps/api/.env
  5. Copy config/env.web.example to apps/web/.env.local
  6. Add LiveKit credentials from /var/www/cutta/livekit-credentials.txt to your .env files
  7. Run: pnpm install
  8. Run: pnpm build
  9. Run: pm2 start ecosystem.config.js
  10. Configure SSL: certbot --nginx -d yourdomain.com -d api.yourdomain.com -d livekit.yourdomain.com

📺 LiveKit credentials saved to:
  /var/www/cutta/livekit-credentials.txt
  
  Add these to your apps/api/.env:
    LIVEKIT_API_KEY=<from credentials file>
    LIVEKIT_API_SECRET=<from credentials file>
    LIVEKIT_URL=wss://livekit.yourdomain.com
  
  Add this to your apps/web/.env.local:
    NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.yourdomain.com

🔗 Useful commands:
  - pm2 status            # Check app status
  - pm2 logs              # View logs
  - pm2 restart all       # Restart all apps
  - systemctl status nginx
  - systemctl status postgresql
  - systemctl status redis
  - systemctl status livekit  # Check LiveKit status
  - docker logs cutta-livekit # View LiveKit logs
"

