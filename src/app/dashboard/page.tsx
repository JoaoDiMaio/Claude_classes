'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { SpendingByCategory } from '@/components/dashboard/SpendingByCategory';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { Button } from '@/components/ui/Button';
import { useExpenses } from '@/hooks/useExpenses';
import { getMonthlyTotals, getTotalByCategory } from '@/lib/analytics';

export default function DashboardPage() {
  const { expenses, isLoaded, exportCSV } = useExpenses();

  const monthlyData = getMonthlyTotals(expenses, 6);
  const categoryData = getTotalByCategory(expenses);

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 h-64" />
          <div className="bg-white rounded-xl border border-slate-200 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your spending</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV} disabled={expenses.length === 0}>
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      <SummaryCards expenses={expenses} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart data={monthlyData} />
        <SpendingByCategory data={categoryData} />
      </div>

      <RecentExpenses expenses={expenses} />
    </div>
  );
}
