# Paiement automatique MVola — guide d'intégration

Le site sait déjà payer par **MVola Merchant Pay** : le client saisit son numéro MVola, reçoit une demande de
paiement sur son téléphone, la confirme avec son code secret, et la commande passe en « payée » toute seule.
Tant que les identifiants MVola ne sont pas renseignés, **rien ne change** : le paiement manuel par référence
reste le seul mode proposé.

> ⚠️ **État au moment de la livraison.** L'intégration a été testée contre un **faux serveur MVola** qui reproduit
> le contrat de l'API (jeton, demande, statut, détails). Elle n'a **pas** été essayée face aux serveurs de MVola
> (pas d'identifiants). Le bac à sable de MVola est l'étape de validation obligatoire avant toute mise en production
> (section 3).

## 1. Obtenir l'accès chez MVola (démarche commerciale, à lancer maintenant)

1. Compte développeur sur le portail MVola : <https://www.mvola.mg/devportal>
2. Créer une application et souscrire à l'API **« Merchant Pay »** ; vous obtenez une **Consumer Key** et un
   **Consumer Secret** pour le bac à sable.
3. Disposer d'un **compte marchand MVola** (le numéro qui reçoit l'argent) : à ouvrir auprès de Telma / MVola
   (dossier d'entreprise). Renseignez aussi le **nom de partenaire** enregistré chez eux.
4. Pour la production : demander la **mise en production** de l'application (clés de production distinctes).
5. Demander à MVola : plafonds de réception, frais par transaction, délai d'expiration d'une demande, et si les
   messages de rappel (callback) sont signés.

## 2. Configuration

Variables d'environnement du backend (fichier `.env`, ou `.env.demo` sur le serveur — voir `docker-compose.demo.yml`) :

| Variable | Rôle |
|---|---|
| `MVOLA_CONSUMER_KEY` / `MVOLA_CONSUMER_SECRET` | Identifiants de l'application MVola |
| `MVOLA_MERCHANT_NUMBER` | Numéro MVola marchand qui reçoit l'argent (`034 …`) |
| `MVOLA_PARTNER_NAME` | Nom de partenaire enregistré chez MVola (défaut : `PLATFORM_NAME`) |
| `MVOLA_ENV` | `sandbox` (défaut) ou `production`. Toute autre valeur = bac à sable |
| `MVOLA_LANGUAGE` | `FR` (défaut) ou `MG` : langue des messages envoyés au client |
| `MVOLA_CALLBACK_URL` | *(facultatif)* URL publique HTTPS `https://VOTRE-SITE/api/payments/auto/callback/mvola` |
| `MVOLA_API_BASE_URL` | *(tests)* remplace l'adresse de l'API, par ex. le faux serveur local |

Les trois premières suffisent : sans elles, le paiement automatique est **désactivé** (aucun message d'erreur au
client, le paiement manuel prend le relais). Au démarrage, le backend affiche
`Paiement MVola automatique : activé (BAC À SABLE|PRODUCTION, …)`.

Le rappel (callback) est **facultatif** : le site interroge aussi MVola toutes les 4 s tant que le client est sur
la page, et toutes les 30 s en tâche de fond (même s'il a fermé la page). Si vous l'activez, l'adresse doit être
publique en HTTPS (le tunnel `trycloudflare.com` de la démo change à chaque redémarrage : ne pas l'utiliser pour cela).

## 3. Valider dans le bac à sable de MVola (à faire avant la production)

1. Renseigner les identifiants du bac à sable, `MVOLA_ENV=sandbox`, et redémarrer le backend.
2. Passer une commande, choisir MVola, saisir un numéro de test fourni par MVola
   (les bibliothèques communautaires citent `034 35 000 03` et `034 35 000 04`).
3. Vérifier les points suivants et **corriger `backend/src/lib/mvola.ts` si MVola s'écarte du contrat** :

| Point à confirmer | Où c'est dans le code |
|---|---|
| Le jeton s'obtient bien avec `grant_type=client_credentials` et le scope `EXT_INT_MVOLA_SCOPE` | `authenticate()` |
| Les en-têtes exigés (`Version`, `X-CorrelationID`, `UserLanguage`, `UserAccountIdentifier`, `partnerName`, `X-Callback-URL`) | `call()` |
| Le corps de la demande (notamment `metadata` : `partnerName`, `fc`, `amountFc`) et la longueur max de `descriptionText` | `initiate()` |
| L'adresse de suivi : `…/1.0.0/status/{serverCorrelationId}` | `getStatus()` |
| Les valeurs de statut réellement renvoyées (`pending` / `completed` / `failed`, ou d'autres) | `mapMvolaStatus()` |
| Le détail d'une transaction (montant, numéros) à l'adresse `…/1.0.0/{objectReference}` | `getTransaction()` |
| Le format du numéro attendu (`0343500003` ou `+261343500003`) | `initiate()` |

4. Refaire un paiement **refusé**, un paiement **jamais confirmé**, et couper le réseau pendant une demande.
5. Passer en production avec **un vrai paiement de faible montant**, puis un remboursement manuel.

> Un statut inconnu de MVola est traité comme « en attente » : le site ne valide **jamais** un paiement sur une
> supposition. Le pire cas d'une erreur de configuration est donc qu'un paiement reste « en attente » et qu'un
> administrateur le confirme à la main dans `/admin/paiements`.

## 4. Comment le site protège l'argent

- **Seul MVola fait foi.** Le navigateur du client et le message de rappel ne servent qu'à *déclencher* une
  vérification : le site interroge lui-même MVola avec ses identifiants. Un rappel falsifié ne valide rien.
- **Le montant et le compte crédité sont recoupés** avec le détail de la transaction. Au moindre écart, le
  paiement n'est **pas** validé automatiquement : il passe en « à vérifier » (alerte orange dans `/admin/paiements`)
  et un administrateur contrôle son compte MVola avant de confirmer ou de refuser.
- **Un paiement n'est réglé qu'une fois**, même si le client, le rappel et la tâche de fond le vérifient en même
  temps (réclamation conditionnelle en base).
- **Une demande abandonnée** (client qui ne confirme pas) est annulée au bout de 15 minutes ; la surveillance
  continue 24 h : si MVola signale ensuite un paiement, il est mis « à vérifier » (jamais validé tout seul).
- **Pas de harcèlement d'un téléphone** : 10 demandes par adresse IP et par 15 min, 5 par commande et 3 par numéro
  de téléphone et par heure.
- Pendant une demande en cours, la commande **ne peut pas expirer** et le client ne peut pas envoyer de référence
  manuelle (elle écraserait la vérification). Un échec ne **prolonge pas** la date limite de paiement.
- Les identifiants MVola ne sont **jamais** envoyés au navigateur ni écrits dans les journaux.

## 5. Tester en local sans compte MVola

```bash
cd backend
npm run mock:mvola          # faux MVola sur http://127.0.0.1:4010
```

Puis dans le `.env` du backend :

```
MVOLA_CONSUMER_KEY=test-key
MVOLA_CONSUMER_SECRET=test-secret
MVOLA_MERCHANT_NUMBER=034 00 000 00
MVOLA_API_BASE_URL=http://127.0.0.1:4010
```

Numéros de test du faux serveur :

| Numéro | Comportement |
|---|---|
| `034 35 000 03` (et tout autre 034) | le client confirme au bout de 4 s |
| `034 35 000 04` | le client refuse |
| `034 35 000 05` | le client ne confirme jamais |
| `034 35 000 06` | payé, mais avec un montant différent (alerte « à vérifier ») |
| `034 35 000 07` | MVola en panne (erreur 500) |

## 6. Exploitation

- Les demandes sont dans la table `payment_attempts` (statuts `pending`, `completed`, `failed`, `review`).
- **`review`** = argent probablement reçu mais écart à vérifier : ouvrir `/admin/paiements`, comparer avec le
  relevé du compte marchand MVola, puis **Confirmer** ou **Refuser**.
- Le paiement manuel par référence reste toujours disponible en secours (panne de MVola, client sans 034/038).
- Orange Money et Airtel Money ont leur propre intégration API, avec les mêmes garanties : voir
  `OPERATEURS-INTEGRATION.md`.
