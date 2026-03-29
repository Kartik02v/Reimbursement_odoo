import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { approveExpenseSchema } from '@/lib/validations';
import { sendExpenseStatusEmail } from '@/lib/email';

// POST /api/approvals - Approve or reject expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = approveExpenseSchema.parse(body);

    // TODO: Get approverId from session
    const approverId = body.approverId || 'temp-approver-id';

    // Get expense with workflow and approval history
    const expense = await prisma.expense.findUnique({
      where: { id: validatedData.expenseId },
      include: {
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
        submitter: true,
      },
    });

    if (!expense) {
      return apiError('Expense not found', 404, 'NOT_FOUND');
    }

    if (expense.status !== 'pending') {
      return apiError('Expense is not pending approval', 400, 'BAD_REQUEST');
    }

    // Find current approval step
    const currentStepNumber = expense.approvalHistory.length + 1;
    const currentStep = expense.workflow?.steps.find(
      (s) => s.order === currentStepNumber
    );

    if (!currentStep) {
      return apiError('No approval step found', 400, 'BAD_REQUEST');
    }

    // TODO: Verify approver has permission for this step

    // Create approval history record
    const approvalHistory = await prisma.approvalHistoryItem.create({
      data: {
        expenseId: expense.id,
        approverId,
        approverName: body.approverName || 'Approver',
        stepIndex: currentStepNumber,
        status: validatedData.approved ? 'approved' : 'rejected',
        comment: validatedData.comments,
      },
    });

    // Update expense status
    let newStatus: 'approved' | 'rejected' | 'pending' = expense.status;

    if (!validatedData.approved) {
      // Rejected at any step = rejected overall
      newStatus = 'rejected';
    } else if (currentStepNumber >= (expense.workflow?.steps.length || 0)) {
      // Approved at final step = approved overall
      newStatus = 'approved';
    } else {
      // Still pending (more steps to go)
      newStatus = 'pending';
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        status: newStatus,
        currentStepIndex: validatedData.approved ? currentStepNumber : expense.currentStepIndex,
        rejectionReason: !validatedData.approved ? validatedData.comments : null,
      },
      include: {
        submitter: true,
        approvalHistory: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: approverId,
        userName: body.approverName || 'Approver',
        actionType: validatedData.approved ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.title,
        companyId: expense.companyId,
        comment: validatedData.comments,
        newValue: JSON.stringify({
          title: expense.title,
          amount: expense.amount,
          stepNumber: currentStepNumber,
          comments: validatedData.comments,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Send email notification to submitter
    if (newStatus !== 'pending') {
      try {
        await sendExpenseStatusEmail(
          expense.submitter.email,
          expense.submitter.name,
          expense.title,
          newStatus,
          validatedData.comments
        );
      } catch (emailError) {
        console.error('Failed to send status email:', emailError);
      }
    }

    return apiResponse({
      expense: updatedExpense,
      approvalHistory,
      status: newStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/approvals - Get pending approvals for current user
export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const approverId = searchParams.get('approverId'); // TODO: Get from session

    if (!approverId) {
      return apiError('Approver ID required', 400, 'BAD_REQUEST');
    }

    // Find expenses pending approval where user is next approver
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        status: 'pending',
      },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
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
      orderBy: { createdAt: 'desc' },
    });

    // Filter to only expenses where current user is next approver
    const userPendingApprovals = pendingExpenses.filter((expense) => {
      const nextStepNumber = expense.approvalHistory.length + 1;
      const nextStep = expense.workflow?.steps.find(
        (s) => s.order === nextStepNumber
      );
      return nextStep?.approvers.includes(approverId) || false;
    });

    return apiResponse(userPendingApprovals);
  } catch (error) {
    return handleApiError(error);
  }
}
