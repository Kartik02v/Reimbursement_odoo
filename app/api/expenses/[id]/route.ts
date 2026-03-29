import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { updateExpenseSchema } from '@/lib/validations';
import { sendApprovalRequestEmail, sendExpenseStatusEmail } from '@/lib/email';

// GET /api/expenses/[id] - Get expense by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        approvalHistory: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    if (!expense) {
      return apiError('Expense not found', 404, 'NOT_FOUND');
    }

    return apiResponse(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/expenses/[id] - Update expense
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateExpenseSchema.parse(body);

    // Check if expense exists and get current status
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: {
        submitter: true,
      },
    });

    if (!existingExpense) {
      return apiError('Expense not found', 404, 'NOT_FOUND');
    }

    // Don't allow editing approved/rejected expenses
    if (
      existingExpense.status === 'approved' ||
      existingExpense.status === 'rejected'
    ) {
      return apiError(
        'Cannot edit approved or rejected expenses',
        400,
        'BAD_REQUEST'
      );
    }

    const updateData: any = {};
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.amount) updateData.amount = validatedData.amount;
    if (validatedData.currency) updateData.currency = validatedData.currency;
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.expenseDate) updateData.expenseDate = new Date(validatedData.expenseDate);
    if (validatedData.receiptUrl !== undefined) updateData.receiptUrl = validatedData.receiptUrl;
    if (validatedData.attachmentUrl !== undefined) updateData.attachmentUrl = validatedData.attachmentUrl;
    if (validatedData.merchantName !== undefined)
      updateData.merchantName = validatedData.merchantName;
    if (validatedData.paidBy !== undefined) updateData.paidBy = validatedData.paidBy;
    if (validatedData.rejectionReason !== undefined)
      updateData.rejectionReason = validatedData.rejectionReason;
    if (validatedData.status) updateData.status = validatedData.status;

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        submitter: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: existingExpense.submittedBy,
        userName: existingExpense.submitter.name,
        actionType: 'EXPENSE_EDITED',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.title,
        companyId: expense.companyId,
        oldValue: JSON.stringify(existingExpense),
        newValue: JSON.stringify(expense),
      },
    });

    return apiResponse(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return apiError('Expense not found', 404, 'NOT_FOUND');
    }

    // Don't allow deleting approved expenses
    if (expense.status === 'approved') {
      return apiError('Cannot delete approved expenses', 400, 'BAD_REQUEST');
    }

    // Delete related records first
    await prisma.approvalHistoryItem.deleteMany({
      where: { expenseId: id },
    });

    await prisma.expense.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: expense.submittedBy,
        userName: expense.submitter?.name || 'Unknown',
        actionType: 'EXPENSE_DELETED',
        entityType: 'expense',
        entityId: id,
        entityName: expense.title,
        companyId: expense.companyId,
        oldValue: JSON.stringify({
          title: expense.title,
          amount: expense.amount,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return apiResponse({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
