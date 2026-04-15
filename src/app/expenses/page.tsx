'use client';

import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Expense, ExpenseFormData } from '@/types/expense';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { DeleteConfirmModal } from '@/components/expenses/DeleteConfirmModal';
import { useExpenses } from '@/hooks/useExpenses';

export default function ExpensesPage() {
  const { filteredExpenses, isLoaded, addExpense, updateExpense, deleteExpense, exportCSV } =
    useExpenses();

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  function handleAdd() {
    setEditingExpense(null);
    setFormOpen(true);
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  function handleFormSubmit(data: ExpenseFormData) {
    if (editingExpense) {
      updateExpense(editingExpense.id, data);
    } else {
      addExpense(data);
    }
    setFormOpen(false);
    setEditingExpense(null);
  }

  function handleDeleteConfirm() {
    if (deletingExpense) {
      deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track your expenses</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters />

      {/* List */}
      <ExpenseList
        expenses={filteredExpenses}
        onEdit={handleEdit}
        onDelete={setDeletingExpense}
        isLoaded={isLoaded}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingExpense(null); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          editingExpense={editingExpense}
          onSubmit={handleFormSubmit}
          onCancel={() => { setFormOpen(false); setEditingExpense(null); }}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        expense={deletingExpense}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
}
