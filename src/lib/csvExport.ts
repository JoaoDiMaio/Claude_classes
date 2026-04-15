import { Expense } from '@/types/expense';
import { toISODateString } from '@/lib/utils';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportExpensesToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Title', 'Category', 'Amount', 'Notes'];
  const rows = expenses
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => [
      e.date,
      escapeCSV(e.title),
      e.category,
      e.amount.toFixed(2),
      escapeCSV(e.notes || ''),
    ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = toISODateString(new Date());
  a.href = url;
  a.download = `expenses-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
