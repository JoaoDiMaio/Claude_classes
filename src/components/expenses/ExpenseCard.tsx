'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Expense } from '@/types/expense';
import { CategoryBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import { CATEGORY_META } from '@/types/expense';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const borderColor = CATEGORY_META[expense.category].borderClass;

  return (
    <div className={`group relative bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor}
      px-4 py-4 hover:shadow-sm transition-shadow duration-150`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryBadge category={expense.category} />
            <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{expense.title}</p>
          {expense.notes && (
            <p className="text-xs text-slate-500 mt-0.5">{truncate(expense.notes, 80)}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(expense.amount)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(expense)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
