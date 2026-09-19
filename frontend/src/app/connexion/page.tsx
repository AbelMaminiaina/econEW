'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { fadeInUp } from '@/lib/animations';

function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const urlError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === 'CredentialsSignin' ? 'Email ou mot de passe incorrect.' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      setError('Email ou mot de passe incorrect.');
      setIsLoading(false);
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-md mx-auto"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-warm-600 hover:text-prairie-600 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-bold text-warm-800 mb-2">
                Connexion
              </h1>
              <p className="text-warm-600">
                Particuliers et professionnels : connectez-vous à votre compte
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-warm-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-warm-700 mb-1">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                />
              </div>
              <Button type="submit" fullWidth loading={isLoading} loadingText="Connexion en cours…">
                Se connecter
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-warm-100 text-center space-y-3">
              <p className="text-sm text-warm-600">Pas encore de compte ?</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href={`/inscription?type=particulier&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="block rounded-lg border border-warm-200 px-4 py-3 text-sm font-medium text-prairie-700 hover:border-prairie-500 hover:bg-prairie-50/40 transition-colors"
                >
                  Je suis un particulier
                </Link>
                <Link
                  href="/inscription?type=professionnel"
                  className="block rounded-lg border border-warm-200 px-4 py-3 text-sm font-medium text-prairie-700 hover:border-prairie-500 hover:bg-prairie-50/40 transition-colors"
                >
                  Je suis un professionnel
                </Link>
              </div>
              <p className="text-sm text-warm-500">
                En vous connectant, vous acceptez nos{' '}
                <Link href="/cgv" className="text-prairie-600 hover:underline">
                  conditions générales
                </Link>{' '}
                et notre{' '}
                <Link href="/politique-confidentialite" className="text-prairie-600 hover:underline">
                  politique de confidentialité
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center">Chargement...</div>}>
      <ConnexionContent />
    </Suspense>
  );
}
