export type ExportTemplateId = 'tax_report' | 'monthly_summary' | 'category_analysis';

export type ExportFormat = 'csv' | 'json' | 'pdf_mock';

export type ExportDestination =
  | { type: 'download' }
  | { type: 'email'; to: string; subject?: string }
  | { type: 'google_sheets'; spreadsheetName: string; sheetName: string }
  | { type: 'cloud_vault'; folder: string }
  | { type: 'dropbox'; folder: string }
  | { type: 'onedrive'; folder: string };

export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExportHistoryItem {
  id: string;
  createdAt: string;
  templateId: ExportTemplateId;
  templateName: string;
  destinationLabel: string;
  destinationType: ExportDestination['type'];
  format: ExportFormat;
  status: ExportStatus;
  progress: number; // 0-100
  shareToken?: string;
  details?: Record<string, string>;
}

export type IntegrationStatus = 'disconnected' | 'syncing' | 'synced' | 'error';

export type IntegrationId =
  | 'google'
  | 'dropbox'
  | 'onedrive'
  | 'slack'
  | 'zapier'
  | 'notion';

export interface IntegrationState {
  id: IntegrationId;
  name: string;
  connected: boolean;
  status: IntegrationStatus;
  accountLabel?: string;
  lastSyncAt?: string;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ExportSchedule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  timeOfDay: string; // HH:mm (local)
  dayOfWeek?: number; // 0 (Sun) - 6 (Sat)
  dayOfMonth?: number; // 1-28
  templateId: ExportTemplateId;
  format: ExportFormat;
  destination: ExportDestination;
}

export interface ShareRecord {
  token: string;
  createdAt: string;
  templateId: ExportTemplateId;
  templateName: string;
  destinationLabel: string;
  expiresAt?: string;
  note?: string;
}

