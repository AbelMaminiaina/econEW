# Guide de Deploiement - Ferme du Vardier

Deploiement sur VPS Contabo avec Docker.

> Un problème après un déploiement (backend qui redémarre en boucle, erreur `P1000`,
> conflit git sur `deploy.sh`/`docker-compose.prod.yml`...) ? Regarde d'abord
> [TROUBLESHOOTING.md](./TROUBLESHOOTING.md), ces cas y sont déjà documentés.

## Commandes rapides (Contabo)

### Connexion SSH
```bash
ssh root@167.86.111.192
```

### Deploiement rapide (git pull + seed)
```bash
cd /opt/FermeDuVardier && git pull && cd backend && docker compose exec backend npx prisma db seed
```

### Deploiement frontend (rebuild)
```bash
cd /opt/FermeDuVardier && git pull && docker compose -f docker-compose.prod.yml up -d --build frontend
```

### Deploiement complet (tout reconstruire)
```bash
cd /opt/FermeDuVardier && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

### Commandes individuelles
```bash
cd /opt/FermeDuVardier        # Aller dans le projet
git pull                       # Recuperer les modifications
cd backend                     # Aller dans backend
docker compose exec backend npx prisma db seed   # Executer le seed
```

### Voir les services disponibles
```bash
docker compose -f docker-compose.prod.yml config --services
```

---

## Prerequisites sur le VPS

### 1. Installer Docker et Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Installer Git

```bash
sudo apt install git -y
```

### 3. Confi  le Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Deploiement

### 1. Cloner le repository

```bash
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/FermeDuVardier.git
cd FermeDuVardier
sudo chown -R $USER:$USER .
```

### 2. Configurer les variables d'environnement

```bash
# Copier le template
cp .env.production.example .env.production

# Editer avec vos valeurs
nano .env.production
```

**Variables importantes a configurer:**

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL (fort) |
| `REDIS_PASSWORD` | Mot de passe Redis |
| `DOMAIN` | Votre nom de domaine |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Mot de passe admin |

> **Attention :** la commande `cp .env.production.example .env.production` ne doit être lancée
> qu'**une seule fois**, à la toute première installation. La relancer plus tard écrase les
> vrais secrets de production avec les valeurs vides du template. Voir
> [Travailler à plusieurs sans écraser le `.env`](#travailler-à-plusieurs-sans-écraser-le-env)
> ci-dessous.

### 3. Lancer le deploiement

```bash
# Rendre le script executable
chmod +x deploy.sh

# Deployer (premiere fois)
./deploy.sh deploy
```

### 4. Configurer SSL (Let's Encrypt)


```bash
# Assurez-vous que votre domaine pointe vers le VPS
./deploy.sh ssl
```

## Commandes Utiles

```bash
# Voir les logs
./deploy.sh logs

# Logs backend seulement
./deploy.sh logs-backend

# Status des containers
./deploy.sh status

# Redemarrer les services
./deploy.sh restart

# Arreter les services
./deploy.sh stop

# Mise a jour (pull + rebuild)
./deploy.sh update

# Backup de la base de donnees
mkdir -p backups
./deploy.sh backup

# Seeder la base de donnees
./deploy.sh seed

