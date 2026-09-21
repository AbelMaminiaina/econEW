import { createMockMvola } from './mockMvolaServer.js';

// Lance le faux serveur MVola pour tester le paiement automatique en local, sans compte MVola :
//   npm run mock:mvola
// puis démarrer le backend avec, par exemple (.env) :
//   MVOLA_CONSUMER_KEY=test-key  MVOLA_CONSUMER_SECRET=test-secret  MVOLA_MERCHANT_NUMBER=034 00 000 00
//   MVOLA_API_BASE_URL=http://127.0.0.1:4010
// Numéros de test : 034 35 000 03 (paiement confirmé), 034 35 000 04 (refusé), 034 35 000 05 (jamais confirmé),
// 034 35 000 06 (montant différent), 034 35 000 07 (MVola en panne).
const port = Number(process.env.MOCK_MVOLA_PORT ?? 4010);
const autoResolveMs = Number(process.env.MOCK_MVOLA_DELAY_MS ?? 4000);

async function main() {
  const mock = createMockMvola({ autoResolveMs });
  const { url } = await mock.listen(port);
  console.log(`Faux serveur MVola sur ${url} (le client « confirme » après ${autoResolveMs} ms)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
