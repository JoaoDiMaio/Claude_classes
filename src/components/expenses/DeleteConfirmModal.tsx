'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';

interface DeleteConfirmModalProps {
  expense: Expense | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ expense, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={!!expense} onClose={onCancel} title="Delete Expense">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-red-100 rounded-full">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-slate-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">{expense?.title}</span>
            {' '}({formatCurrency(expense?.amount ?? 0)})?
          </p>
          <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
