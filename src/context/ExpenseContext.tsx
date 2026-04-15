'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Expense, ExpenseFilters } from '@/types/expense';
import { getCurrentMonthRange } from '@/lib/utils';

const STORAGE_KEY = 'expense-tracker-data';

interface ExpenseState {
  expenses: Expense[];
  filters: ExpenseFilters;
  isLoaded: boolean;
}

type ExpenseAction =
  | { type: 'LOAD_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<ExpenseFilters> }
  | { type: 'CLEAR_FILTERS' };

const { startDate, endDate } = getCurrentMonthRange();

const DEFAULT_FILTERS: ExpenseFilters = {
  startDate: '',
  endDate: '',
  category: 'All',
  searchQuery: '',
};

const initialState: ExpenseState = {
  expenses: [],
  filters: DEFAULT_FILTERS,
  isLoaded: false,
};

function expenseReducer(state: ExpenseState, action: ExpenseAction): ExpenseState {
  switch (action.type) {
    case 'LOAD_EXPENSES':
      return { ...state, expenses: action.payload, isLoaded: true };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'CLEAR_FILTERS':
      return { ...state, filters: DEFAULT_FILTERS };
    default:
      return state;
  }
}

interface ExpenseContextValue {
  state: ExpenseState;
  dispatch: React.Dispatch<ExpenseAction>;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(expenseReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const expenses: Expense[] = raw ? JSON.parse(raw) : [];
      dispatch({ type: 'LOAD_EXPENSES', payload: expenses });
    } catch {
      dispatch({ type: 'LOAD_EXPENSES', payload: [] });
    }
  }, []);

  // Sync to localStorage on every expenses change
  useEffect(() => {
    if (!state.isLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
    } catch {
      // storage unavailable
    }
  }, [state.expenses, state.isLoaded]);

  return (
    <ExpenseContext.Provider value={{ state, dispatch }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenseContext(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenseContext must be used within ExpenseProvider');
  return ctx;
}
