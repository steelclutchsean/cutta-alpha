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
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
"

# ============================================
# PM2
# ============================================
echo "📦 Installing PM2..."
npm install -g pm2
pm2 startup systemd

# ============================================
# Firewall
# ============================================
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
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
  6. Run: pnpm install
  7. Run: pnpm build
  8. Run: pm2 start ecosystem.config.js
  9. Configure SSL: certbot --nginx -d yourdomain.com -d api.yourdomain.com

🔗 Useful commands:
  - pm2 status        # Check app status
  - pm2 logs          # View logs
  - pm2 restart all   # Restart all apps
  - systemctl status nginx
  - systemctl status postgresql
  - systemctl status redis
"

