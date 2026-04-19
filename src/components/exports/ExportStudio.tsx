'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Check,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  PlugZap,
  RefreshCw,
  Sheet,
  UploadCloud,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useExpenses } from '@/hooks/useExpenses';
import { cn, formatDate, generateId } from '@/lib/utils';
import { buildDefaultFilename, buildTemplateCSV, EXPORT_TEMPLATES } from '@/lib/exportTemplates';
import type {
  ExportDestination,
  ExportFormat,
  ExportHistoryItem,
  ExportSchedule,
  ExportStatus,
  ExportTemplateId,
  IntegrationId,
  IntegrationState,
  ScheduleFrequency,
  ShareRecord,
} from '@/types/cloudExport';
import { MockQr } from '@/components/exports/MockQr';

const STORAGE = {
  history: 'cloud-export-v3-history',
  integrations: 'cloud-export-v3-integrations',
  schedules: 'cloud-export-v3-schedules',
  shares: 'cloud-export-v3-shares',
} as const;

const INTEGRATION_DEFAULTS: IntegrationState[] = [
  { id: 'google', name: 'Google (Sheets)', connected: false, status: 'disconnected' },
  { id: 'dropbox', name: 'Dropbox', connected: false, status: 'disconnected' },
  { id: 'onedrive', name: 'OneDrive', connected: false, status: 'disconnected' },
  { id: 'notion', name: 'Notion', connected: false, status: 'disconnected' },
  { id: 'slack', name: 'Slack', connected: false, status: 'disconnected' },
  { id: 'zapier', name: 'Zapier', connected: false, status: 'disconnected' },
];

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function statusPill(status: ExportStatus): { label: string; className: string } {
  if (status === 'completed') return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'failed') return { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200' };
  if (status === 'processing') return { label: 'Processing', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  return { label: 'Queued', className: 'bg-slate-50 text-slate-700 border-slate-200' };
}

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

function isConnected(integrations: IntegrationState[], id: IntegrationId): boolean {
  return integrations.some((i) => i.id === id && i.connected);
}

function destinationLabel(destination: ExportDestination): string {
  switch (destination.type) {
    case 'download':
      return 'Instant Download';
    case 'email':
      return `Email to ${destination.to}`;
    case 'google_sheets':
      return `Google Sheets: ${destination.spreadsheetName}`;
    case 'cloud_vault':
      return `Cloud Vault: ${destination.folder}`;
    case 'dropbox':
      return `Dropbox: ${destination.folder}`;
    case 'onedrive':
      return `OneDrive: ${destination.folder}`;
    default:
      return 'Export';
  }
}

function computeNextRun(schedule: ExportSchedule, now = new Date()): Date {
  const [hh, mm] = schedule.timeOfDay.split(':').map((v) => parseInt(v, 10));
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);

  const isInPast = candidate.getTime() <= now.getTime();

  if (schedule.frequency === 'daily') {
    if (isInPast) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (schedule.frequency === 'weekly') {
    const target = schedule.dayOfWeek ?? 1;
    const delta = (target - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta + (delta === 0 && isInPast ? 7 : 0));
    return candidate;
  }

  const day = Math.min(Math.max(1, schedule.dayOfMonth ?? 1), 28);
  candidate.setDate(day);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1, day);
  }
  return candidate;
}

