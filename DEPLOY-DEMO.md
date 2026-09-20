# Démo « All » sur le VPS Contabo (Docker, HTTP, sans domaine)

Ce guide déploie **All** à côté d'un autre site déjà présent sur le serveur (ex. Ferme du Vardier)
sans le perturber : projet Docker dédié `all-demo`, aucun usage des ports 80/443, Postgres et Redis
non exposés. Les fichiers `docker-compose.prod.yml`, `deploy.sh`, `DEPLOY.md`… sont ceux de l'ancien
projet : **ne pas les utiliser pour All**.

| Élément | Valeur |
|---|---|
| Compose | `docker-compose.demo.yml` (projet `all-demo`) |
| Variables | `.env.demo` (modèle : `.env.demo.example`, jamais commité) |
| Nginx interne | `nginx/all-demo.conf` |
| Accès | `http://IP_DU_VPS:8081` (port modifiable : `DEMO_PORT`) |

## 1. Préparer le serveur (une seule fois)

```bash
ssh root@IP_DU_VPS
docker --version && docker compose version     # déjà installés si un site Docker tourne déjà
ss -tlnp | grep 8081                            # doit être vide (sinon choisir un autre DEMO_PORT)
ufw allow 8081/tcp                              # si le pare-feu ufw est actif
```

## 2. Récupérer le code

```bash
cd /opt
git clone https://github.com/AbelMaminiaina/econEW.git all
cd all
git checkout feat/electro-marketplace-mobile-money    # ou main une fois la PR fusionnée
```

## 3. Configurer

```bash
cp .env.demo.example .env.demo      # UNE seule fois : le relancer écraserait vos secrets
nano .env.demo
```

À renseigner : `PUBLIC_URL` (`http://IP_DU_VPS:8081`), les mots de passe Postgres/Redis, les secrets
`JWT_SECRET` et `NEXTAUTH_SECRET` (`openssl rand -base64 32`), le mot de passe admin, et les **vrais
numéros Mobile Money** (un moyen de paiement sans numéro n'est pas proposé au client).

> `PUBLIC_URL` est utilisé à la construction de l'image du frontend : après l'avoir modifié, refaire
> un `up -d --build`.

## 4. Lancer

```bash
docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
docker compose -f docker-compose.demo.yml --env-file .env.demo ps
```

Le backend applique les migrations Prisma au démarrage.

## 5. Charger les données de démonstration (une seule fois)

```bash
docker compose -f docker-compose.demo.yml --env-file .env.demo exec backend npx tsx prisma/seed.ts
```

> ⚠️ Le seed **efface** catégories, produits, commandes, entreprises et utilisateurs avant de
> recréer le catalogue de démo. Ne jamais le relancer une fois la démo utilisée.

Comptes créés : administrateur (`PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`, connexion sur
`/admin/login`) et un acheteur de démonstration `buyer@grossiste-demo.example` / `demo1234`.

## 6. Vérifier

- `http://IP_DU_VPS:8081` : le site s'affiche avec le catalogue
- `http://IP_DU_VPS:8081/api/payments/methods` : liste les opérateurs configurés
- Passer une commande sans compte, saisir une référence, puis la confirmer dans `/admin/paiements`

## Exploitation

```bash
C="docker compose -f docker-compose.demo.yml --env-file .env.demo"
$C logs -f backend            # logs (idem : frontend, nginx)
$C restart backend            # redémarrer un service
$C down                       # arrêter (les données restent dans les volumes)

# Mettre à jour
git pull && $C up -d --build

# Sauvegarde de la base
$C exec -T postgres pg_dump -U all all > backup_all_$(date +%Y%m%d).sql
```

`$C down -v` supprime aussi les volumes (base de données comprise) : à n'utiliser que pour repartir de zéro.

## Limites de cette démo

- **HTTP sans chiffrement** : identifiants et mots de passe circulent en clair. Suffisant pour une
  démo, à remplacer par un domaine + HTTPS avant tout usage réel.
- **Pas de carte bancaire** : uniquement Mobile Money, vérifié à la main dans `/admin/paiements`.
- **Commandes non payées** : elles réservent le stock jusqu'à annulation (pas d'expiration automatique).
