'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { Expense } from '@/types/expense';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isLoaded: boolean;
}

export function ExpenseList({ expenses, onEdit, onDelete, isLoaded }: ExpenseListProps) {
  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No expenses found"
        description="No expenses match your current filters. Try adjusting or clearing the filters."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 mb-1">
        Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
      </p>
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
