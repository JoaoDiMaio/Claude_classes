'use client';

import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseFilters, Category } from '@/types/expense';

export function useFilters() {
  const { filters, dispatch } = useExpenses();

  function setFilter<K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) {
    dispatch({ type: 'SET_FILTERS', payload: { [key]: value } });
  }

  function clearFilters() {
    dispatch({ type: 'CLEAR_FILTERS' });
  }

  const hasActiveFilters =
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    filters.category !== 'All' ||
    filters.searchQuery !== '';

  return { filters, setFilter, clearFilters, hasActiveFilters };
}
