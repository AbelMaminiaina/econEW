'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck, Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { fadeInUp, fadeInRight, staggerContainer } from '@/lib/animations';

const slides = [
  {
    id: 1,
    title: 'Achetez en gros,',
    titleHighlight: 'au meilleur prix',
    description:
      'Des tarifs dégressifs par quantité sur un catalogue multi-catégories, pour les professionnels comme pour les particuliers.',
  },
  {
    id: 2,
    title: 'Payez',
    titleHighlight: 'à 30 ou 60 jours',
    description:
      'Une fois votre compte entreprise approuvé, commandez et réglez vos factures selon les conditions de paiement qui vous sont accordées.',
  },
  {
    id: 3,
    title: 'Un catalogue',
    titleHighlight: 'multi-catégories',
    description:
      'Emballage, fournitures, hygiène, quincaillerie, électronique, textile professionnel... tout votre approvisionnement au même endroit.',
  },
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section
      className="relative min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-br from-warm-900 via-prairie-900 to-warm-800"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-20">
        <motion.div
          className="max-w-2xl"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-prairie-600/90 text-white rounded-full text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Particuliers et professionnels bienvenus
            </span>
          </motion.div>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-6 leading-tight"
            >
              {slide.title}{' '}
              <span className="text-terre-400 text-2xl md:text-3xl lg:text-4xl">{slide.titleHighlight}</span>
            </motion.h1>
          </AnimatePresence>

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`desc-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg md:text-xl text-warm-200 mb-8 leading-relaxed"
            >
              {slide.description}
            </motion.p>
          </AnimatePresence>

          {/* Values highlights */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap gap-4 mb-8"
          >
            <div className="flex items-center gap-2 text-warm-200">
              <Percent className="h-5 w-5 text-terre-400" />
              <span>Tarifs par quantité</span>
            </div>
            <div className="flex items-center gap-2 text-warm-200">
              <ShieldCheck className="h-5 w-5 text-prairie-400" />
              <span>Comptes approuvés</span>
            </div>
            <div className="flex items-center gap-2 text-warm-200">
              <svg className="h-5 w-5 text-terre-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 1 1 0 100 2H6a1 1 0 00-1 1v2H3V6a2 2 0 011-1.732V5zm12 0V4.268A2 2 0 0117 6v2h-2V6a1 1 0 00-1-1h-1a1 1 0 100 2h1zM3 10h14v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z" />
              </svg>
              <span>Facturation Net 30/60</span>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/produits">
              <Button
                size="lg"
                icon={<ArrowRight className="h-5 w-5" />}
                iconPosition="right"
              >
                Découvrir le catalogue
              </Button>
            </Link>
            <Link href="/inscription">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white hover:text-warm-800">
                Créer un compte
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation arrows */}
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-20 flex justify-between pointer-events-none">
        <motion.button
          onClick={prevSlide}
          className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all pointer-events-auto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Slide précédent"
        >
          <ChevronLeft className="h-6 w-6" />
        </motion.button>
        <motion.button
          onClick={nextSlide}
          className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all pointer-events-auto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Slide suivant"
        >
          <ChevronRight className="h-6 w-6" />
        </motion.button>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {slides.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
        <motion.div
          className="h-full bg-prairie-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
          key={currentSlide}
        />
      </div>

      {/* Decorative elements */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-50 to-transparent z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      />

      {/* Stats */}
      <motion.div
        className="absolute bottom-12 right-8 hidden lg:flex gap-6 z-20"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div
          variants={fadeInRight}
          className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg"
        >
          <div className="text-3xl font-bold text-prairie-600">6+</div>
          <div className="text-sm text-warm-600">Catégories de produits</div>
        </motion.div>
        <motion.div
          variants={fadeInRight}
          className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg"
        >
          <div className="text-3xl font-bold text-prairie-600">30-60j</div>
          <div className="text-sm text-warm-600">Facturation différée</div>
        </motion.div>
        <motion.div
          variants={fadeInRight}
          className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg"
        >
          <div className="text-3xl font-bold text-prairie-600">100%</div>
          <div className="text-sm text-warm-600">Comptes vérifiés</div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default Hero;
