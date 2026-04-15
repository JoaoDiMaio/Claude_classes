'use client';

import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useFilters } from '@/hooks/useFilters';
import { CATEGORIES } from '@/types/expense';

const categoryOptions = [
  { value: 'All', label: 'All Categories' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

export function ExpenseFilters() {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useFilters();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter('searchQuery', value);
    }, 250);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            defaultValue={filters.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
              focus:border-transparent transition-colors"
          />
        </div>

        {/* Category */}
        <div className="sm:w-48">
          <Select
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value as typeof filters.category)}
            options={categoryOptions}
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilter('startDate', e.target.value)}
            placeholder="From"
          />
          <span className="text-slate-400 text-sm shrink-0">to</span>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilter('endDate', e.target.value)}
            placeholder="To"
          />
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
