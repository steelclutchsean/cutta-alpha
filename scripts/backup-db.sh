#!/bin/bash

# ============================================
# Database Backup Script
# ============================================
# Run via cron: 0 3 * * * /var/www/cutta/scripts/backup-db.sh

set -e

BACKUP_DIR="/var/backups/cutta"
DB_NAME="cutta"
DB_USER="cutta"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "📦 Creating database backup..."
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/cutta_$DATE.sql.gz"

# Remove old backups
echo "🗑️ Removing backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "cutta_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo "📋 Current backups:"
ls -lh $BACKUP_DIR/cutta_*.sql.gz

echo "✅ Backup complete: cutta_$DATE.sql.gz"


