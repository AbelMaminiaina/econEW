'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, CheckCircle, User } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { fadeInUp } from '@/lib/animations';
import { registerCompany, registerCustomer } from '@/lib/api/auth';

type AccountType = 'particulier' | 'professionnel';

function ProfileChoice({ onChoose }: { onChoose: (type: AccountType) => void }) {
  const cards: { type: AccountType; title: string; text: string; icon: React.ReactNode }[] = [
    {
      type: 'particulier',
      title: 'Particulier',
      text: 'Achetez en gros volume (quantité minimum par produit), au prix catalogue. Compte actif immédiatement, paiement par Mobile Money.',
      icon: <User className="h-7 w-7 text-prairie-600" />,
    },
    {
      type: 'professionnel',
      title: 'Professionnel',
      text: 'Tarifs dégressifs par quantité et publication de vos produits en plus. Compte entreprise validé par notre équipe.',
      icon: <Building2 className="h-7 w-7 text-prairie-600" />,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cards.map((card) => (
        <button
          key={card.type}
          type="button"
          onClick={() => onChoose(card.type)}
          className="text-left border border-warm-200 rounded-xl p-6 hover:border-prairie-500 hover:bg-prairie-50/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-prairie-100 flex items-center justify-center mb-4">
            {card.icon}
          </div>
          <h2 className="font-semibold text-warm-800 mb-1">{card.title}</h2>
          <p className="text-sm text-warm-600">{card.text}</p>
        </button>
      ))}
    </div>
  );
}

function CustomerForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await registerCustomer({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
      return;
    }

    // Compte actif immédiatement : on connecte directement le nouveau client
    setSigningIn(true);
    const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    if (result?.error) {
      setSigningIn(false);
      router.push(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">Prénom *</label>
          <Input value={form.firstName} onChange={update('firstName')} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">Nom *</label>
          <Input value={form.lastName} onChange={update('lastName')} required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-1">Téléphone</label>
        <Input type="tel" value={form.phone} onChange={update('phone')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-1">Email *</label>
        <Input type="email" value={form.email} onChange={update('email')} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-1">Mot de passe *</label>
        <Input type="password" value={form.password} onChange={update('password')} minLength={8} required />
      </div>
      <Button
        type="submit"
        fullWidth
        loading={isLoading}
        loadingText={signingIn ? 'Compte créé, connexion…' : 'Création du compte…'}
      >
        Créer mon compte
      </Button>
      <p className="text-xs text-warm-500 text-center">
        Sans engagement · Aucun paiement en ligne · Compte actif immédiatement
      </p>
    </form>
  );
}

function CompanyForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    companyName: '',
    taxId: '',
    contactEmail: '',
    contactPhone: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await registerCompany({
        companyName: form.companyName,
        taxId: form.taxId,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        user: {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-warm-800 mb-3 uppercase tracking-wide">Entreprise</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Raison sociale *</label>
            <Input value={form.companyName} onChange={update('companyName')} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Numéro fiscal (NIF) *</label>
              <Input value={form.taxId} onChange={update('taxId')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Téléphone</label>
              <Input type="tel" value={form.contactPhone} onChange={update('contactPhone')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Email de contact entreprise *</label>
            <Input type="email" value={form.contactEmail} onChange={update('contactEmail')} required />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-warm-800 mb-3 uppercase tracking-wide">Votre compte</h2>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Prénom *</label>
              <Input value={form.firstName} onChange={update('firstName')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Nom *</label>
              <Input value={form.lastName} onChange={update('lastName')} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Email professionnel *</label>
            <Input type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Mot de passe *</label>
            <Input type="password" value={form.password} onChange={update('password')} minLength={8} required />
          </div>
        </div>
      </div>

      <Button type="submit" fullWidth loading={isLoading} loadingText="Envoi de la demande…">
        Envoyer ma demande
      </Button>
      <p className="text-xs text-warm-500 text-center">
        Sans engagement · Inscription gratuite · Validation sous 1 à 2 jours ouvrés
      </p>
    </form>
  );
}

function InscriptionContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/produits';
  const initialType = searchParams.get('type');
  const [type, setType] = useState<AccountType | null>(
    initialType === 'particulier' || initialType === 'professionnel' ? initialType : null
  );
  const [companySubmitted, setCompanySubmitted] = useState(false);

  if (companySubmitted) {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-md mx-auto text-center bg-white rounded-xl p-8 shadow-sm"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="w-16 h-16 rounded-full bg-prairie-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-prairie-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-warm-800 mb-2">Demande envoyée !</h1>
            <p className="text-warm-600 mb-6">
              Votre entreprise a été enregistrée et est en attente de validation par notre
              équipe. Vous recevrez un e-mail dès que votre compte sera approuvé.
            </p>
            <Link href="/">
              <Button>Retour à l&apos;accueil</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const heading =
    type === 'particulier'
      ? { title: 'Créer un compte particulier', text: 'Commandez en gros volume dès maintenant, sans validation.' }
      : type === 'professionnel'
        ? { title: 'Créer un compte professionnel', text: 'Accédez à nos tarifs grossistes après validation de votre entreprise' }
        : { title: 'Créer un compte', text: 'Vous êtes un particulier ou un professionnel ?' };

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div className="max-w-xl mx-auto" variants={fadeInUp} initial="initial" animate="animate">
          {type ? (
            <button
              type="button"
              onClick={() => setType(null)}
              className="inline-flex items-center gap-2 text-warm-600 hover:text-prairie-600 mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de type de compte
            </button>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 text-warm-600 hover:text-prairie-600 mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          )}

          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-bold text-warm-800 mb-2">{heading.title}</h1>
              <p className="text-warm-600">{heading.text}</p>
            </div>

            {type === null && <ProfileChoice onChoose={setType} />}
            {type === 'particulier' && <CustomerForm callbackUrl={callbackUrl} />}
            {type === 'professionnel' && <CompanyForm onSuccess={() => setCompanySubmitted(true)} />}

            <p className="mt-6 text-sm text-warm-500 text-center">
              Déjà un compte ?{' '}
              <Link href="/connexion" className="text-prairie-600 hover:underline">
                Connectez-vous
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center">Chargement...</div>}>
      <InscriptionContent />
    </Suspense>
  );
}
