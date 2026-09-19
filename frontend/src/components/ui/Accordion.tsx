'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accordionContent } from '@/lib/animations';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  const isOpen = (id: string) => openIds.includes(id);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-warm-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className={cn(
              'w-full flex items-center justify-between p-4 text-left',
              'bg-white hover:bg-warm-50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-prairie-500'
            )}
            aria-expanded={isOpen(item.id)}
          >
            <span className="font-medium text-warm-800">{item.title}</span>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-warm-500 transition-transform duration-200',
                isOpen(item.id) && 'rotate-180'
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {isOpen(item.id) && (
              <motion.div
                variants={accordionContent}
                initial="initial"
                animate="animate"
                exit="exit"
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 text-warm-600 border-t border-warm-100">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default Accordion;
