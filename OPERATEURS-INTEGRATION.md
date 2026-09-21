# Paiement automatique Orange Money et Airtel Money — guide d'intégration

Le site sait payer par **Orange Money** (API *Web Payment*) et par **Airtel Money** (API *Collections*), en plus
de **MVola** (voir `MVOLA-INTEGRATION.md`). Tant que les identifiants d'un opérateur ne sont pas renseignés,
**rien ne change pour lui** : le paiement manuel par référence reste le seul mode proposé.

| | MVola | Airtel Money | Orange Money |
|---|---|---|---|
| Fonctionnement | demande sur le téléphone du client | demande sur le téléphone du client | le client est **redirigé** vers la page de paiement d'Orange, puis ramené sur le site |
| Numéro saisi sur le site | 034 / 038 | 033 | aucun (saisi chez Orange) |
| Confirmation | code secret sur le téléphone | code secret sur le téléphone | code secret sur la page d'Orange |
| Délai avant abandon | 15 min | 15 min | 30 min |
| Recoupement du montant | détail de la transaction (montant + compte crédité) | statut seul | le montant est envoyé à Orange à chaque vérification |

> ⚠️ **État au moment de la livraison.** Comme pour MVola, ces deux intégrations ont été testées contre des
> **faux serveurs** qui reproduisent le contrat des API (`npm run mock:operators`), pas contre les serveurs
> d'Orange ni d'Airtel (aucun identifiant). Le contrat a été reconstitué à partir de la documentation publique et
> de bibliothèques communautaires : **les bacs à sable sont l'étape de validation obligatoire** avant toute
> production (section 3). Les chapitres « à valider » sont marqués comme tels dans le code
> (`backend/src/lib/orangeMoney.ts`, `backend/src/lib/airtelMoney.ts`).

## 1. Obtenir l'accès (démarches commerciales, à lancer maintenant)

**Orange Money** — <https://developer.orange.com> : créer une application, souscrire à **Orange Money WebPay**
(Madagascar). Vous obtenez un *Client ID*, un *Client Secret* (ou une *Authorization header* à décoder) et une
**clé marchande** (`merchant_key`) ; la mise en production passe par un contrat marchand avec Orange Money
Madagascar. Demander : le code pays et la devise de production, les plafonds, les frais, et si les notifications
(`notif_url`) sont signées.

**Airtel Money** — <https://developers.airtel.africa> : créer un compte, une application et activer l'API
**Collections** pour **Madagascar** (une application est propre à un pays). Vous obtenez un *Client ID* et un
*Client Secret*. La mise en production demande un compte marchand Airtel Money et la validation d'Airtel. Demander :
le format exact du numéro (`msisdn`), la longueur maximale de l'identifiant de transaction, les plafonds et frais.

## 2. Configuration

Variables d'environnement du backend (`.env`, ou `.env.demo` sur le serveur — voir `docker-compose.demo.yml`) :

| Variable | Rôle |
|---|---|
| `ORANGE_MONEY_CLIENT_ID` / `ORANGE_MONEY_CLIENT_SECRET` | Identifiants de l'application Orange |
| `ORANGE_MONEY_MERCHANT_KEY` | Clé marchande fournie par Orange |
| `PUBLIC_SITE_URL` | Adresse publique du site (`https://…`) : retour du client après paiement. Repli : `FRONTEND_URL` |
| `ORANGE_MONEY_ENV` | `sandbox` (défaut) ou `production`. Toute autre valeur = bac à sable |
| `ORANGE_MONEY_COUNTRY` | *(facultatif)* segment de l'URL : `dev` en bac à sable (défaut), `mg` en production |
| `ORANGE_MONEY_CURRENCY` | *(facultatif)* `OUV` en bac à sable (défaut), `MGA` en production |
| `ORANGE_MONEY_NOTIF_URL` | *(facultatif)* notification d'Orange, par défaut `PUBLIC_SITE_URL/api/payments/auto/callback/orange_money` |
| `ORANGE_MONEY_API_BASE_URL` | *(tests)* remplace `https://api.orange.com`, par ex. le faux serveur local |
| `AIRTEL_MONEY_CLIENT_ID` / `AIRTEL_MONEY_CLIENT_SECRET` | Identifiants de l'application Airtel |
| `AIRTEL_MONEY_ENV` | `sandbox` (défaut, `openapiuat.airtel.africa`) ou `production` (`openapi.airtel.africa`) |
| `AIRTEL_MONEY_API_BASE_URL` | *(tests)* remplace l'adresse de l'API |

Chaque opérateur s'active **indépendamment** : au démarrage, le backend affiche pour chacun
`Paiement <opérateur> automatique : activé (BAC À SABLE|PRODUCTION, …)` ou `non configuré`. Les numéros marchands
`PAYMENT_ORANGE_MONEY_NUMBER` / `PAYMENT_AIRTEL_MONEY_NUMBER` restent nécessaires pour proposer le moyen de
paiement et pour le repli manuel.

