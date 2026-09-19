// Logos des entreprises clientes affichés sur l'accueil (bandeau « Ils nous font confiance »).
// Le bandeau reste masqué tant que la liste est vide. Déposer le fichier dans public/images/clients/.
export interface ClientLogo {
  name: string;
  src: string;
}

export const clientLogos: ClientLogo[] = [];
