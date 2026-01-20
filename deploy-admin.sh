#!/bin/bash
# Admin Panel Deployment Script for Production Server
# This script should be run on the production server (47.82.73.79)

set -e  # Exit on error

echo "========================================="
echo "LuckyMart Admin Panel Deployment"
echo "========================================="

# Configuration
PROJECT_DIR="/opt/luckymart-tj-admin"
DEPLOY_DIR="/var/www/tezbarakat.com/admin"
BACKUP_DIR="/opt/backups/admin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/admin-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
if [ -d "$DEPLOY_DIR" ]; then
    tar -czf "$BACKUP_FILE" -C "$DEPLOY_DIR" . 2>/dev/null || true
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}! No existing deployment to backup${NC}"
fi

echo -e "${YELLOW}Step 2: Pulling latest code from GitHub...${NC}"
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/main
echo -e "${GREEN}✓ Code updated${NC}"

echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 4: Creating .env.production file...${NC}"
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://zvouvjkrexowtujnqtna.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b3V2amtyZXhvd3R1am5xdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjEzOTgsImV4cCI6MjA4MzQ5NzM5OH0.-fb0nWhyAMdmzKBIzNqV0gXoANT7rPMmwYCwiszd7jM
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b3V2amtyZXhvd3R1am5xdG5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkyMTM5OCwiZXhwIjoyMDgzNDk3Mzk4fQ.9Dkzh2A1bmYF1NM_rxQInLhD_fPsBEFY-RwkEAJb_-I
EOF
echo -e "${GREEN}✓ Environment variables configured${NC}"

echo -e "${YELLOW}Step 5: Building production bundle...${NC}"
pnpm build
echo -e "${GREEN}✓ Build completed${NC}"

echo -e "${YELLOW}Step 6: Deploying to web directory...${NC}"
mkdir -p "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"/*
cp -r dist/* "$DEPLOY_DIR"/
echo -e "${GREEN}✓ Files deployed to $DEPLOY_DIR${NC}"

echo -e "${YELLOW}Step 7: Setting permissions...${NC}"
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
echo -e "${GREEN}✓ Permissions set${NC}"

echo -e "${YELLOW}Step 8: Reloading Nginx...${NC}"
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "Admin panel URL: ${GREEN}https://tezbarakat.com/admin/${NC}"
echo -e "Login credentials:"
echo -e "  Username: ${GREEN}admin${NC}"
echo -e "  Password: ${GREEN}admin123${NC}"
echo ""
echo -e "Backup location: ${YELLOW}$BACKUP_FILE${NC}"
echo ""
