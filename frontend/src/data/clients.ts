// Logos des entreprises clientes affichés sur l'accueil (bandeau « Ils nous font confiance »).
// Le bandeau reste masqué tant que la liste est vide. Déposer les fichiers dans public/images/clients/ (dossier à créer).
export interface ClientLogo {
  name: string;
  src: string;
}

export const clientLogos: ClientLogo[] = [];
