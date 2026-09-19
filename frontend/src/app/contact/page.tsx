'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  Send,
  CheckCircle,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Checkbox } from '@/components/ui';
import { fadeInUp, fadeInLeft, fadeInRight, viewportOnce } from '@/lib/animations';

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
  { value: 'facturation', label: 'Question sur une facture' },
  { value: 'produit', label: 'Information sur un produit' },
  { value: 'partenariat', label: 'Proposition de partenariat' },
  { value: 'autre', label: 'Autre' },
];

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center bg-gradient-to-br from-warm-900 via-prairie-900 to-warm-800">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-2xl text-white"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <span className="text-prairie-300 font-medium mb-2 block">
              Contactez-nous
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Une question ? Écrivez-nous !
            </h1>
            <p className="text-lg text-warm-200">
              Notre équipe est là pour vous accompagner : inscription, commandes,
              facturation ou informations sur nos produits.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact info */}
          <motion.div
            className="lg:col-span-1"
            variants={fadeInLeft}
            initial="initial"
            animate="animate"
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-warm-800 mb-6">
                Nos coordonnées
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-prairie-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-prairie-600" />
                  </div>
                  <div>
                    <div className="font-medium text-warm-800">Adresse</div>
                    <div className="text-warm-600 text-sm">
                      LE 187 <br />
                      Ambohitsoa Ambavatonelina, Madagascar<br />
                      Madagascar
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-prairie-100 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-prairie-600" />
                  </div>
                  <div>
                    <div className="font-medium text-warm-800">Téléphone</div>
                    <a
                      href="tel:+261380100101"
                      className="text-prairie-600 hover:text-prairie-700"
                    >
                      038 01 001 01
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-prairie-100 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-prairie-600" />
                  </div>
                  <div>
                    <div className="font-medium text-warm-800">Email</div>
                    <a
                      href="mailto:contact@all.mg"
                      className="text-prairie-600 hover:text-prairie-700"
                    >
                      contact@all.mg
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-prairie-100 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-prairie-600" />
                  </div>
                  <div>
                    <div className="font-medium text-warm-800">Horaires</div>
                    <div className="text-warm-600 text-sm">
                      Lundi - Vendredi : 9h - 18h<br />
                      Samedi : 9h - 12h<br />
                      Dimanche : Fermé
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-warm-800 mb-4">
                Suivez-nous
              </h2>
              <div className="flex gap-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <Facebook className="h-6 w-6" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors"
                >
                  <Instagram className="h-6 w-6" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            className="lg:col-span-2"
            variants={fadeInRight}
            initial="initial"
            animate="animate"
          >
            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-warm-800 mb-2">
                    Message envoyé !
                  </h2>
                  <p className="text-warm-600 mb-6">
                    Merci pour votre message. Nous vous répondrons dans les
                    plus brefs délais.
                  </p>
                  <Button onClick={() => setIsSubmitted(false)}>
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-warm-800 mb-6">
                    Envoyez-nous un message
                  </h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Nom complet"
                        placeholder="Jean Rakoto"
                        {...register('name')}
                        error={errors.name?.message}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="jean@exemple.mg"
                        {...register('email')}
                        error={errors.email?.message}
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Téléphone"
                        type="tel"
                        placeholder="034 00 000 00"
                        {...register('phone')}
                        helperText="Facultatif"
                      />
                      <Select
                        label="Sujet"
                        options={subjectOptions}
                        placeholder="Sélectionnez un sujet"
                        {...register('subject')}
                        error={errors.subject?.message}
                        required
                      />
                    </div>

                    <Textarea
                      label="Message"
                      placeholder="Écrivez votre message ici..."
                      rows={6}
                      {...register('message')}
                      error={errors.message?.message}
                      required
                    />

                    <Checkbox
                      {...register('consent')}
                      label={
                        <span className="text-sm text-warm-600">
                          J&apos;accepte que mes données soient traitées conformément à la{' '}
                          <a
                            href="/politique-confidentialite"
                            className="text-prairie-600 hover:underline"
                          >
                            politique de confidentialité
                          </a>
                        </span>
                      }
                      error={errors.consent?.message}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      loading={isLoading}
                      icon={<Send className="h-5 w-5" />}
                    >
                      Envoyer le message
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Map */}
        <motion.div
          className="mt-12 rounded-2xl overflow-hidden h-[400px] bg-warm-200"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3774.123456789!2d47.4234567!3d-19.3456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDIwJzQ0LjQiUyA0N8KwMjUnMjQuNCJF!5e0!3m2!1sfr!2smg!4v1234567890"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </motion.div>
      </div>
    </div>
  );
}
