'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { convertCurrency } from '@/lib/mock-data';

export async function getExpenses() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        approvalHistory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return expenses;
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    throw new Error('Failed to fetch expenses');
  }
}

export async function createExpense(data: any) {
  try {
    const expense = await prisma.expense.create({
      data: {
        ...data,
        expenseDate: new Date(data.expenseDate),
        status: 'draft',
      },
    });
    
    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: data.submittedBy,
        userName: 'System', // This should be the user's name
        actionType: 'EXPENSE_CREATED',
        entityType: 'Expense',
        entityId: expense.id,
        entityName: expense.title,
        companyId: data.companyId,
      },
    });

    revalidatePath('/dashboard');
    return expense;
  } catch (error) {
    console.error('Failed to create expense:', error);
    throw new Error('Failed to create expense');
  }
}

export async function submitExpense(id: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        submitter: true,
        company: true,
      },
    });

    if (!expense) throw new Error('Expense not found');

    // Find appropriate workflow based on conditions
    const workflows = await prisma.approvalWorkflow.findMany({
      where: { companyId: expense.companyId },
    });

    let selectedWorkflow = workflows.find((w) => w.isDefault);

    for (const workflow of workflows) {
      if (workflow.conditions) {
        const conditions = workflow.conditions as any[];
        const matches = conditions.every((condition) => {
          switch (condition.field) {
            case 'amount':
              if (condition.operator === 'gt') return expense.amount > (condition.value as number);
              if (condition.operator === 'lt') return expense.amount < (condition.value as number);
              return expense.amount === condition.value;
            case 'category':
              return expense.category === condition.value;
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
    const convertedAmount = expense.company
      ? convertCurrency(expense.amount, expense.currency, (expense.company.country as any).currency.code)
      : expense.amount;

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: 'pending',
        workflowId: selectedWorkflow?.id,
        convertedAmount,
        updatedAt: new Date(),
      },
    });

    // Create notification for manager
    if (expense.submitter.managerId) {
      await prisma.notification.create({
        data: {
          userId: expense.submitter.managerId,
          type: 'pending_approval',
          title: 'New Expense Pending',
          message: `${expense.submitter.name} submitted "${expense.title}" for approval.`,
          relatedExpenseId: id,
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: expense.submittedBy,
        userName: expense.submitter.name,
        actionType: 'EXPENSE_SUBMITTED',
        entityType: 'Expense',
        entityId: id,
        entityName: expense.title,
        companyId: expense.companyId,
      },
    });

    revalidatePath('/dashboard');
    return updatedExpense;
  } catch (error) {
    console.error('Failed to submit expense:', error);
    throw new Error('Failed to submit expense');
  }
}

export async function approveExpense(id: string, userId: string, userName: string, comment?: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            steps: true,
          },
        },
      },
    });

    if (!expense) throw new Error('Expense not found');

    const nextStepIndex = expense.currentStepIndex + 1;
    const isLastStep = !expense.workflow || nextStepIndex >= expense.workflow.steps.length;

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: isLastStep ? 'approved' : 'pending',
        currentStepIndex: isLastStep ? expense.currentStepIndex : nextStepIndex,
        approvalHistory: {
          create: {
            stepIndex: expense.currentStepIndex,
            approverId: userId,
            approverName: userName,
            status: 'approved',
            comment,
          },
        },
        updatedAt: new Date(),
      },
    });

    // Create notification for submitter
    await prisma.notification.create({
      data: {
        userId: expense.submittedBy,
        type: 'expense_approved',
        title: 'Expense Approved',
        message: `Your expense "${expense.title}" has been approved by ${userName}.`,
        relatedExpenseId: id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        actionType: 'EXPENSE_APPROVED',
        entityType: 'Expense',
        entityId: id,
        entityName: expense.title,
        companyId: expense.companyId,
        comment,
      },
    });

    revalidatePath('/dashboard');
    return updatedExpense;
  } catch (error) {
    console.error('Failed to approve expense:', error);
    throw new Error('Failed to approve expense');
  }
}

export async function rejectExpense(id: string, userId: string, userName: string, reason: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) throw new Error('Expense not found');

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        approvalHistory: {
          create: {
            stepIndex: expense.currentStepIndex,
            approverId: userId,
            approverName: userName,
            status: 'rejected',
            comment: reason,
          },
        },
        updatedAt: new Date(),
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: expense.submittedBy,
        type: 'expense_rejected',
        title: 'Expense Rejected',
        message: `Your expense "${expense.title}" has been rejected: ${reason}`,
        relatedExpenseId: id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        actionType: 'EXPENSE_REJECTED',
        entityType: 'Expense',
        entityId: id,
        entityName: expense.title,
        companyId: expense.companyId,
        comment: reason,
      },
    });

    revalidatePath('/dashboard');
    return updatedExpense;
  } catch (error) {
    console.error('Failed to reject expense:', error);
    throw new Error('Failed to reject expense');
  }
}

export async function deleteExpense(id: string, userId: string, userName: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) throw new Error('Expense not found');

    // Audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        actionType: 'EXPENSE_DELETED',
        entityType: 'Expense',
        entityId: id,
        entityName: expense.title,
        companyId: expense.companyId,
      },
    });

    await prisma.expense.delete({
      where: { id },
    });

    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Failed to delete expense:', error);
    throw new Error('Failed to delete expense');
  }
}
