'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Truck, Building2, CreditCard, MessageCircle, Check } from 'lucide-react';
import { services, faqItems } from '@/data/services';
import { Card, CardContent, Button, Accordion } from '@/components/ui';
import { fadeInUp, staggerContainer, viewportOnce } from '@/lib/animations';
import Link from 'next/link';

const iconMap: Record<string, React.ElementType> = {
  Truck: Truck,
  Building2: Building2,
  CreditCard: CreditCard,
  MessageCircle: MessageCircle,
};

const filieres = [
  {
    slug: 'mobiles',
    title: 'Mobiles & Smartphones',
    text: 'Smartphones et tablettes, vendus à la pièce avec des tarifs dégressifs dès 10 pièces.',
    image: '/electro/img/product-banner.jpg',
    alt: 'Smartphones et mobiles',
  },
  {
    slug: 'ordinateurs',
    title: 'Ordinateurs & Écrans',
    text: 'Portables, écrans et packs bureau pour équiper vos équipes.',
    image: '/electro/img/product-banner-2.jpg',
    alt: 'Ordinateurs et écrans',
  },
];

export default function ServicesPage() {
  const faqAccordionItems = faqItems.map((item) => ({
    id: item.id,
    title: item.question,
    content: <p className="text-warm-600">{item.answer}</p>,
  }));

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/electro/img/carousel-1.jpg"
            alt="Composants électroniques et informatique"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-warm-900/70 to-warm-900/40" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-2xl text-white"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <span className="text-prairie-300 font-medium mb-2 block">
              À votre service
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Nos Services
            </h1>
            <p className="text-lg text-warm-200">
              Au-delà de nos produits, nous vous accompagnons avec des services
              adaptés à vos besoins : livraison, conseils...
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">

        {/* Services grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-8 mb-20"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {services.map((service) => {
            const Icon = iconMap[service.icon];
            return (
              <motion.div key={service.id} variants={fadeInUp}>
                <Card
                  hover
                  className="h-full"
                  padding="lg"
                  id={service.slug}
                >
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-prairie-100 flex items-center justify-center shrink-0">
                        {Icon && <Icon className="h-7 w-7 text-prairie-600" />}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-warm-800 mb-2">
                          {service.title}
                        </h2>
                        <p className="text-warm-600 mb-4">{service.description}</p>

                        {/* Features */}
                        <ul className="space-y-2 mb-6">
                          {service.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-sm text-warm-600"
                            >
                              <Check className="h-4 w-4 text-prairie-500 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {/* Pricing */}
                        {service.pricing && (
                          <div className="flex items-center justify-between pt-4 border-t border-warm-100">
                            <div>
                              <span className="text-sm text-warm-500">À partir de</span>
                              <span className="block text-lg font-bold text-prairie-600">
                                {service.pricing}
                              </span>
                            </div>
                            <Link href="/contact">
                              <Button variant="outline" size="sm">
                                Nous contacter
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Nos filières */}
        <motion.section
          className="mb-20"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-warm-800 mb-4">
              Nos catégories phares
            </h2>
            <p className="text-warm-600 max-w-2xl mx-auto">
              Smartphones, ordinateurs et écrans, vendus à la pièce avec des tarifs dégressifs,
              pour les entreprises, les boutiques et les revendeurs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {filieres.map((filiere) => (
              <Link key={filiere.slug} href={`/produits?categorie=${filiere.slug}`} className="group block">
                <Card hover padding="none" className="h-full overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={filiere.image}
                      alt={filiere.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-warm-800 mb-1">{filiere.title}</h3>
                    <p className="text-warm-600 mb-3">{filiere.text}</p>
                    <span className="text-sm font-medium text-prairie-600">Voir les produits →</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.div
          className="max-w-3xl mx-auto"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-warm-800 mb-4">
              Questions fréquentes
            </h2>
            <p className="text-warm-600">
              Vous avez des questions ? Consultez notre FAQ ou contactez-nous !
            </p>
          </div>

          <Accordion items={faqAccordionItems} />

          <div className="text-center mt-8">
            <p className="text-warm-600 mb-4">
              Vous ne trouvez pas la réponse à votre question ?
            </p>
            <Link href="/contact">
              <Button icon={<MessageCircle className="h-4 w-4" />}>
                Nous contacter
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
