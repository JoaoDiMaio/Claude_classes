'use client';

import React, { useState, useEffect } from 'react';
import { Expense, ExpenseFormData, ExpenseFormErrors, CATEGORIES, Category } from '@/types/expense';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toISODateString } from '@/lib/utils';

interface ExpenseFormProps {
  editingExpense?: Expense | null;
  onSubmit: (data: ExpenseFormData) => void;
  onCancel: () => void;
}

const EMPTY_FORM: ExpenseFormData = {
  title: '',
  amount: '',
  category: 'Food',
  date: toISODateString(new Date()),
  notes: '',
};

function validate(data: ExpenseFormData): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < 2) {
    errors.title = 'Title must be at least 2 characters';
  } else if (data.title.trim().length > 60) {
    errors.title = 'Title must be 60 characters or less';
  }

  if (!data.amount) {
    errors.amount = 'Amount is required';
  } else {
    const num = parseFloat(data.amount);
    if (isNaN(num) || num <= 0) errors.amount = 'Amount must be a positive number';
    else if (num > 999999) errors.amount = 'Amount is too large';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  }

  if (data.notes.length > 200) {
    errors.notes = 'Notes must be 200 characters or less';
  }

  return errors;
}

export function ExpenseForm({ editingExpense, onSubmit, onCancel }: ExpenseFormProps) {
  const [form, setForm] = useState<ExpenseFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setForm({
        title: editingExpense.title,
        amount: editingExpense.amount.toString(),
        category: editingExpense.category,
        date: editingExpense.date,
        notes: editingExpense.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editingExpense]);

  function handleChange(field: keyof ExpenseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    onSubmit(form);
    setSubmitting(false);
  }

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Title"
        placeholder="e.g. Lunch at restaurant"
        value={form.title}
        onChange={(e) => handleChange('title', e.target.value)}
        error={errors.title}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          error={errors.amount}
          required
        />
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => handleChange('date', e.target.value)}
          error={errors.date}
          required
        />
      </div>

      <Select
        label="Category"
        value={form.category}
        onChange={(e) => handleChange('category', e.target.value as Category)}
        options={categoryOptions}
        error={errors.category}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Optional notes..."
          rows={3}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            transition-colors duration-150 resize-none
            ${errors.notes ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
        />
        {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
        <p className="text-xs text-slate-400 text-right">{form.notes.length}/200</p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className="flex-1">
          {editingExpense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
