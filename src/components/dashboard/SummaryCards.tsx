'use client';

import React from 'react';
import { DollarSign, TrendingUp, ShoppingBag, BarChart2 } from 'lucide-react';
import { Expense } from '@/types/expense';
import {
  getTotalThisMonth,
  getTotalAllTime,
  getLargestCategory,
  getDailyAverage,
} from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';

interface SummaryCardsProps {
  expenses: Expense[];
}

export function SummaryCards({ expenses }: SummaryCardsProps) {
  const thisMonth = getTotalThisMonth(expenses);
  const allTime = getTotalAllTime(expenses);
  const largest = getLargestCategory(expenses);
  const dailyAvg = getDailyAverage(expenses);
  const txCount = expenses.filter((e) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return e.date.startsWith(monthKey);
  }).length;

  const cards = [
    {
      label: 'This Month',
      value: formatCurrency(thisMonth),
      sub: `${txCount} transactions`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'All Time',
      value: formatCurrency(allTime),
      sub: `${expenses.length} total expenses`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Top Category',
      value: largest ?? '—',
      sub: largest ? 'this month' : 'no data yet',
      icon: ShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Daily Average',
      value: formatCurrency(dailyAvg),
      sub: 'this month',
      icon: BarChart2,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <div className={`p-2 ${bg} rounded-lg`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}