Adresses techniques du site (à donner aux opérateurs si demandé) :

- notification Orange : `POST {PUBLIC_SITE_URL}/api/payments/auto/callback/orange_money`
- notification Airtel : `POST {PUBLIC_SITE_URL}/api/payments/auto/callback/airtel_money` (à déclarer dans le portail
  Airtel s'il l'exige ; le site interroge de toute façon Airtel lui-même)
- retour du client (Orange) : `{PUBLIC_SITE_URL}/checkout/confirmation?order=…&paiement=retour|annule`

Ces notifications sont **facultatives** : le site vérifie aussi toutes les 4 s tant que le client est sur la page, et
toutes les 30 s en tâche de fond. L'adresse doit être publique en HTTPS (le tunnel `trycloudflare.com` de la démo
change à chaque redémarrage : à éviter).

## 3. Valider dans les bacs à sable (avant la production)

1. Renseigner les identifiants du bac à sable, redémarrer le backend, passer une commande et choisir l'opérateur.
2. Vérifier chaque point ci-dessous et **corriger le fichier indiqué si l'opérateur s'écarte du contrat** :

**Orange Money** (`backend/src/lib/orangeMoney.ts`)

| Point à confirmer | Fonction |
|---|---|
| Jeton : `POST /oauth/v3/token`, en-tête Basic, `grant_type=client_credentials` | `authenticate()` |
| Création : `POST /orange-money-webpay/{dev\|mg}/v1/webpayment` et ses champs (`merchant_key`, `currency`, `order_id` ≤ 30 car., `amount`, `return_url`, `cancel_url`, `notif_url`, `lang`, `reference`) | `initiate()` |
| Réponse : `pay_token`, `payment_url`, `notif_token` | `initiate()` |
| Suivi : `POST …/v1/transactionstatus` avec `order_id`, `amount`, `pay_token` ; valeurs de `status` (`SUCCESS`, `FAILED`, `EXPIRED`, `PENDING`, `INITIATED`…) | `getStatus()`, `mapOrangeStatus()` |
| Code pays et devise de **production** (`mg` / `MGA` supposés) | `getOrangeConfig()` |
| Ce que fait Orange quand le client annule (statut `FAILED` ou session qui reste `PENDING` jusqu'à expiration ?) | — |
| Contenu et signature éventuelle de la notification (`notif_token`, `status`, `txnid`) | `callbackLookup()` dans `lib/operators.ts` |

**Airtel Money** (`backend/src/lib/airtelMoney.ts`)

| Point à confirmer | Fonction |
|---|---|
| Jeton : `POST /auth/oauth2/token` (JSON `client_id`, `client_secret`, `grant_type`) | `authenticate()` |
| En-têtes `X-Country: MG`, `X-Currency: MGA` | `call()` |
| Corps de la demande (`reference`, `subscriber.msisdn` **sans le 0** initial, `transaction.amount/id`) et longueur max de `transaction.id` (30 supposé) | `initiate()` |
| Suivi : `GET /standard/v1/payments/{id}` ; statuts `TS` (payé), `TF` (échec), `TE` (expiré), `TIP` (en cours), `TA` (ambigu → traité comme en cours) | `getStatus()`, `mapAirtelStatus()` |
| Réponses d'erreur logiques (HTTP 200 avec `status.success:false`) | `call()` |
| Numéros de test du bac à sable | — |

3. Refaire, pour chaque opérateur : un paiement **refusé**, un paiement **jamais confirmé** (ou abandonné sur la
   page d'Orange), et couper le réseau pendant une demande.
4. Passer en production avec **un vrai paiement de faible montant**, puis un remboursement manuel.

> Un statut inconnu est traité comme « en attente » : le site ne valide **jamais** un paiement sur une supposition.
> Le pire cas d'une erreur de configuration est qu'un paiement reste « en attente » et qu'un administrateur le
> confirme à la main dans `/admin/paiements`.

## 4. Comment le site protège l'argent

Les règles sont **identiques pour les trois opérateurs** (`backend/src/services/mobileMoneyPayments.ts`) :

- **Seul l'opérateur fait foi.** Le navigateur et les notifications ne servent qu'à *déclencher* une vérification :
  le site interroge lui-même l'opérateur avec ses identifiants. Une notification falsifiée ne valide rien
  (testé : faux `SUCCESS` sans paiement → aucune validation).
- **Le montant est recoupé** : total du panier comparé à la demande ; MVola fournit en plus le détail de la
  transaction ; pour Orange, le montant attendu accompagne chaque vérification. Au moindre écart : statut « à
  vérifier », jamais de validation automatique. **Limite connue :** Airtel ne renvoie pas le montant dans son
  statut ; le montant n'est donc vérifié que côté demande.
- **Un paiement n'est réglé qu'une fois** (réclamation conditionnelle en base), même si le client, la notification
  et la tâche de fond vérifient en même temps.
- **Abandon** : 15 min (Airtel), 30 min (Orange) ; surveillance pendant 24 h après, un paiement tardif est mis
  « à vérifier » (jamais validé tout seul).
- **Limites** : 10 demandes par IP et par 15 min, 5 par commande et par heure, 3 par numéro et par heure (Airtel).
- Pendant une demande en cours, la commande **ne peut pas expirer** et le client ne peut pas envoyer de référence
  manuelle (refus 409). Un échec ne **prolonge pas** la date limite de paiement.
- L'adresse de retour d'Orange **ne contient pas l'e-mail** du client (elle transite par Orange) : le navigateur le
  garde en session le temps de l'aller-retour. Les jetons de suivi (`pay_token`, `notif_token`) ne sont jamais
  envoyés au navigateur ; l'adresse de la page Orange n'est renvoyée que tant que la demande est en cours et le site
  ne redirige que vers des adresses `http(s)`.

## 5. Tester en local sans compte

```bash
cd backend
npm run mock:operators      # faux Orange Money (4011) et faux Airtel Money (4012)
```

Puis dans le `.env` du backend :

```
PUBLIC_SITE_URL=http://localhost:3000
ORANGE_MONEY_CLIENT_ID=test-client
ORANGE_MONEY_CLIENT_SECRET=test-secret
ORANGE_MONEY_MERCHANT_KEY=test-merchant
ORANGE_MONEY_API_BASE_URL=http://127.0.0.1:4011
ORANGE_MONEY_NOTIF_URL=http://127.0.0.1:3001/api/payments/auto/callback/orange_money
AIRTEL_MONEY_CLIENT_ID=test-client
AIRTEL_MONEY_CLIENT_SECRET=test-secret
AIRTEL_MONEY_API_BASE_URL=http://127.0.0.1:4012
```

- **Orange** : le client est redirigé vers une page de paiement simulée avec deux boutons (Payer / Annuler).
- **Airtel** : numéros de test du faux serveur :

| Numéro | Comportement |
|---|---|
| `033 35 000 03` (et tout autre 033) | le client confirme au bout de 4 s |
| `033 35 000 04` | le client refuse |
| `033 35 000 05` | le client ne confirme jamais |
| `033 35 000 07` | Airtel en panne (erreur 500) |
| `033 35 000 08` | Airtel refuse la demande (HTTP 200, `success:false`) |

## 5 bis. Mode démonstration (démo en ligne, sans identifiants)

`DEMO_PAYMENTS=true` (variable du backend, activée par défaut dans `.env.demo.example`) monte les faux serveurs
**dans le backend** sous `/api/demo-pay` et active MVola, Orange Money et Airtel Money contre eux : les visiteurs de
la démo essaient tout le parcours **sans aucun argent réel**. Un bandeau « Paiement de démonstration » s'affiche sur
chaque panneau de paiement.

- MVola / Airtel : tout numéro valide « confirme » au bout de 4 s (`DEMO_PAYMENTS_DELAY_MS`) ; `034 35 000 04` /
  `033 35 000 04` simulent un refus, `…05` une demande jamais confirmée.
- Orange : le client est redirigé vers une page « Orange Money (simulation) » (Payer / Annuler) servie sur l'adresse
  publique du site, puis ramené sur la confirmation. L'adresse de retour est déduite de la requête (en-têtes de
  nginx), donc elle suit le tunnel trycloudflare même quand il change ; **uniquement en mode démo**.
- Numéros marchands manquants : remplacés par des numéros de démonstration.
- **Garde-fous :** seule la valeur exacte `true` active le mode ; il **se désactive de lui-même** (avec une erreur au
  démarrage) si de vrais identifiants d'opérateur sont renseignés ; il est désactivé par défaut hors `.env.demo.example`.
- Pour passer aux vrais paiements : mettre `DEMO_PAYMENTS=false` et renseigner les identifiants (sections 2 et 3).

## 6. Exploitation

- Les demandes sont dans la table `payment_attempts` (colonne `provider` : `mvola`, `orange_money`, `airtel_money` ;
  statuts `pending`, `completed`, `failed`, `review`).
- **`review`** = argent probablement reçu mais écart à vérifier : `/admin/paiements`, comparer avec le relevé du
  compte marchand, puis **Confirmer** ou **Refuser**.
- Le paiement manuel par référence reste toujours disponible en secours.
- Un client qui **annule** sur la page d'Orange peut la rouvrir (« Reprendre le paiement ») ; tant qu'Orange n'a pas
  déclaré la session échouée ou expirée, il ne peut pas envoyer de référence manuelle (au plus 30 min).
- Ajouter un opérateur : écrire son client d'API et un adaptateur dans `backend/src/lib/operators.ts` ; le service,
  les routes, la tâche de fond, l'administration et le frontend n'ont pas à changer.
