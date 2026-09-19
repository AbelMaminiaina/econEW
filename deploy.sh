#!/bin/bash

# ===========================================
# Deployment Script - Ferme du Vardier
# Contabo VPS: 167.86.111.192
# ===========================================

set -e

echo "=========================================="
echo "  Ferme du Vardier - Deployment"
echo "  VPS: 167.86.111.192"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production not found!${NC}"
    echo "Run: cp .env.production.example .env.production"
    echo "Then edit it with your passwords."
    exit 1
fi

# Keep a timestamped copy of .env.production before any action that could
# touch it, so a mistake (accidental `cp .env.production.example
# .env.production`, a bad edit from a teammate, etc.) is never unrecoverable.
backup_env() {
    mkdir -p backups/env
    cp .env.production "backups/env/env.production.$(date +%Y%m%d_%H%M%S).bak"
    # Keep only the last 20 backups
    ls -1t backups/env/env.production.*.bak 2>/dev/null | tail -n +21 | xargs -r rm --
}

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

ACTION=${1:-deploy}

case $ACTION in
    deploy)
        echo -e "${GREEN}Starting deployment...${NC}"
        backup_env

        # Use HTTP config
        cp nginx/nginx.conf.http-only nginx/nginx.conf 2>/dev/null || true

        # Build and start
        echo "Building containers..."
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

        echo "Waiting for database..."
        sleep 15

        # Run migrations
        echo "Running migrations..."
        docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || true

        echo ""
        echo -e "${GREEN}=========================================="
        echo "  Deployment Complete!"
        echo "==========================================${NC}"
        echo ""
        echo "Application: http://167.86.111.192:8080"
        echo ""
        echo "Commands:"
        echo "  ./deploy.sh logs    - View logs"
        echo "  ./deploy.sh status  - Container status"
        echo "  ./deploy.sh seed    - Seed database"
        ;;

    update)
        echo -e "${GREEN}Updating...${NC}"
        backup_env
        git pull origin main
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
        docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || true
        echo -e "${GREEN}Update complete!${NC}"
        ;;

    logs)
        docker compose -f docker-compose.prod.yml logs -f
        ;;

    logs-backend)
        docker compose -f docker-compose.prod.yml logs -f backend
        ;;

    logs-frontend)
        docker compose -f docker-compose.prod.yml logs -f frontend
        ;;

    logs-nginx)
        docker compose -f docker-compose.prod.yml logs -f nginx
        ;;

    status)
        docker compose -f docker-compose.prod.yml ps
        ;;

    stop)
        echo "Stopping..."
        docker compose -f docker-compose.prod.yml down
        echo -e "${GREEN}Stopped.${NC}"
        ;;

    restart)
        echo "Restarting..."
        docker compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}Restarted.${NC}"
        ;;

    rebuild)
        echo "Rebuilding..."
        docker compose -f docker-compose.prod.yml up -d --build --force-recreate
        echo -e "${GREEN}Rebuilt.${NC}"
        ;;

    seed)
        echo "Seeding database..."
        docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
        echo -e "${GREEN}Database seeded.${NC}"
        ;;

    migrate)
        echo "Running migrations..."
        docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
        echo -e "${GREEN}Migrations done.${NC}"
        ;;

    backup)
        mkdir -p backups
        BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
        echo "Creating backup..."
        docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-fermeduvardier} ${POSTGRES_DB:-fermeduvardier} > ${BACKUP_FILE}
        echo -e "${GREEN}Backup: ${BACKUP_FILE}${NC}"
        ;;

    env-diff)
        # Never `cp .env.production.example .env.production` on a server that's
        # already configured, it wipes every real secret. Use this instead to
        # see which variables a teammate added to the template but that are
        # still missing on this server, then add just those by hand.
        echo "Variables present in .env.production.example but missing from .env.production:"
        MISSING=0
        while IFS='=' read -r KEY _; do
            [[ -z "$KEY" || "$KEY" == \#* ]] && continue
            if ! grep -q "^${KEY}=" .env.production; then
                echo "  - ${KEY}"
                MISSING=1
            fi
        done < .env.production.example
        if [ "$MISSING" -eq 0 ]; then
            echo -e "${GREEN}Nothing missing - .env.production is up to date.${NC}"
        fi
        ;;

    env-restore)
        LATEST=$(ls -1t backups/env/env.production.*.bak 2>/dev/null | head -n 1)
        if [ -z "$LATEST" ]; then
            echo -e "${RED}No .env.production backup found.${NC}"
            exit 1
        fi
        echo "Latest backup: ${LATEST}"
        read -p "Restore this into .env.production? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$LATEST" .env.production
            echo -e "${GREEN}Restored.${NC}"
        fi
        ;;

    shell-backend)
        docker compose -f docker-compose.prod.yml exec backend sh
        ;;

    shell-db)
        docker compose -f docker-compose.prod.yml exec postgres psql -U ${POSTGRES_USER:-fermeduvardier} ${POSTGRES_DB:-fermeduvardier}
        ;;

    clean)
        echo -e "${YELLOW}This will delete all data!${NC}"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose -f docker-compose.prod.yml down -v --rmi all
            echo -e "${GREEN}Cleaned.${NC}"
        fi
        ;;

    *)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  deploy       - Deploy application"
        echo "  update       - Pull & redeploy"
        echo "  logs         - Show all logs"
        echo "  logs-backend - Backend logs"
        echo "  logs-frontend- Frontend logs"
        echo "  status       - Container status"
        echo "  stop         - Stop services"
        echo "  restart      - Restart services"
        echo "  rebuild      - Force rebuild"
        echo "  seed         - Seed database"
        echo "  migrate      - Run migrations"
        echo "  backup       - Backup database"
        echo "  env-diff     - Show env vars missing from .env.production"
        echo "  env-restore  - Restore .env.production from latest backup"
        echo "  shell-backend- Backend shell"
        echo "  shell-db     - PostgreSQL shell"
        echo "  clean        - Remove everything"
        ;;
esac
