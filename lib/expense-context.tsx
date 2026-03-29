'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Expense, Notification, ApprovalWorkflow, ExpenseCategory, User, ApprovalHistoryItem, AuditLog, AuditActionType, AuditEntityType, UserPermissions } from './types';
import { mockExpenses, mockNotifications, mockWorkflows, mockCategories, mockUsers, convertCurrency } from './mock-data';
import { useAuth } from './auth-context';

interface ExpenseContextType {
  expenses: Expense[];
  notifications: Notification[];
  workflows: ApprovalWorkflow[];
  categories: ExpenseCategory[];
  users: User[];
  auditLog: AuditLog[];
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory' | 'currentStepIndex'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  submitExpense: (id: string) => void;
  approveExpense: (id: string, comment?: string) => void;
  rejectExpense: (id: string, reason: string) => void;
  resubmitExpense: (id: string) => void;
  deleteExpense: (id: string) => void;
  adminApproveExpense: (id: string, comment: string, overrideType?: 'FORCE_APPROVE') => void;
  adminRejectExpense: (id: string, reason: string, overrideType?: 'FORCE_REJECT') => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  getExpensesByUser: (userId: string) => Expense[];
  getPendingApprovalsForUser: (userId: string) => Expense[];
  getAuditLog: () => AuditLog[];
  createWorkflow: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorkflow: (id: string, updates: Partial<ApprovalWorkflow>) => void;
  deleteWorkflow: (id: string) => void;
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  updateUserPermissions: (id: string, permissions: UserPermissions) => void;
  deleteUser: (id: string) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { user, company } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>(mockWorkflows);
  const [categories] = useState<ExpenseCategory[]>(mockCategories);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);

  // Helper: emit an audit event
  const logAuditEvent = useCallback((
    actionType: AuditActionType,
    entityType: AuditEntityType,
    entityId: string,
    entityName: string,
    options?: { comment?: string; overrideType?: 'FORCE_APPROVE' | 'FORCE_REJECT'; oldValue?: string; newValue?: string }
  ) => {
    if (!user || !company) return;
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      companyId: company.id,
      userId: user.id,
      userName: user.name,
      actionType,
      entityType,
      entityId,
      entityName,
      comment: options?.comment,
      overrideType: options?.overrideType,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      timestamp: new Date(),
    };
    setAuditLog(prev => [entry, ...prev]);
  }, [user, company]);

  const createExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory' | 'currentStepIndex'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      currentStepIndex: 0,
      approvalHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExpenses(prev => [...prev, newExpense]);
    logAuditEvent('EXPENSE_CREATED', 'Expense', newExpense.id, newExpense.title);
  }, [logAuditEvent]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => {
      const existing = prev.find(e => e.id === id);
      if (existing) {
        logAuditEvent('EXPENSE_EDITED', 'Expense', id, existing.title, {
          oldValue: JSON.stringify({ amount: existing.amount, title: existing.title }),
          newValue: JSON.stringify({ amount: updates.amount ?? existing.amount, title: updates.title ?? existing.title }),
        });
      }
      return prev.map(exp => exp.id === id ? { ...exp, ...updates, updatedAt: new Date() } : exp);
    });
  }, [logAuditEvent]);

  const submitExpense = useCallback((id: string) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      
      // Find appropriate workflow based on conditions
      let selectedWorkflow = workflows.find(w => w.isDefault);
      
      for (const workflow of workflows) {
        if (workflow.conditions) {
          const matches = workflow.conditions.every(condition => {
            switch (condition.field) {
              case 'amount':
                if (condition.operator === 'gt') return exp.amount > (condition.value as number);
                if (condition.operator === 'lt') return exp.amount < (condition.value as number);
                return exp.amount === condition.value;
              case 'category':
                return exp.category === condition.value;
              default:
                return true;
            }
          });
          if (matches) {
            selectedWorkflow = workflow;
            break;
          }
        }
      }
      
      // Convert currency if needed
      const convertedAmount = company 
        ? convertCurrency(exp.amount, exp.currency, company.country.currency.code)
        : exp.amount;
      
      return {
        ...exp,
        status: 'pending' as const,
        workflowId: selectedWorkflow?.id,
        convertedAmount,
        updatedAt: new Date(),
      };
    }));

    // Create notification for approvers
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      const submitter = users.find(u => u.id === expense.submittedBy);
      if (submitter?.managerId) {
        const newNotification: Notification = {
          id: `notif-${Date.now()}`,
          userId: submitter.managerId,
          type: 'pending_approval',
          title: 'New Expense Pending',
          message: `${submitter.name} submitted "${expense.title}" for approval.`,
          read: false,
          relatedExpenseId: id,
          createdAt: new Date(),
        };
        setNotifications(prev => [...prev, newNotification]);
      }
    }
    // Emit audit event
    const exp = expenses.find(e => e.id === id);
    if (exp) logAuditEvent('EXPENSE_SUBMITTED', 'Expense', id, exp.title);
  }, [expenses, workflows, users, company, logAuditEvent]);

  const approveExpense = useCallback((id: string, comment?: string) => {
    if (!user) return;
    
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      
      const workflow = workflows.find(w => w.id === exp.workflowId);
      const currentStep = workflow?.steps[exp.currentStepIndex];
      
      const newHistoryItem: ApprovalHistoryItem = {
        stepIndex: exp.currentStepIndex,
        approverId: user.id,
        approverName: user.name,
        status: 'approved',
        comment,
        timestamp: new Date(),
      };
      
      const newHistory = [...exp.approvalHistory, newHistoryItem];
      const nextStepIndex = exp.currentStepIndex + 1;
      const isLastStep = !workflow || nextStepIndex >= workflow.steps.length;
      
      // Check for auto-approve conditions
      let autoApprove = false;
      if (currentStep?.autoApproveConditions) {
        autoApprove = currentStep.autoApproveConditions.some(condition => {
          if (condition.type === 'specific_approver' && condition.approverId === user.id) {
            return true;
          }
          return false;
        });
      }
      
      return {
        ...exp,
        status: isLastStep || autoApprove ? 'approved' as const : 'pending' as const,
        currentStepIndex: isLastStep ? exp.currentStepIndex : nextStepIndex,
        approvalHistory: newHistory,
        updatedAt: new Date(),
      };
    }));

    // Create notification for expense owner
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        userId: expense.submittedBy,
        type: 'expense_approved',
        title: 'Expense Approved',
        message: `Your expense "${expense.title}" has been approved by ${user.name}.`,
        read: false,
        relatedExpenseId: id,
        createdAt: new Date(),
      };
      setNotifications(prev => [...prev, newNotification]);
    }
    // Audit
    const exp2 = expenses.find(e => e.id === id);
    if (exp2) logAuditEvent('EXPENSE_APPROVED', 'Expense', id, exp2.title, { comment });
  }, [user, workflows, expenses, logAuditEvent]);

  const rejectExpense = useCallback((id: string, reason: string) => {
    if (!user) return;
    
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      
      const newHistoryItem: ApprovalHistoryItem = {
        stepIndex: exp.currentStepIndex,
        approverId: user.id,
        approverName: user.name,
        status: 'rejected',
        comment: reason,
        timestamp: new Date(),
      };
      
      return {
        ...exp,
        status: 'rejected' as const,
        rejectionReason: reason,
        approvalHistory: [...exp.approvalHistory, newHistoryItem],
        updatedAt: new Date(),
      };
    }));

    // Create notification
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        userId: expense.submittedBy,
        type: 'expense_rejected',
        title: 'Expense Rejected',
        message: `Your expense "${expense.title}" has been rejected: ${reason}`,
        read: false,
        relatedExpenseId: id,
        createdAt: new Date(),
      };
      setNotifications(prev => [...prev, newNotification]);
    }
    // Audit
    const exp3 = expenses.find(e => e.id === id);
    if (exp3) logAuditEvent('EXPENSE_REJECTED', 'Expense', id, exp3.title, { comment: reason });
  }, [user, expenses, logAuditEvent]);

  const resubmitExpense = useCallback((id: string) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      
      return {
        ...exp,
        status: 'draft' as const,
        currentStepIndex: 0,
        approvalHistory: [],
        rejectionReason: undefined,
        updatedAt: new Date(),
      };
    }));
    const exp4 = expenses.find(e => e.id === id);
    if (exp4) logAuditEvent('EXPENSE_RESUBMITTED', 'Expense', id, exp4.title);
  }, [expenses, logAuditEvent]);

  const deleteExpense = useCallback((id: string) => {
    const exp5 = expenses.find(e => e.id === id);
    if (exp5) logAuditEvent('EXPENSE_DELETED', 'Expense', id, exp5.title);
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  }, [expenses, logAuditEvent]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    setNotifications(prev => prev.map(notif =>
      notif.userId === user.id ? { ...notif, read: true } : notif
    ));
  }, [user]);

  const getExpensesByUser = useCallback((userId: string) => {
    return expenses.filter(exp => exp.submittedBy === userId);
  }, [expenses]);

  const getPendingApprovalsForUser = useCallback((userId: string) => {
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) return [];
    
    return expenses.filter(exp => {
      if (exp.status !== 'pending') return false;
      
      // Admin or manager with "view all" permission can see all pending
      if (currentUser.role === 'admin' || currentUser.permissions?.canViewAllExpenses) return true;
      
      // Check if user is the manager of the submitter
      const submitter = users.find(u => u.id === exp.submittedBy);
      if (submitter?.managerId === userId) return true;
      
      // Check if user is in the current approval step
      const workflow = workflows.find(w => w.id === exp.workflowId);
      if (workflow) {
        const currentStep = workflow.steps[exp.currentStepIndex];
        if (currentStep?.approvers.includes(userId)) return true;
      }
      
      return false;
    });
  }, [expenses, users, workflows]);

  const createWorkflow = useCallback((workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkflow: ApprovalWorkflow = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    logAuditEvent('WORKFLOW_CREATED', 'Workflow', newWorkflow.id, newWorkflow.name);
  }, [logAuditEvent]);

  const updateWorkflow = useCallback((id: string, updates: Partial<ApprovalWorkflow>) => {
    setWorkflows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) logAuditEvent('WORKFLOW_UPDATED', 'Workflow', id, existing.name);
      return prev.map(wf => wf.id === id ? { ...wf, ...updates, updatedAt: new Date() } : wf);
    });
  }, [logAuditEvent]);

  const deleteWorkflow = useCallback((id: string) => {
    const wf0 = workflows.find(w => w.id === id);
    if (wf0) logAuditEvent('WORKFLOW_DELETED', 'Workflow', id, wf0.name);
    setWorkflows(prev => prev.filter(wf => wf.id !== id));
  }, [workflows, logAuditEvent]);

  const createUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    logAuditEvent('USER_CREATED', 'User', newUser.id, newUser.name, { newValue: JSON.stringify({ role: newUser.role, email: newUser.email }) });
  }, [logAuditEvent]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => {
      const existing = prev.find(u => u.id === id);
      if (existing) {
        logAuditEvent('USER_UPDATED', 'User', id, existing.name, {
          oldValue: JSON.stringify({ role: existing.role }),
          newValue: JSON.stringify({ role: updates.role ?? existing.role }),
        });
      }
      return prev.map(u => u.id === id ? { ...u, ...updates } : u);
    });
  }, [logAuditEvent]);

  const updateUserPermissions = useCallback((id: string, permissions: UserPermissions) => {
    setUsers(prev => {
      const existing = prev.find(u => u.id === id);
      if (existing) {
        logAuditEvent('USER_UPDATED', 'User', id, existing.name, {
          comment: 'Permissions updated',
          oldValue: JSON.stringify(existing.permissions || {}),
          newValue: JSON.stringify(permissions),
        });
      }
      return prev.map(u => u.id === id ? { ...u, permissions } : u);
    });
  }, [logAuditEvent]);

  const deleteUser = useCallback((id: string) => {
    const u0 = users.find(u => u.id === id);
    if (u0) logAuditEvent('USER_DELETED', 'User', id, u0.name);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, [users, logAuditEvent]);

  // Admin override: force-approve any expense (mandatory comment)
  const adminApproveExpense = useCallback((id: string, comment: string, overrideType: 'FORCE_APPROVE' = 'FORCE_APPROVE') => {
    if (!user) return;
    const newHistoryItem: ApprovalHistoryItem = {
      stepIndex: -1,
      approverId: user.id,
      approverName: `${user.name} (Admin Override)`,
      status: 'approved',
      comment: `[Admin Override] ${comment}`,
      timestamp: new Date(),
    };
    const targetExpense = expenses.find(e => e.id === id);
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      return { ...exp, status: 'approved' as const, approvalHistory: [...exp.approvalHistory, newHistoryItem], updatedAt: new Date() };
    }));
    if (targetExpense) {
      setNotifications(prev => [...prev, {
        id: `notif-${Date.now()}`,
        userId: targetExpense.submittedBy,
        type: 'expense_approved' as const,
        title: 'Expense Approved (Admin Override)',
        message: `Your expense "${targetExpense.title}" was approved by admin. Reason: ${comment}`,
        read: false,
        relatedExpenseId: id,
        createdAt: new Date(),
      }]);
      logAuditEvent('ADMIN_OVERRIDE_APPROVE', 'Expense', id, targetExpense.title, { comment, overrideType });
    }
  }, [user, expenses, logAuditEvent]);

  // Admin override: force-reject any expense (mandatory reason)
  const adminRejectExpense = useCallback((id: string, reason: string, overrideType: 'FORCE_REJECT' = 'FORCE_REJECT') => {
    if (!user) return;
    const newHistoryItem: ApprovalHistoryItem = {
      stepIndex: -1,
      approverId: user.id,
      approverName: `${user.name} (Admin Override)`,
      status: 'rejected',
      comment: `[Admin Override] ${reason}`,
      timestamp: new Date(),
    };
    const targetExpense = expenses.find(e => e.id === id);
    setExpenses(prev => prev.map(exp => {
      if (exp.id !== id) return exp;
      return { ...exp, status: 'rejected' as const, rejectionReason: `[Admin Override] ${reason}`, approvalHistory: [...exp.approvalHistory, newHistoryItem], updatedAt: new Date() };
    }));
    if (targetExpense) {
      setNotifications(prev => [...prev, {
        id: `notif-${Date.now()}`,
        userId: targetExpense.submittedBy,
        type: 'expense_rejected' as const,
        title: 'Expense Rejected (Admin Override)',
        message: `Your expense "${targetExpense.title}" was rejected by admin. Reason: ${reason}`,
        read: false,
        relatedExpenseId: id,
        createdAt: new Date(),
      }]);
      logAuditEvent('ADMIN_OVERRIDE_REJECT', 'Expense', id, targetExpense.title, { comment: reason, overrideType });
    }
  }, [user, expenses, logAuditEvent]);

  const getAuditLog = useCallback(() => auditLog, [auditLog]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        notifications,
        workflows,
        categories,
        users,
        auditLog,
        createExpense,
        updateExpense,
        submitExpense,
        approveExpense,
        rejectExpense,
        resubmitExpense,
        deleteExpense,
        adminApproveExpense,
        adminRejectExpense,
        markNotificationRead,
        markAllNotificationsRead,
        getExpensesByUser,
        getPendingApprovalsForUser,
        getAuditLog,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        createUser,
        updateUser,
        updateUserPermissions,
        deleteUser,
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
