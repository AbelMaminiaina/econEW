import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <p className="text-8xl font-medium text-electro-dark">404</p>
      <h1 className="mb-4 mt-2 text-3xl font-medium text-electro-dark">Page introuvable</h1>
      <p className="mb-8 text-warm-600">Désolé, la page que vous cherchez n&apos;existe pas sur notre site.</p>
      <Link
        href="/"
        className="inline-block rounded-full bg-electro-primary px-10 py-3.5 text-white transition-colors duration-500 hover:bg-electro-secondary"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
