'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Expense, Notification, ApprovalWorkflow, ExpenseCategory, User, ApprovalHistoryItem } from './types';
import { mockExpenses, mockNotifications, mockWorkflows, mockCategories, mockUsers, convertCurrency } from './mock-data';
import { useAuth } from './auth-context';

interface ExpenseContextType {
  expenses: Expense[];
  notifications: Notification[];
  workflows: ApprovalWorkflow[];
  categories: ExpenseCategory[];
  users: User[];
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory' | 'currentStepIndex'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  submitExpense: (id: string) => void;
  approveExpense: (id: string, comment?: string) => void;
  rejectExpense: (id: string, reason: string) => void;
  resubmitExpense: (id: string) => void;
  deleteExpense: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  getExpensesByUser: (userId: string) => Expense[];
  getPendingApprovalsForUser: (userId: string) => Expense[];
  createWorkflow: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorkflow: (id: string, updates: Partial<ApprovalWorkflow>) => void;
  deleteWorkflow: (id: string) => void;
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
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
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, ...updates, updatedAt: new Date() } : exp
    ));
  }, []);

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
  }, [expenses, workflows, users, company]);

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
  }, [user, workflows, expenses]);

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
  }, [user, expenses]);

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
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  }, []);

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
      
      // Admin can see all pending
      if (currentUser.role === 'admin') return true;
      
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
  }, []);

  const updateWorkflow = useCallback((id: string, updates: Partial<ApprovalWorkflow>) => {
    setWorkflows(prev => prev.map(wf =>
      wf.id === id ? { ...wf, ...updates, updatedAt: new Date() } : wf
    ));
  }, []);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows(prev => prev.filter(wf => wf.id !== id));
  }, []);

  const createUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, ...updates } : u
    ));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        notifications,
        workflows,
        categories,
        users,
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
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        createUser,
        updateUser,
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