# Acceder au shell PostgreSQL
./deploy.sh shell-db
```

## Travailler à plusieurs sans écraser le `.env`

`.env.production` ne vit **que sur le VPS** : il est dans `.gitignore` (comme `.env`,
`.env.local`, etc.), donc `git pull` / `git push` ne le touchent jamais et personne ne peut
le committer par accident. Le risque réel vient d'ailleurs, quand plusieurs personnes
déploient sur le même serveur :

1. **Ne jamais réutiliser `cp .env.production.example .env.production`** une fois le serveur
   configuré — ça remplace les vrais secrets par les valeurs vides du template. Cette commande
   ne sert qu'à l'installation initiale (étape 2 ci-dessus).
2. **Une nouvelle variable d'environnement à ajouter ?** Mettez-la à jour dans
   `.env.production.example` (versionné dans git, visible par toute l'équipe), puis sur le VPS
   lancez :
   ```bash
   ./deploy.sh env-diff
   ```
   Ça liste uniquement les clés présentes dans le template mais absentes du `.env.production`
   réel — ajoutez-les à la main avec `nano .env.production`, le reste du fichier n'est pas touché.
3. **Backup automatique avant chaque déploiement.** `./deploy.sh deploy` et
   `./deploy.sh update` sauvegardent désormais `.env.production` avec un horodatage dans
   `backups/env/` avant toute action (les 20 dernières copies sont conservées). En cas de
   mauvaise manip :
   ```bash
   ./deploy.sh env-restore   # restaure la dernière sauvegarde connue
   ```
4. **Une seule personne édite `.env.production` à la fois.** Le fichier n'est pas versionné,
   donc deux modifications concurrentes sur le VPS s'écrasent silencieusement (le dernier
   `nano`/`scp` gagne). Pour une petite équipe, le plus simple reste de traiter le fichier du
   VPS comme la seule source de vérité (pas de copie locale qu'on repousserait par erreur), et
   de noter les secrets réels dans un gestionnaire de mots de passe partagé (1Password,
   Bitwarden...) plutôt que dans des `.env` locaux qui finissent par diverger.
5. **Ne copiez jamais un `.env.production` local vers le serveur** (`scp` écrase tout, y
   compris des secrets de prod par des valeurs de test). Si un changement de config est
   nécessaire, éditez directement sur le VPS via `nano .env.production` puis `./deploy.sh update`.

## Architecture Docker

```
                    [Internet]
                         |
                    [Nginx:80/443]
                    /          \
           [Frontend:3000]  [Backend:3001]
                                 |
                    [PostgreSQL:5432] + [Redis:6379]
```

## Structure des fichiers

```
FermeDuVardier/
├── docker-compose.prod.yml   # Orchestration production
├── .env.production           # Variables d'environnement
├── deploy.sh                 # Script de deploiement
├── nginx/
│   ├── nginx.conf           # Config Nginx avec SSL
│   └── nginx.conf.http-only # Config sans SSL (initial)
├── certbot/                  # Certificats SSL
├── backend/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

## Mise a jour de l'application

```bash
# Sur le VPS
cd /opt/FermeDuVardier
git pull origin main
./deploy.sh update
```

## Monitoring

### Verifier l'etat des services

```bash
docker compose -f docker-compose.prod.yml ps
```

### Verifier les ressources

```bash
docker stats
```

### Verifier les logs d'erreur

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
```

## Backup et Restore

### Backup manuel

```bash
# Backup base de donnees
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U fermeduvardier fermeduvardier > backup_$(date +%Y%m%d).sql

# Backup volumes Docker
docker run --rm -v fermeduvardier-postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz /data
```

### Restore

```bash
# Restore base de donnees
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U fermeduvardier fermeduvardier
```

## Troubleshooting

### Les containers ne demarrent pas

```bash
# Verifier les logs
docker compose -f docker-compose.prod.yml logs

# Reconstruire les images
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Probleme de connexion a la base de donnees

```bash
# Verifier que PostgreSQL est healthy
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Verifier les credentials
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U fermeduvardier -d fermeduvardier -c "SELECT 1"
```

### Probleme de certificat SSL

```bash
# Renouveler le certificat
docker compose -f docker-compose.prod.yml run --rm certbot renew

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Nettoyer l'espace disque

```bash
# Supprimer les images inutilisees
docker system prune -a

# Supprimer les volumes orphelins
docker volume prune
```

## Securite

1. **Changez tous les mots de passe par defaut**
2. **Activez le firewall** (ufw)
3. **Configurez fail2ban** pour SSH
4. **Mettez a jour regulierement** le systeme et les images Docker
5. **Sauvegardez regulierement** la base de donnees

```bash
# Installer fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## Support

Pour tout probleme, verifiez:
1. Les logs Docker: `./deploy.sh logs`
2. L'etat des containers: `./deploy.sh status`
3. L'espace disque: `df -h`
4. La memoire: `free -m`
