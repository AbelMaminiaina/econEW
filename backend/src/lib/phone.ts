// Numéros de mobile malgaches : « 034 12 345 67 », « +261 34 12 345 67 », « 0341234567 »… -> « 0341234567 »
// (format local à 10 chiffres, celui attendu par les API des opérateurs). null si ce n'est pas un mobile malgache.
export function normalizeMalagasyMobile(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+261')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('00261')) digits = '0' + digits.slice(5);
  else if (digits.startsWith('261') && digits.length === 12) digits = '0' + digits.slice(3);
  return /^03\d{8}$/.test(digits) ? digits : null;
}

// MVola (Telma) : préfixes 034 et 038
export function isMvolaNumber(localNumber: string): boolean {
  return /^03[48]\d{7}$/.test(localNumber);
}

// Orange Money : préfixes 032 et 037
export function isOrangeNumber(localNumber: string): boolean {
  return /^03[27]\d{7}$/.test(localNumber);
}

// Airtel Money : préfixe 033
export function isAirtelNumber(localNumber: string): boolean {
  return /^033\d{7}$/.test(localNumber);
}
