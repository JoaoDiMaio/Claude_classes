import React from 'react';
import { Category, CATEGORY_META } from '@/types/expense';
import { cn } from '@/lib/utils';

interface BadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: BadgeProps) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        meta.bgClass,
        meta.textClass,
        className
      )}
    >
      {category}
    </span>
  );
}
