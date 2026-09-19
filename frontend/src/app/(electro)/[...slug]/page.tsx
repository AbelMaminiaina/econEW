import { notFound } from 'next/navigation';

// Toute URL inconnue est rendue par (electro)/not-found.tsx, dans le layout Bootstrap.
export default function CatchAll() {
  notFound();
}
