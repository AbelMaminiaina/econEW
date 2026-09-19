#!/bin/bash

# ===========================================
# VPS Initial Setup Script - Ferme du Vardier
# Contabo VPS - Ubuntu 24.04
# IP: 167.86.111.192
# ===========================================

set -e

echo "=========================================="
echo "  Contabo VPS Setup - Ferme du Vardier"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${GREEN}[1/7] Updating system...${NC}"
apt update && apt upgrade -y

# Install essential packages
echo -e "${GREEN}[2/7] Installing essential packages...${NC}"
apt install -y curl git ufw fail2ban htop nano

# Install Docker
echo -e "${GREEN}[3/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

# Install Docker Compose plugin
echo -e "${GREEN}[4/7] Installing Docker Compose...${NC}"
apt install -y docker-compose-plugin

# Configure Firewall
echo -e "${GREEN}[5/7] Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Configure fail2ban
echo -e "${GREEN}[6/7] Configuring fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# Create app directory
echo -e "${GREEN}[7/7] Creating application directory...${NC}"
mkdir -p /opt/fermeduvardier
cd /opt/fermeduvardier

echo ""
echo -e "${GREEN}=========================================="
echo "  VPS Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   cd /opt/fermeduvardier"
echo "   git clone https://github.com/YOUR_USER/FermeDuVardier.git ."
echo ""
echo "2. Configure environment:"
echo "   cp .env.production.example .env.production"
echo "   nano .env.production"
echo ""
echo "3. Deploy:"
echo "   chmod +x deploy.sh"
echo "   ./deploy.sh deploy"
echo ""
echo "Server IP: 167.86.111.192"
echo ""
