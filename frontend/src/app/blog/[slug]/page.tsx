'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, ArrowLeft, Facebook, Twitter, Linkedin } from 'lucide-react';
import { getBlogPostBySlug, getRelatedPosts } from '@/data/blog';
import { Button, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { fadeInUp, viewportOnce } from '@/lib/animations';

const categoryLabels: Record<string, string> = {
  conseils: 'Conseils',
  produits: 'Produits',
  actualites: 'Actualités',
  evenements: 'Événements',
};

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-warm-800 mb-4">
            Article non trouvé
          </h1>
          <Link href="/blog">
            <Button>Retour au blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = getRelatedPosts(post.id);

  // Simple markdown to HTML (basic implementation)
  const renderContent = (content: string) => {
    return content
      .split('\n\n')
      .map((paragraph, index) => {
        if (paragraph.startsWith('# ')) {
          return (
            <h1 key={index} className="text-3xl font-display font-bold text-warm-800 mt-8 mb-4">
              {paragraph.slice(2)}
            </h1>
          );
        }
        if (paragraph.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-display font-bold text-warm-800 mt-8 mb-4">
              {paragraph.slice(3)}
            </h2>
          );
        }
        if (paragraph.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold text-warm-800 mt-6 mb-3">
              {paragraph.slice(4)}
            </h3>
          );
        }
        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
          const items = paragraph.split('\n').filter(line => line.trim());
          return (
            <ul key={index} className="list-disc list-inside mb-4 space-y-2 text-warm-700">
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^[-*]\s/, '')}</li>
              ))}
            </ul>
          );
        }
        if (/^\d+\.\s/.test(paragraph)) {
          const items = paragraph.split('\n').filter(line => line.trim());
          return (
            <ol key={index} className="list-decimal list-inside mb-4 space-y-2 text-warm-700">
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>
              ))}
            </ol>
          );
        }
        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
          return (
            <p key={index} className="font-semibold text-warm-800 mb-4">
              {paragraph.slice(2, -2)}
            </p>
          );
        }
        return (
          <p key={index} className="text-warm-700 mb-4 leading-relaxed">
            {paragraph}
          </p>
        );
      });
  };

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-warm-900/80 via-warm-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 pb-8">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="max-w-3xl"
            >
              <Badge type="default" className="bg-white/90 text-warm-800 mb-4">
                {categoryLabels[post.category]}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden relative ring-2 ring-white/50">
                    <Image
                      src={post.author.avatar}
                      alt={post.author.name}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <span>{post.author.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.publishedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readingTime} min de lecture
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Main content */}
          <motion.article
            className="lg:col-span-3 bg-white rounded-2xl p-6 md:p-10 shadow-sm"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="prose max-w-none">
              {renderContent(post.content)}
            </div>

            {/* Tags */}
            <div className="mt-8 pt-6 border-t border-warm-100">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-warm-100 text-warm-600 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="mt-6 pt-6 border-t border-warm-100">
              <p className="text-warm-600 mb-3">Partager cet article :</p>
              <div className="flex gap-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </motion.article>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Author card */}
            <motion.div
              className="bg-white rounded-xl p-6 shadow-sm"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
            >
              <h3 className="font-semibold text-warm-800 mb-4">À propos de l&apos;auteur</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden relative">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <span className="font-medium text-warm-800">{post.author.name}</span>
              </div>
              {post.author.bio && (
                <p className="text-sm text-warm-600">{post.author.bio}</p>
              )}
            </motion.div>

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <motion.div
                className="bg-white rounded-xl p-6 shadow-sm"
                variants={fadeInUp}
                initial="initial"
                whileInView="animate"
                viewport={viewportOnce}
              >
                <h3 className="font-semibold text-warm-800 mb-4">Articles similaires</h3>
                <div className="space-y-4">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedPost.slug}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden relative shrink-0">
                          <Image
                            src={relatedPost.coverImage}
                            alt={relatedPost.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-warm-800 group-hover:text-prairie-600 transition-colors line-clamp-2">
                            {relatedPost.title}
                          </h4>
                          <p className="text-xs text-warm-500 mt-1">
                            {formatDate(relatedPost.publishedAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </aside>
        </div>

        {/* Back link */}
        <div className="mt-12">
          <Link href="/blog">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour au blog
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
