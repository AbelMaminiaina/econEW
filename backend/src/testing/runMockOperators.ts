import { createMockOrange } from './mockOrangeServer.js';
import { createMockAirtel } from './mockAirtelServer.js';

// Lance les faux serveurs Orange Money et Airtel Money pour tester le paiement automatique en local, sans compte :
//   npm run mock:operators
// puis démarrer le backend avec, par exemple (.env) :
//   ORANGE_MONEY_CLIENT_ID=test-client  ORANGE_MONEY_CLIENT_SECRET=test-secret  ORANGE_MONEY_MERCHANT_KEY=test-merchant
//   ORANGE_MONEY_API_BASE_URL=http://127.0.0.1:4011  PUBLIC_SITE_URL=http://localhost:3000
//   AIRTEL_MONEY_CLIENT_ID=test-client  AIRTEL_MONEY_CLIENT_SECRET=test-secret  AIRTEL_MONEY_API_BASE_URL=http://127.0.0.1:4012
// Orange : le client est redirigé vers une page de paiement simulée (boutons Payer / Annuler).
// Airtel : numéros de test 033 35 000 03 (paiement confirmé), 04 (refusé), 05 (jamais confirmé), 07 (Airtel en panne),
// 08 (demande refusée).
const orangePort = Number(process.env.MOCK_ORANGE_PORT ?? 4011);
const airtelPort = Number(process.env.MOCK_AIRTEL_PORT ?? 4012);
const airtelDelayMs = Number(process.env.MOCK_AIRTEL_DELAY_MS ?? 4000);
const airtelCallbackUrl = process.env.MOCK_AIRTEL_CALLBACK_URL || undefined;

async function main() {
  const orange = createMockOrange();
  const airtel = createMockAirtel({ autoResolveMs: airtelDelayMs, callbackUrl: airtelCallbackUrl });
  const o = await orange.listen(orangePort);
  const a = await airtel.listen(airtelPort);
  console.log(`Faux serveur Orange Money sur ${o.url} (page de paiement simulée)`);
  console.log(`Faux serveur Airtel Money sur ${a.url} (le client « confirme » après ${airtelDelayMs} ms)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
