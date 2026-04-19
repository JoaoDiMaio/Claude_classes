import { Expense } from '@/types/expense';
import { ExportTemplateId } from '@/types/cloudExport';
import { toISODateString } from '@/lib/utils';

export interface ExportTemplate {
  id: ExportTemplateId;
  name: string;
  description: string;
  bestFor: string;
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'tax_report',
    name: 'Tax Report',
    description: 'Audit-friendly ledger + deductible hints and summary totals.',
    bestFor: 'Accountants, reimbursements, annual filing',
  },
  {
    id: 'monthly_summary',
    name: 'Monthly Summary',
    description: 'Month-by-month totals with top categories and trend signals.',
    bestFor: 'Monthly review, budgeting, status updates',
  },
  {
    id: 'category_analysis',
    name: 'Category Analysis',
    description: 'Category totals, counts, averages, and share of spend.',
    bestFor: 'Finding patterns, cutting spend, planning',
  },
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function asCurrency(amount: number): string {
  return amount.toFixed(2);
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function isPossiblyDeductible(category: string): boolean {
  return category === 'Transportation' || category === 'Bills' || category === 'Other';
}

export function buildTemplateCSV(expenses: Expense[], templateId: ExportTemplateId): string {
  const sorted = expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
  const today = toISODateString(new Date());

  if (templateId === 'tax_report') {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Deductible (Hint)', 'Notes'];
    const rows = sorted.map((e) => [
      e.date,
      escapeCSV(e.title),
      e.category,
      asCurrency(e.amount),
      isPossiblyDeductible(e.category) ? 'Maybe' : 'No',
      escapeCSV(e.notes || ''),
    ]);

    const total = sorted.reduce((sum, e) => sum + e.amount, 0);
    const deductible = sorted
      .filter((e) => isPossiblyDeductible(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const summaryRows = [
      [''],
      ['Summary', '', '', '', '', ''],
      ['Generated', today, '', '', '', ''],
      ['Total Spend', '', '', asCurrency(total), '', ''],
      ['Potentially Deductible', '', '', asCurrency(deductible), '', ''],
    ];

    return [headers.join(','), ...rows.map((r) => r.join(',')), ...summaryRows.map((r) => r.join(','))].join('\n');
  }

  if (templateId === 'monthly_summary') {
    const totalsByMonth = new Map<string, { total: number; counts: number; byCategory: Record<string, number> }>();
    for (const e of sorted) {
      const key = monthKey(e.date);
      const existing = totalsByMonth.get(key) || { total: 0, counts: 0, byCategory: {} };
      existing.total += e.amount;
      existing.counts += 1;
      existing.byCategory[e.category] = (existing.byCategory[e.category] || 0) + e.amount;
      totalsByMonth.set(key, existing);
    }

    const headers = ['Month', 'Total', 'Transactions', 'Top Category', 'Top Category Total'];
    const months = Array.from(totalsByMonth.keys()).sort((a, b) => b.localeCompare(a));
    const rows = months.map((m) => {
      const bucket = totalsByMonth.get(m)!;
      const top = Object.entries(bucket.byCategory).sort((a, b) => b[1] - a[1])[0];
      return [
        m,
        asCurrency(bucket.total),
        String(bucket.counts),
        top ? top[0] : '',
        top ? asCurrency(top[1]) : '',
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // category_analysis
  const totalsByCategory = new Map<string, { total: number; counts: number }>();
  for (const e of sorted) {
    const existing = totalsByCategory.get(e.category) || { total: 0, counts: 0 };
    existing.total += e.amount;
    existing.counts += 1;
    totalsByCategory.set(e.category, existing);
  }

  const grandTotal = sorted.reduce((sum, e) => sum + e.amount, 0) || 1;
  const headers = ['Category', 'Total', 'Transactions', 'Average', 'Share of Spend'];
  const rows = Array.from(totalsByCategory.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, bucket]) => [
      category,
      asCurrency(bucket.total),
      String(bucket.counts),
      asCurrency(bucket.total / Math.max(1, bucket.counts)),
      `${((bucket.total / grandTotal) * 100).toFixed(1)}%`,
    ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function buildDefaultFilename(templateId: ExportTemplateId, format: 'csv' | 'json' | 'pdf_mock'): string {
  const today = toISODateString(new Date());
  const slug =
    templateId === 'tax_report'
      ? 'tax-report'
      : templateId === 'monthly_summary'
        ? 'monthly-summary'
        : 'category-analysis';
  const ext = format === 'pdf_mock' ? 'pdf' : format;
  return `expense-export-${slug}-${today}.${ext}`;
}

