'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { blogPosts } from '@/data/blog';
import { BlogCategory } from '@/types';
import { Button, Badge } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';
import { fadeInUp, staggerContainer, viewportOnce } from '@/lib/animations';

const categories: { value: BlogCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'conseils', label: 'Conseils' },
  { value: 'produits', label: 'Produits' },
  { value: 'actualites', label: 'Actualités' },
  { value: 'evenements', label: 'Événements' },
];

const categoryColors: Record<BlogCategory, string> = {
  conseils: 'bg-blue-100 text-blue-800',
  produits: 'bg-orange-100 text-orange-800',
  actualites: 'bg-green-100 text-green-800',
  evenements: 'bg-purple-100 text-purple-800',
};

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') return blogPosts;
    return blogPosts.filter((post) => post.category === selectedCategory);
  }, [selectedCategory]);

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [filteredPosts]);

  const featuredPost = sortedPosts[0];
  const otherPosts = sortedPosts.slice(1);

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <span className="text-prairie-600 font-medium mb-2 block">
            Blog & Actualités
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-warm-800 mb-4">
            Nos derniers articles
          </h1>
          <p className="text-warm-600 text-lg">
            Conseils pour vos achats professionnels, actualités produits et
            informations sur la plateforme All.
          </p>
        </motion.div>

        {/* Category filter */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-12"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'px-4 py-2 rounded-full font-medium transition-all',
                selectedCategory === cat.value
                  ? 'bg-prairie-600 text-white'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Featured post */}
        {featuredPost && (
          <motion.div
            className="mb-12"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <Link href={`/blog/${featuredPost.slug}`}>
              <div className="grid md:grid-cols-2 gap-8 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <div className="relative aspect-video md:aspect-auto">
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <Badge
                    type="default"
                    className={categoryColors[featuredPost.category]}
                  >
                    {categories.find((c) => c.value === featuredPost.category)?.label}
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-warm-800 mt-3 mb-4 hover:text-prairie-700 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-warm-600 mb-4 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-warm-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(featuredPost.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {featuredPost.readingTime} min
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Other posts grid */}
        {otherPosts.length > 0 ? (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {otherPosts.map((post) => (
              <motion.div key={post.id} variants={fadeInUp}>
                <Link href={`/blog/${post.slug}`}>
                  <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                    <div className="relative aspect-video">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge
                          type="default"
                          size="sm"
                          className={categoryColors[post.category]}
                        >
                          {categories.find((c) => c.value === post.category)?.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-warm-800 mb-2 hover:text-prairie-700 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-warm-600 text-sm mb-4 line-clamp-2 flex-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-warm-500">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden relative">
                            <Image
                              src={post.author.avatar}
                              alt={post.author.name}
                              fill
                              sizes="24px"
                              className="object-cover"
                            />
                          </div>
                          <span>{post.author.name}</span>
                        </div>
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <p className="text-warm-500">Aucun article dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