export function ExportStudio() {
  const { expenses, isLoaded } = useExpenses();
  const [history, setHistory] = useLocalStorage<ExportHistoryItem[]>(STORAGE.history, []);
  const [integrations, setIntegrations] = useLocalStorage<IntegrationState[]>(STORAGE.integrations, []);
  const [schedules, setSchedules] = useLocalStorage<ExportSchedule[]>(STORAGE.schedules, []);
  const [, setShares] = useLocalStorage<ShareRecord[]>(STORAGE.shares, []);

  const timersRef = useRef(new Map<string, number>());
  const [tab, setTab] = useState<'create' | 'integrations' | 'schedules' | 'history'>('create');

  const [templateId, setTemplateId] = useState<ExportTemplateId>('monthly_summary');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [destinationType, setDestinationType] = useState<ExportDestination['type']>('cloud_vault');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Your Expense Export');
  const [spreadsheetName, setSpreadsheetName] = useState('ExpenseTracker — Exports');
  const [sheetName, setSheetName] = useState('Monthly Summary');
  const [folder, setFolder] = useState('/Exports');
  const [autoShare, setAutoShare] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const [connectModal, setConnectModal] = useState<{ open: boolean; id: IntegrationId | null }>({ open: false, id: null });
  const [connectBusy, setConnectBusy] = useState(false);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('Weekly Backup');
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('weekly');
  const [scheduleTimeOfDay, setScheduleTimeOfDay] = useState('09:00');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleDestinationType, setScheduleDestinationType] = useState<ExportDestination['type']>('cloud_vault');

  const selectedTemplate = useMemo(
    () => EXPORT_TEMPLATES.find((t) => t.id === templateId) ?? EXPORT_TEMPLATES[0],
    [templateId]
  );

  useEffect(() => {
    if (integrations.length > 0) return;
    setIntegrations(INTEGRATION_DEFAULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const item of history) {
      if ((item.status === 'queued' || item.status === 'processing') && item.progress < 100) {
        if (timersRef.current.has(item.id)) continue;
        const handle = window.setInterval(() => {
          setHistory((prev) =>
            prev.map((p) => {
              if (p.id !== item.id) return p;
              const delta = p.status === 'queued' ? 12 : 8;
              const bumped = Math.min(100, p.progress + delta);
              const nextStatus: ExportStatus = bumped >= 100 ? 'completed' : 'processing';
              return { ...p, progress: bumped, status: nextStatus };
            })
          );
        }, 420);
        timersRef.current.set(item.id, handle);
      }
    }

    for (const [id, handle] of timersRef.current.entries()) {
      const it = history.find((h) => h.id === id);
      if (!it || it.status === 'completed' || it.status === 'failed' || it.progress >= 100) {
        window.clearInterval(handle);
        timersRef.current.delete(id);
      }
    }
  }, [history, setHistory]);

  useEffect(() => {
    return () => {
      for (const handle of timersRef.current.values()) window.clearInterval(handle);
      timersRef.current.clear();
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-pulse">
        <div className="rounded-2xl border border-slate-200 bg-white h-40" />
        <div className="rounded-2xl border border-slate-200 bg-white h-72" />
      </div>
    );
  }

  function buildDestination(): ExportDestination {
    if (destinationType === 'download') return { type: 'download' };
    if (destinationType === 'email') return { type: 'email', to: emailTo.trim(), subject: emailSubject.trim() || undefined };
    if (destinationType === 'google_sheets') {
      return {
        type: 'google_sheets',
        spreadsheetName: spreadsheetName.trim() || 'Expense Exports',
        sheetName: sheetName.trim() || 'Sheet1',
      };
    }
    if (destinationType === 'dropbox') return { type: 'dropbox', folder: folder.trim() || '/Exports' };
    if (destinationType === 'onedrive') return { type: 'onedrive', folder: folder.trim() || '/Exports' };
    return { type: 'cloud_vault', folder: folder.trim() || '/Exports' };
  }

  function validateDestination(destination: ExportDestination): string | null {
    if (expenses.length === 0) return 'Add at least one expense to export.';
    if (destination.type === 'email' && !destination.to) return 'Add at least one recipient email.';
    if (destination.type === 'google_sheets' && !isConnected(integrations, 'google')) return 'Connect Google to export to Sheets.';
    if (destination.type === 'dropbox' && !isConnected(integrations, 'dropbox')) return 'Connect Dropbox to export to Dropbox.';
    if (destination.type === 'onedrive' && !isConnected(integrations, 'onedrive')) return 'Connect OneDrive to export to OneDrive.';
    return null;
  }

  function enqueueExport(destination: ExportDestination, opts?: { autoShare?: boolean }) {
    const id = generateId();
    const item: ExportHistoryItem = {
      id,
      createdAt: new Date().toISOString(),
      templateId,
      templateName: selectedTemplate.name,
      destinationType: destination.type,
      destinationLabel: destinationLabel(destination),
      format,
      status: 'queued',
      progress: 0,
      details:
        destination.type === 'email'
          ? { To: destination.to, Subject: destination.subject || '—' }
          : destination.type === 'google_sheets'
            ? { Spreadsheet: destination.spreadsheetName, Sheet: destination.sheetName }
            : destination.type === 'download'
              ? { Delivery: 'Browser download' }
              : { Folder: destination.folder },
    };

    setHistory((prev) => [item, ...prev].slice(0, 40));

    if (!opts?.autoShare) return;
    window.setTimeout(() => {
      setHistory((prev) => {
        const now = prev.find((p) => p.id === id);
        if (!now || now.status !== 'completed' || now.shareToken) return prev;
        const token = generateId();
        const record: ShareRecord = {
          token,
          createdAt: new Date().toISOString(),
          templateId: now.templateId,
          templateName: now.templateName,
          destinationLabel: now.destinationLabel,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          note: 'Public link (mock) — behaves like a real SaaS share page.',
        };
        setShares((s) => [record, ...s].slice(0, 50));
        return prev.map((p) => (p.id === id ? { ...p, shareToken: token } : p));
      });
    }, 2600);
  }

  function startExport() {
    const destination = buildDestination();
    const err = validateDestination(destination);
    if (err) {
      setCreateError(err);
      return;
    }
    setCreateError(null);
    enqueueExport(destination, { autoShare });
    setTab('history');
  }

  async function connectIntegration(id: IntegrationId) {
    setConnectBusy(true);
    setIntegrations((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'syncing' } : p)));
    window.setTimeout(() => {
      const label =
        id === 'google'
          ? 'workspace@demo.com'
          : id === 'dropbox'
            ? 'Dropbox Team (Demo)'
            : id === 'onedrive'
              ? 'OneDrive Personal (Demo)'
              : id === 'notion'
                ? 'Notion Workspace (Demo)'
                : id === 'slack'
                  ? 'Slack Workspace (Demo)'
                  : 'Zapier (Demo)';
      setIntegrations((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, connected: true, status: 'synced', accountLabel: label, lastSyncAt: new Date().toISOString() }
            : p
        )
      );
      setConnectBusy(false);
      setConnectModal({ open: false, id: null });
    }, 1100);
  }

  function disconnectIntegration(id: IntegrationId) {
    setIntegrations((prev) =>
      prev.map((p) => (p.id === id ? { ...p, connected: false, status: 'disconnected', accountLabel: undefined } : p))
    );
  }

  function triggerDownload(item: ExportHistoryItem) {
    if (item.format === 'json') {
      const filename = buildDefaultFilename(item.templateId, 'json');
      downloadText(filename, 'application/json;charset=utf-8;', JSON.stringify(expenses, null, 2));
      return;
    }
    if (item.format === 'pdf_mock') {
      const filename = buildDefaultFilename(item.templateId, 'pdf_mock');
      const text =
        `ExpenseTracker Export (Mock PDF)\n\n` +
        `Template: ${item.templateName}\n` +
        `Generated: ${new Date().toLocaleString()}\n\n` +
        `This is a simulated PDF export. In a real SaaS flow, we'd render a PDF server-side.\n`;
      downloadText(filename, 'application/pdf', text);
      return;
    }
    const filename = buildDefaultFilename(item.templateId, 'csv');
    const csv = buildTemplateCSV(expenses, item.templateId);
    downloadText(filename, 'text/csv;charset=utf-8;', csv);
  }

  function ensureShare(item: ExportHistoryItem) {
    if (item.shareToken) {
      setShareToken(item.shareToken);
      return;
    }
    const token = generateId();
    const record: ShareRecord = {
      token,
      createdAt: new Date().toISOString(),
      templateId: item.templateId,
      templateName: item.templateName,
      destinationLabel: item.destinationLabel,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      note: 'Public link (mock).',
    };
    setShares((s) => [record, ...s].slice(0, 50));
    setHistory((prev) => prev.map((p) => (p.id === item.id ? { ...p, shareToken: token } : p)));
    setShareToken(token);
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  function createSchedule() {
    const destination: ExportDestination =
      scheduleDestinationType === 'download'
        ? { type: 'download' }
        : scheduleDestinationType === 'google_sheets'
          ? { type: 'google_sheets', spreadsheetName, sheetName }
          : scheduleDestinationType === 'dropbox'
            ? { type: 'dropbox', folder }
            : scheduleDestinationType === 'onedrive'
              ? { type: 'onedrive', folder }
              : { type: 'cloud_vault', folder };

    const schedule: ExportSchedule = {
      id: generateId(),
      name: scheduleName.trim() || 'Scheduled Export',
      enabled: scheduleEnabled,
      frequency: scheduleFrequency,
      timeOfDay: scheduleTimeOfDay,
      dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : undefined,
      dayOfMonth: scheduleFrequency === 'monthly' ? scheduleDayOfMonth : undefined,
      templateId,
      format,
      destination,
    };

    setSchedules((prev) => [schedule, ...prev].slice(0, 20));
    setScheduleModalOpen(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700">
            <UploadCloud className="h-3.5 w-3.5" />
            Cloud-integrated export system (v3)
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Export Studio</h1>
          <p className="text-sm text-slate-600 mt-1">
            Integration-first exports with sharing, scheduling, and history — modeled after modern SaaS apps.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Expenses</div>
          <div className="text-lg font-semibold text-slate-900">{expenses.length}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        {(
          [
            { id: 'create', label: 'Create Export', icon: Cloud },
            { id: 'integrations', label: 'Integrations', icon: PlugZap },
            { id: 'schedules', label: 'Scheduling', icon: CalendarClock },
            { id: 'history', label: 'History', icon: RefreshCw },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
              tab === t.id
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Create Export</h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose a template, connect a destination, then simulate background processing + sharing.
            </p>

            {createError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as ExportTemplateId)}
                options={EXPORT_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
              />
              <Select
                label="Format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                options={[
                  { value: 'csv', label: 'CSV (downloadable)' },
                  { value: 'json', label: 'JSON (developer-friendly)' },
                  { value: 'pdf_mock', label: 'PDF (mock)' },
                ]}
              />
              <Select
                label="Destination"
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value as ExportDestination['type'])}
                options={[
                  { value: 'cloud_vault', label: 'Cloud Vault (mock storage)' },
                  { value: 'email', label: 'Email (simulated flow)' },
                  { value: 'google_sheets', label: 'Google Sheets (mock integration)' },
                  { value: 'dropbox', label: 'Dropbox (mock integration)' },
                  { value: 'onedrive', label: 'OneDrive (mock integration)' },
                  { value: 'download', label: 'Instant Download (local)' },
                ]}
              />
              {(destinationType === 'cloud_vault' || destinationType === 'dropbox' || destinationType === 'onedrive') && (
                <Input
                  label="Folder"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  hint="Simulated path (e.g., /Exports/2026)."
                />
              )}
              {destinationType === 'email' && (
                <>
                  <Input
                    label="To"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="alex@company.com, finance@company.com"
                    hint="Simulated email delivery flow."
                  />
                  <Input
                    label="Subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </>
              )}
              {destinationType === 'google_sheets' && (
                <>
                  <Input
                    label="Spreadsheet name"
                    value={spreadsheetName}
                    onChange={(e) => setSpreadsheetName(e.target.value)}
                  />
                  <Input
                    label="Sheet tab"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </>
              )}
            </div>

            {destinationType === 'google_sheets' && !isConnected(integrations, 'google') && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-700">
                    Google isn’t connected yet. Connect to enable Sheets export (mock OAuth flow).
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setConnectModal({ open: true, id: 'google' })}>
                    Connect Google
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoShare}
                  onChange={(e) => setAutoShare(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Auto-generate share link + QR
              </label>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setScheduleModalOpen(true)}>
                  <CalendarClock className="h-4 w-4" />
                  Schedule
                </Button>
                <Button variant="primary" size="sm" onClick={startExport} disabled={expenses.length === 0}>
                  <UploadCloud className="h-4 w-4" />
                  Start Export
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{selectedTemplate.name}</div>
              <div className="text-sm text-slate-600 mt-1">{selectedTemplate.description}</div>
              <div className="text-xs text-slate-500 mt-2">Best for: {selectedTemplate.bestFor}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Quick Cloud Actions</h2>
            <p className="text-sm text-slate-500 mt-1">Designed to feel like a modern “connected” service.</p>

            <div className="mt-4 flex flex-col gap-3">
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => { setDestinationType('email'); setTab('create'); }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Email Export</div>
                    <div className="text-sm text-slate-600 mt-1">Simulated send flow with status tracking.</div>
                  </div>
                </div>
              </button>

              <button
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => { setDestinationType('google_sheets'); setTab('create'); }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <Sheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Google Sheets</div>
                    <div className="text-sm text-slate-600 mt-1">Mock OAuth → spreadsheet → permissions flow.</div>
                  </div>
                </div>
              </button>

              <button
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setTab('history')}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Share Links + QR</div>
                    <div className="text-sm text-slate-600 mt-1">Generate shareable links from completed exports.</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Integrations (Mock)</h2>
              <p className="text-sm text-slate-500 mt-1">
                Dropbox, OneDrive, Google Sheets, and “workflow tools” to make exports feel connected.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setIntegrations((prev) =>
                  prev.map((p) => (p.connected ? { ...p, lastSyncAt: new Date().toISOString(), status: 'synced' } : p))
                )
              }
            >
              <RefreshCw className="h-4 w-4" />
              Sync
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((i) => (
              <div key={i.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{i.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {i.connected ? i.accountLabel || 'Connected' : 'Not connected'}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded-full border',
                      i.status === 'synced'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : i.status === 'syncing'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : i.status === 'error'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        i.status === 'synced'
                          ? 'bg-emerald-500'
                          : i.status === 'syncing'
                            ? 'bg-indigo-500'
                            : i.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-slate-400'
                      )}
                    />
                    {i.status}
                  </span>
                </div>

                <div className="text-sm text-slate-600">
                  {i.id === 'google'
                    ? 'Export to Sheets and keep a live backup tab.'
                    : i.id === 'dropbox'
                      ? 'Store exports in a team folder with version history.'
                      : i.id === 'onedrive'
                        ? 'Sync exports to Microsoft 365 (mock).'
                        : i.id === 'notion'
                          ? 'Publish exports into a Notion database (mock).'
                          : i.id === 'slack'
                            ? 'Post export notifications to channels (mock).'
                            : 'Trigger automation chains for workflows (mock).'}
                </div>

                <div className="mt-auto flex items-center gap-2">
                  {i.connected ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => disconnectIntegration(i.id)}>
                        Disconnect
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConnectModal({ open: true, id: i.id })}>
                        Manage
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setConnectModal({ open: true, id: i.id })}>
                      Connect
                    </Button>
                  )}
                </div>

                {i.lastSyncAt && (
                  <div className="text-xs text-slate-500">
                    Last sync: {formatDate(i.lastSyncAt)} at {formatTime(i.lastSyncAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Automatic Backups</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure recurring exports (daily/weekly/monthly). This simulates background scheduling.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScheduleModalOpen(true)}>
              <CalendarClock className="h-4 w-4" />
              New Schedule
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {schedules.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No schedules yet. Create one to simulate recurring cloud exports.
              </div>
            ) : (
              schedules.map((s) => {
                const nextRun = computeNextRun(s);
                return (
                  <div key={s.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', s.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200')}>
                          {s.enabled ? 'Enabled' : 'Paused'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Template: {EXPORT_TEMPLATES.find((t) => t.id === s.templateId)?.name || s.templateId} • Destination:{' '}
                        {destinationLabel(s.destination)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Next run: {formatDate(nextRun.toISOString())} at {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(nextRun)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setTemplateId(s.templateId);
                          setFormat(s.format);
                          enqueueExport(s.destination, { autoShare: true });
                          setTab('history');
                        }}
                        disabled={!s.enabled}
                      >
                        Run now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSchedules((prev) => prev.map((p) => (p.id === s.id ? { ...p, enabled: !p.enabled } : p)))}
                      >
                        {s.enabled ? 'Pause' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSchedules((prev) => prev.filter((p) => p.id !== s.id))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Export History</h2>
              <p className="text-sm text-slate-500 mt-1">
                Previous exports with timestamps, status, share links, and re-download actions.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setHistory([])} disabled={history.length === 0}>
              Clear
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Template</th>
                  <th className="py-2 pr-4 font-medium">Destination</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Progress</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-600">
                      No exports yet. Create one to see history, timestamps, and share links.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => {
                    const pill = statusPill(h.status);
                    return (
                      <tr key={h.id} className="text-slate-700">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{formatDate(h.createdAt)}</div>
                          <div className="text-xs text-slate-500">{formatTime(h.createdAt)}</div>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">{h.templateName}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">{h.destinationLabel}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-xs', pill.className)}>
                            {h.status === 'processing' ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {pill.label}
                              </span>
                            ) : (
                              pill.label
                            )}
                          </span>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <div className="w-40">
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              <div
                                className={cn('h-full rounded-full transition-all', h.status === 'failed' ? 'bg-red-500' : 'bg-indigo-600')}
                                style={{ width: `${Math.max(0, Math.min(100, h.progress))}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{h.progress}%</div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => triggerDownload(h)}
                              disabled={h.status !== 'completed'}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => ensureShare(h)}
                              disabled={h.status !== 'completed'}
                            >
                              <Link2 className="h-4 w-4" />
                              Share
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistory((prev) => prev.filter((p) => p.id !== h.id))}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!shareToken}
        onClose={() => setShareToken(null)}
        title="Share Export"
        maxWidth="max-w-2xl"
      >
        {shareToken && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Shareable Link</div>
              <div className="text-sm text-slate-600 mt-1">
                Public page inside the app (mock). In a real SaaS: ACLs, token scopes, and immutable snapshots.
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 truncate">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}`}
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyShareLink(shareToken)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <a
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
                  href={`/share/${shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">QR Preview (Mock)</div>
                <div className="text-xs text-slate-500 mt-1">Looks like a QR; not guaranteed to be scannable.</div>
                <div className="mt-3">
                  <MockQr token={shareToken} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Sharing Controls (Mock)</div>
                <div className="mt-2 text-sm text-slate-600 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>Anyone with link</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Expiry</span>
                    <span className="text-xs text-slate-500">14 days (simulated)</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Require sign-in</span>
                    <span className="text-xs text-slate-500">Off</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Watermark</span>
                    <span className="text-xs text-slate-500">Off</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShareToken(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Automatic Export"
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
            <Select
              label="Frequency"
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            <Input label="Time" type="time" value={scheduleTimeOfDay} onChange={(e) => setScheduleTimeOfDay(e.target.value)} />
            <Select
              label="Template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as ExportTemplateId)}
              options={EXPORT_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
            />

            {scheduleFrequency === 'weekly' && (
              <Select
                label="Day of week"
                value={String(scheduleDayOfWeek)}
                onChange={(e) => setScheduleDayOfWeek(parseInt(e.target.value, 10))}
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '2', label: 'Tuesday' },
                  { value: '3', label: 'Wednesday' },
                  { value: '4', label: 'Thursday' },
                  { value: '5', label: 'Friday' },
                  { value: '6', label: 'Saturday' },
                  { value: '0', label: 'Sunday' },
                ]}
              />
            )}
            {scheduleFrequency === 'monthly' && (
              <Select
                label="Day of month"
                value={String(scheduleDayOfMonth)}
                onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value, 10))}
                options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
              />
            )}

            <Select
              label="Destination"
              value={scheduleDestinationType}
              onChange={(e) => setScheduleDestinationType(e.target.value as ExportDestination['type'])}
              options={[
                { value: 'cloud_vault', label: 'Cloud Vault (recommended)' },
                { value: 'google_sheets', label: 'Google Sheets' },
                { value: 'dropbox', label: 'Dropbox' },
                { value: 'onedrive', label: 'OneDrive' },
                { value: 'download', label: 'Instant Download (local)' },
              ]}
            />
            {(scheduleDestinationType === 'cloud_vault' || scheduleDestinationType === 'dropbox' || scheduleDestinationType === 'onedrive') && (
              <Input label="Folder" value={folder} onChange={(e) => setFolder(e.target.value)} />
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Enabled
            </label>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={createSchedule}>
                <CalendarClock className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={connectModal.open}
        onClose={() => setConnectModal({ open: false, id: null })}
        title="Connect Integration"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              {connectModal.id ? integrations.find((i) => i.id === connectModal.id)?.name : 'Integration'}
            </div>
            <div className="text-slate-600 mt-1">
              Mock OAuth flow: authorize → select workspace → grant permissions → sync status updates.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => (connectModal.id ? connectIntegration(connectModal.id) : undefined)}
              loading={connectBusy}
              disabled={!connectModal.id}
            >
              <Check className="h-4 w-4" />
              Authorize
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConnectModal({ open: false, id: null })}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
