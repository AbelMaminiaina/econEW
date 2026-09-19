# Dépannage - Incidents connus

## Backend en boucle de redémarrage après un déploiement (`P1000: Authentication failed`)

**Symptôme** : après `./deploy.sh update` (ou tout `docker compose up` du service `backend`), le conteneur `fermeduvardier-backend` redémarre en boucle avec dans les logs :

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "fermeduvardier", schema "public" at "postgres:5432"
Error: P1000: Authentication failed against database server at `postgres`, the provided database credentials for `fermeduvardier` are not valid.
```

Ça peut arriver même si `.env.production` contient le bon mot de passe et que `psql` avec ce même mot de passe fonctionne. Ce qui rend ce bug piégeux : plusieurs causes différentes produisent exactement la même erreur, et chacune "semble" corrigée en cours de route sans que le backend démarre pour autant.

### Causes trouvées, dans l'ordre où on les a éliminées

1. **`docker-compose.prod.yml` / `nginx.conf` / `deploy.sh` divergés du serveur** (modifiés directement sur le VPS sans jamais être recommités) → `git pull` refuse de fusionner. *Diagnostic* : `git diff <fichiers>`. *Fix* : `git stash` → `git pull` → `git stash pop`, en gardant les réglages spécifiques au serveur (ex: chemin `/etc/letsencrypt` du certbot système).

2. **Un fichier `.env` (sans suffixe) traînait à la racine**, avec d'anciennes valeurs. Docker Compose le charge **par défaut**, et ça écrase silencieusement `.env.production` sur toute commande où le flag `--env-file .env.production` est oublié. *Diagnostic* : `ls -la .env*` puis comparer `grep POSTGRES_PASSWORD .env` vs `.env.production`. *Fix définitif* : symlink pour ne plus jamais avoir à s'en souvenir :
   ```bash
   ln -sf .env.production .env
   ```

3. **Une ligne `DATABASE_URL=` fantôme dans `.env.production`**, avec un mot de passe différent de `POSTGRES_PASSWORD`. En réalité `docker-compose.prod.yml` construit `DATABASE_URL` lui-même à partir de `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` — cette ligne séparée n'était jamais lue par le backend, juste une source de confusion. *Fix* : supprimée, avec un commentaire dans `.env.production.example` pour ne pas la réintroduire.

4. **La vraie cause : le hash du mot de passe Postgres était incompatible avec le moteur de requêtes de Prisma.** `psql` (libpq) acceptait le mot de passe sans problème (local et réseau), mais Prisma le rejetait systématiquement avec `P1000`, avec ou sans caractères spéciaux, avec ou sans encodage d'URL. La cause : un mot de passe défini/hashé il y a des mois, potentiellement avec une méthode d'auth différente de celle attendue par le moteur Rust de Prisma. *Diagnostic qui a tranché* : tester avec `prisma migrate deploy` directement (pas juste `psql`) via un conteneur jetable :
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint sh backend -c "npx prisma migrate deploy"
   ```
   *Fix* : forcer un nouveau hash avec un mot de passe simple (sans caractères spéciaux) :
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U fermeduvardier -d fermeduvardier -c "ALTER USER fermeduvardier WITH PASSWORD 'nouveau_mdp_simple';"
   sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=nouveau_mdp_simple/' .env.production
   ```
   Puis recréer le backend :
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate backend
   ```

### Checklist de diagnostic rapide (si ça revient)

1. `docker compose -f docker-compose.prod.yml ps` — Postgres est-il `healthy` ?
2. `ls -la .env*` — un `.env` fantôme traîne-t-il à côté de `.env.production` ? (normalement non, symlinké depuis la correction ci-dessus)
3. `docker compose -f docker-compose.prod.yml --env-file .env.production config | grep -A1 DATABASE_URL` — la valeur résolue est-elle celle attendue ?
4. Tester la connexion **avec Prisma directement**, pas seulement `psql` :
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint sh backend -c "npx prisma migrate deploy"
   ```
5. Si `psql` passe mais Prisma échoue → re-hasher le mot de passe via `ALTER USER ... WITH PASSWORD` (sans risque, ne touche pas aux données).

### Pièges bash annexes rencontrés en cours de route

- Un `!` dans un mot de passe déclenche l'expansion d'historique bash (`event not found`) même entre guillemets doubles. `set +H` désactive ça pour la session, ou éviter `!` dans les mots de passe.
- `sed`/`grep` sur un fichier avec fins de ligne Windows (CRLF) peut laisser un `\r` invisible en fin de valeur — vérifier avec `cat -A fichier`.

## Migrations Prisma : le build Docker ne synchronise pas le schéma tout seul

Le `Dockerfile` backend build avec `npm run build:docker` (= `prisma generate && tsc`, **sans** `db push`). Avant 2026-08, il n'y avait aucun dossier `prisma/migrations/` versionné, donc le `prisma migrate deploy` lancé au démarrage du conteneur (`CMD`) ne faisait jamais rien ("No migration found") — un changement de schéma (ex: ajout d'un champ) ne se propageait donc jamais tout seul en prod, il fallait lancer `prisma db push --accept-data-loss` à la main après chaque déploiement.

**Résolu le 2026-08-23** : une migration baseline (`prisma/migrations/20260101000000_baseline/`) a été créée et marquée comme déjà appliquée en base (`prisma migrate resolve --applied ...`), aussi bien en local qu'en prod. Désormais :

- Pour tout futur changement de schéma : `npx prisma migrate dev --name description_du_changement` en local, committer le dossier `prisma/migrations/` généré.
- Au prochain déploiement, le `CMD` du Dockerfile (`prisma migrate deploy && node dist/index.js`) applique automatiquement la migration — plus besoin de `db push --accept-data-loss` manuel.
