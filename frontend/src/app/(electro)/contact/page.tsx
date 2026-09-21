'use client';

import { CONTACT, CONTACT_ADDRESS_LINES, CONTACT_MAILTO, CONTACT_MAP_EMBED_URL, CONTACT_PHONE_LINKS } from '@/lib/contact';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/electro/PageHeader';
import { useToast } from '@/components/electro/Toast';

const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Veuillez sélectionner un sujet'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter la politique de confidentialité',
  }),
});

type ContactFormData = z.infer<typeof contactSchema>;

const subjectOptions = [
  { value: 'compte', label: 'Demande de compte professionnel' },
  { value: 'commande', label: 'Question sur une commande' },
  { value: 'facturation', label: 'Question sur un paiement' },
  { value: 'produit', label: 'Information sur un produit' },
  { value: 'partenariat', label: 'Proposition de partenariat' },
  { value: 'autre', label: 'Autre' },
];

const INFO_CARDS = [
  { icon: 'fa-map-marker-alt', title: 'Adresse', lines: [...CONTACT_ADDRESS_LINES] },
  { icon: 'fa-envelope', title: 'Email', lines: [CONTACT.email], href: CONTACT_MAILTO },
  { icon: 'fa-phone-alt', title: 'Téléphone', lines: CONTACT.phones.map((p) => p.display), href: CONTACT_PHONE_LINKS[0]?.href },
  { icon: 'fa-clock', title: 'Horaires', lines: ['Lun - Ven : 9h - 18h', 'Sam : 9h - 12h · Dim : fermé'] },
];

// Page contact du template Electro (contact.html) : formulaire + carte + coordonnées.
export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      void data;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      addToast('error', "Impossible d'envoyer le message pour le moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = (hasError: boolean) => `form-control py-3${hasError ? ' is-invalid' : ''}`;

  return (
    <>
      <PageHeader
        title="Contactez-nous"
        crumbs={[{ label: 'Contact' }]}
        description="Notre équipe est là pour vous accompagner : inscription, commandes, paiements ou informations sur nos produits."
      />

      <div className="container-fluid contact py-5">
        <div className="container py-5">
          <div className="p-5 bg-light rounded">
            <div className="row g-4">
              <div className="col-12">
                <div className="text-start mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s">
                  <h1 className="display-5 mb-3">Une question ? Écrivez-nous !</h1>
                  <p className="mb-0">
                    Réponse dans les plus brefs délais, du lundi au vendredi. Pour une demande de compte
                    professionnel, choisissez le sujet correspondant.
                  </p>
                </div>
              </div>

              <div className="col-lg-5 wow fadeInLeft" data-wow-delay="0.1s">
                <div className="h-100 rounded overflow-hidden mb-4" style={{ minHeight: 300 }}>
                  <iframe
                    title="Plan d'accès"
                    className="w-100 h-100 rounded"
                    style={{ minHeight: 300, border: 0 }}
                    src={CONTACT_MAP_EMBED_URL}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="col-lg-7 wow fadeInRight" data-wow-delay="0.3s">
                {isSubmitted ? (
                  <div className="text-center py-5">
                    <i className="fas fa-check-circle display-1 text-primary mb-3 d-block"></i>
                    <h2 className="mb-3">Message envoyé !</h2>
                    <p className="mb-4">Merci pour votre message. Nous vous répondrons dans les plus brefs délais.</p>
                    <button type="button" className="btn btn-primary rounded-pill py-3 px-5" onClick={() => setIsSubmitted(false)}>
                      Envoyer un autre message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="row g-3">
                      <div className="col-lg-6">
                        <label htmlFor="c-name" className="form-label text-dark">Nom complet *</label>
                        <input id="c-name" className={fieldClass(!!errors.name)} placeholder="Jean Rakoto" {...register('name')} />
                        {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                      </div>
                      <div className="col-lg-6">
                        <label htmlFor="c-email" className="form-label text-dark">Email *</label>
                        <input id="c-email" type="email" className={fieldClass(!!errors.email)} placeholder="jean@exemple.mg" {...register('email')} />
                        {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                      </div>
                      <div className="col-lg-6">
                        <label htmlFor="c-phone" className="form-label text-dark">Téléphone</label>
                        <input id="c-phone" type="tel" className="form-control py-3" placeholder="034 00 000 00" {...register('phone')} />
                        <div className="form-text">Facultatif</div>
                      </div>
                      <div className="col-lg-6">
                        <label htmlFor="c-subject" className="form-label text-dark">Sujet *</label>
                        <select id="c-subject" className={`form-select py-3${errors.subject ? ' is-invalid' : ''}`} defaultValue="" {...register('subject')}>
                          <option value="" disabled>Sélectionnez un sujet</option>
                          {subjectOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {errors.subject && <div className="invalid-feedback">{errors.subject.message}</div>}
                      </div>
                      <div className="col-12">
                        <label htmlFor="c-message" className="form-label text-dark">Message *</label>
                        <textarea
                          id="c-message"
                          className={fieldClass(!!errors.message)}
                          rows={6}
                          placeholder="Écrivez votre message ici..."
                          {...register('message')}
                        />
                        {errors.message && <div className="invalid-feedback">{errors.message.message}</div>}
                      </div>
                      <div className="col-12">
                        <div className="form-check">
                          <input id="c-consent" type="checkbox" className={`form-check-input${errors.consent ? ' is-invalid' : ''}`} {...register('consent')} />
                          <label htmlFor="c-consent" className="form-check-label">
                            J&apos;accepte que mes données soient traitées conformément à la{' '}
                            <a href="/politique-confidentialite" className="text-primary">politique de confidentialité</a>
                          </label>
                          {errors.consent && <div className="invalid-feedback d-block">{errors.consent.message}</div>}
                        </div>
                      </div>
                      <div className="col-12">
                        <button type="submit" disabled={isLoading} className="btn btn-primary w-100 py-3 rounded-pill">
                          {isLoading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                          Envoyer le message
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="row g-4 mt-1">
            {INFO_CARDS.map((card, i) => (
              <div key={card.title} className="col-md-6 col-xl-3 wow fadeInUp" data-wow-delay={`${0.1 + i * 0.1}s`}>
                <div className="d-flex align-items-start bg-light rounded p-4 h-100">
                  <span className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: 56, height: 56 }}>
                    <i className={`fas ${card.icon} text-white`}></i>
                  </span>
                  <div>
                    <h5 className="text-dark mb-1">{card.title}</h5>
                    {card.lines.map((line) =>
                      card.href ? (
                        <a key={line} href={card.href} className="d-block text-muted">{line}</a>
                      ) : (
                        <p key={line} className="mb-0">{line}</p>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
