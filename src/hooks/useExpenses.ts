'use client';

import { useMemo } from 'react';
import { useExpenseContext } from '@/context/ExpenseContext';
import { Expense, ExpenseFormData, Category } from '@/types/expense';
import { generateId, toISODateString } from '@/lib/utils';
import { getFilteredExpenses } from '@/lib/analytics';
import { exportExpensesToCSV } from '@/lib/csvExport';

export function useExpenses() {
  const { state, dispatch } = useExpenseContext();

  const filteredExpenses = useMemo(() => {
    const sorted = [...state.expenses].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return getFilteredExpenses(sorted, state.filters);
  }, [state.expenses, state.filters]);

  function addExpense(data: ExpenseFormData): void {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: generateId(),
      title: data.title.trim(),
      amount: parseFloat(data.amount),
      category: data.category as Category,
      date: data.date,
      notes: data.notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_EXPENSE', payload: expense });
  }

  function updateExpense(id: string, data: ExpenseFormData): void {
    const existing = state.expenses.find((e) => e.id === id);
    if (!existing) return;
    const updated: Expense = {
      ...existing,
      title: data.title.trim(),
      amount: parseFloat(data.amount),
      category: data.category as Category,
      date: data.date,
      notes: data.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_EXPENSE', payload: updated });
  }

  function deleteExpense(id: string): void {
    dispatch({ type: 'DELETE_EXPENSE', payload: id });
  }

  function exportCSV(): void {
    exportExpensesToCSV(state.expenses);
  }

  return {
    expenses: state.expenses,
    filteredExpenses,
    filters: state.filters,
    isLoaded: state.isLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    exportCSV,
    dispatch,
  };
}
