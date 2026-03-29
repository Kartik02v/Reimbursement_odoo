'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Expense, Notification, ApprovalWorkflow, ExpenseCategory, User, AuditLog } from './types';
import { useAuth } from './auth-context';

interface ExpenseContextType {
  expenses: Expense[];
  notifications: Notification[];
  workflows: ApprovalWorkflow[];
  categories: ExpenseCategory[];
  users: User[];
  auditLog: AuditLog[];
  isLoading: boolean;
  createExpense: (expense: any) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  submitExpense: (id: string) => Promise<void>;
  approveExpense: (id: string, comment?: string) => Promise<void>;
  rejectExpense: (id: string, reason: string) => Promise<void>;
  resubmitExpense: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getExpensesByUser: (userId: string) => Expense[];
  getPendingApprovalsForUser: (userId: string) => Expense[];
  refreshData: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch expenses
      const expensesRes = await fetch('/api/expenses');
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData.data || []);
      }

      // Fetch categories
      const categoriesRes = await fetch('/api/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.data || []);
      }

      // Fetch users (only for admin and managers)
      if (user.role === 'admin' || user.role === 'manager') {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data || []);
        }
      }

      // Fetch notifications
      const notificationsRes = await fetch(`/api/notifications?userId=${user.id}`);
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.data || []);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createExpense = async (expenseData: any) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          userId: user.id,
        }),
      });

      if (response.ok) {
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Create expense error:', error);
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update expense');
      }
    } catch (error) {
      console.error('Update expense error:', error);
      throw error;
    }
  };

  const submitExpense = async (id: string) => {
    await updateExpense(id, { status: 'pending' });
  };

  const approveExpense = async (id: string, comment?: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: id,
          approved: true,
          comments: comment,
          approverId: user.id,
        }),
      });

      if (response.ok) {
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to approve expense');
      }
    } catch (error) {
      console.error('Approve expense error:', error);
      throw error;
    }
  };

  const rejectExpense = async (id: string, reason: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: id,
          approved: false,
          comments: reason,
          approverId: user.id,
        }),
      });

      if (response.ok) {
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to reject expense');
      }
    } catch (error) {
      console.error('Reject expense error:', error);
      throw error;
    }
  };

  const resubmitExpense = async (id: string) => {
    await updateExpense(id, { status: 'draft' });
  };

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Delete expense error:', error);
      throw error;
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: [id],
          userId: user?.id,
        }),
      });
      await refreshData();
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationIds: unreadIds,
            userId: user.id,
          }),
        });
        await refreshData();
      }
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  const getExpensesByUser = useCallback((userId: string) => {
    return expenses.filter(exp => exp.submittedBy === userId);
  }, [expenses]);

  const getPendingApprovalsForUser = useCallback((userId: string) => {
    return expenses.filter(exp => exp.status === 'pending');
  }, [expenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        notifications,
        workflows,
        categories,
        users,
        auditLog,
        isLoading,
        createExpense,
        updateExpense,
        submitExpense,
        approveExpense,
        rejectExpense,
        resubmitExpense,
        deleteExpense,
        markNotificationRead,
        markAllNotificationsRead,
        getExpensesByUser,
        getPendingApprovalsForUser,
        refreshData,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}
