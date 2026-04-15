export type Category =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export interface CategoryMeta {
  label: Category;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: {
    label: 'Food',
    color: '#6366f1',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-400',
  },
  Transportation: {
    label: 'Transportation',
    color: '#f59e0b',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-400',
  },
  Entertainment: {
    label: 'Entertainment',
    color: '#ec4899',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-400',
  },
  Shopping: {
    label: 'Shopping',
    color: '#10b981',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-400',
  },
  Bills: {
    label: 'Bills',
    color: '#ef4444',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    borderClass: 'border-red-400',
  },
  Other: {
    label: 'Other',
    color: '#8b5cf6',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-400',
  },
};

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  startDate: string;
  endDate: string;
  category: Category | 'All';
  searchQuery: string;
}

export interface ExpenseFormData {
  title: string;
  amount: string;
  category: Category;
  date: string;
  notes: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormData, string>>;
