'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { testimonials } from '@/data/testimonials';
import { fadeInUp, viewportOnce } from '@/lib/animations';

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];

  return (
    <section className="section-y bg-prairie-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <span className="text-prairie-600 font-medium mb-2 block">
            Avis clients
          </span>
          <h2 className="heading-2 font-bold text-warm-900 mb-4">
            Ce que disent nos clients
          </h2>
          <p className="text-warm-600">
            Particuliers et professionnels partagent leur expérience sur All.
          </p>
        </motion.div>

        {/* Testimonial carousel */}
        <motion.div
          className="max-w-4xl mx-auto"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <div className="relative bg-white rounded-2xl shadow-lg p-8 md:p-12">
            {/* Quote icon */}
            <Quote className="absolute top-6 left-6 h-12 w-12 text-prairie-100" />

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                {/* Rating */}
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${
                        i < current.rating
                          ? 'text-terre-400 fill-terre-400'
                          : 'text-warm-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-lg md:text-xl text-warm-700 text-center leading-relaxed mb-8">
                  &ldquo;{current.content}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden relative mb-3 ring-4 ring-prairie-100">
                    <Image
                      src={current.avatar || '/images/team/avatar-placeholder.jpg'}
                      alt={current.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-warm-800">
                      {current.name}
                    </div>
                    <div className="text-sm text-warm-500">{current.location}</div>
                    {current.productPurchased && (
                      <div className="text-xs text-prairie-600 mt-1">
                        A acheté : {current.productPurchased}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-warm-100 hover:bg-warm-200 transition-colors"
              aria-label="Témoignage précédent"
            >
              <ChevronLeft className="h-6 w-6 text-warm-600" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-warm-100 hover:bg-warm-200 transition-colors"
              aria-label="Témoignage suivant"
            >
              <ChevronRight className="h-6 w-6 text-warm-600" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-prairie-600 w-8'
                    : 'bg-warm-300 hover:bg-warm-400'
                }`}
                aria-label={`Aller au témoignage ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;
