import { Expense, Category, CATEGORIES } from '@/types/expense';
import { toISODateString, formatMonthYear } from '@/lib/utils';

export interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
  color: string;
}

export interface MonthlyTotal {
  month: string;
  monthLabel: string;
  total: number;
}

import { CATEGORY_META } from '@/types/expense';

export function getTotalByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = CATEGORIES.reduce<Record<Category, number>>(
    (acc, cat) => ({ ...acc, [cat]: 0 }),
    {} as Record<Category, number>
  );

  for (const exp of expenses) {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  }

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return CATEGORIES.map((cat) => ({
    category: cat,
    total: totals[cat],
    percentage: grandTotal > 0 ? (totals[cat] / grandTotal) * 100 : 0,
    color: CATEGORY_META[cat].color,
  })).filter((c) => c.total > 0);
}

export function getMonthlyTotals(expenses: Expense[], months: number): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = formatMonthYear(monthKey);

    const total = expenses
      .filter((e) => e.date.startsWith(monthKey))
      .reduce((sum, e) => sum + e.amount, 0);

    result.push({ month: monthKey, monthLabel, total });
  }

  return result;
}

export function getTotalThisMonth(expenses: Expense[]): number {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return expenses
    .filter((e) => e.date.startsWith(monthKey))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getTotalAllTime(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getLargestCategory(expenses: Expense[]): Category | null {
  if (expenses.length === 0) return null;
  const totals = getTotalByCategory(expenses);
  if (totals.length === 0) return null;
  return totals.reduce((a, b) => (a.total >= b.total ? a : b)).category;
}

export function getDailyAverage(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const now = new Date();
  const dayOfMonth = now.getDate();
  const thisMonthTotal = getTotalThisMonth(expenses);
  return thisMonthTotal / dayOfMonth;
}

export function getFilteredExpenses(
  expenses: Expense[],
  filters: { startDate: string; endDate: string; category: string; searchQuery: string }
): Expense[] {
  return expenses.filter((e) => {
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate && e.date > filters.endDate) return false;
    if (filters.category !== 'All' && e.category !== filters.category) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (
        !e.title.toLowerCase().includes(q) &&
        !(e.notes?.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    return true;
  });
}
