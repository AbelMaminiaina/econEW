import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  type: 'bio' | 'plein_air' | 'nouveau' | 'promo' | 'populaire' | 'default';
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeStyles = {
  bio: 'bg-green-100 text-green-800 border-green-200',
  'plein_air': 'bg-blue-100 text-blue-800 border-blue-200',
  nouveau: 'bg-purple-100 text-purple-800 border-purple-200',
  promo: 'bg-red-100 text-red-800 border-red-200',
  populaire: 'bg-amber-100 text-amber-800 border-amber-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({ type, children, size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border',
        badgeStyles[type],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
