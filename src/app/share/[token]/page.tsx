'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Download, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useExpenses } from '@/hooks/useExpenses';
import { buildDefaultFilename, buildTemplateCSV, EXPORT_TEMPLATES } from '@/lib/exportTemplates';
import type { ShareRecord } from '@/types/cloudExport';

const STORAGE_SHARES = 'cloud-export-v3-shares';

function downloadText(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ShareExportPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const { expenses, isLoaded } = useExpenses();
  const [shares] = useLocalStorage<ShareRecord[]>(STORAGE_SHARES, []);

  const record = useMemo(() => shares.find((s) => s.token === token), [shares, token]);
  const template = useMemo(
    () => EXPORT_TEMPLATES.find((t) => t.id === record?.templateId),
    [record?.templateId]
  );

  if (!isLoaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse h-40" />
    );
  }

  if (!record || !token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <Link2 className="h-5 w-5 text-indigo-600" />
          Share link not found
        </div>
        <p className="text-sm text-slate-600 mt-2">
          This is a simulated share system backed by localStorage. Generate a new link from Export Studio.
        </p>
      </div>
    );
  }

  const createdAt = new Date(record.createdAt);
  const expiresAt = record.expiresAt ? new Date(record.expiresAt) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700">
          <Link2 className="h-3.5 w-3.5" />
          Shared export (mock)
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">{record.templateName}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Destination: {record.destinationLabel}
        </p>
        <div className="text-xs text-slate-500 mt-2">
          Created: {createdAt.toLocaleString()} {expiresAt ? `• Expires: ${expiresAt.toLocaleString()}` : ''}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const csv = buildTemplateCSV(expenses, record.templateId);
              const filename = buildDefaultFilename(record.templateId, 'csv');
              downloadText(filename, 'text/csv;charset=utf-8;', csv);
            }}
            disabled={expenses.length === 0}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">What this page simulates</h2>
        <p className="text-sm text-slate-600 mt-2">
          A real SaaS share link would be backed by a server token, access control, and immutable data snapshots.
          Here, we preview the UX and generate the export from your current local data.
        </p>
        {template && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">{template.name}</div>
            <div className="text-slate-600 mt-1">{template.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

