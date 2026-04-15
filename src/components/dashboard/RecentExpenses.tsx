'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Expense } from '@/types/expense';
import { CategoryBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecentExpensesProps {
  expenses: Expense[];
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Expenses</h3>
        <Link
          href="/expenses"
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No expenses yet</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {recent.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <CategoryBadge category={expense.category} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{expense.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(expense.date)}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 shrink-0">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
