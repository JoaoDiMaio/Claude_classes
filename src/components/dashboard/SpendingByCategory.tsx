'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { CategoryTotal } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';

interface SpendingByCategoryProps {
  data: CategoryTotal[];
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as CategoryTotal;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-700">{item.category}</p>
      <p className="text-sm font-bold text-slate-900">{formatCurrency(item.total)}</p>
      <p className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function SpendingByCategory({ data }: SpendingByCategoryProps) {
  const isEmpty = data.length === 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Spending by Category</h3>
      {isEmpty ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data yet
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="total"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {data.map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-700 truncate">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-900">
                    {formatCurrency(item.total)}
                  </span>
                  <span className="text-xs text-slate-400 w-10 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
