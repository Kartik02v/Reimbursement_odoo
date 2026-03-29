import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
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
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const body = await req.json();
    const validatedData = approveExpenseSchema.parse(body);

    const approverId = session.user.id;
    const approverName = session.user.name;

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
    const currentStepIndex = expense.approvalHistory.length;
    const currentStep = expense.workflow?.steps[currentStepIndex];

    if (!currentStep) {
      return apiError('No approval step found', 400, 'BAD_REQUEST');
    }

    // Verify approver has permission for this step
    const isExplicitApprover = currentStep.approvers.includes(approverId);
    const isDirectManager = expense.submitter.managerId === approverId;
    const isAdminOverride = session.user.role === 'admin';

    if (!isExplicitApprover && !isDirectManager && !isAdminOverride) {
      return apiError('You are not authorized to approve this step', 403, 'FORBIDDEN');
    }

    // Create approval history record
    const approvalHistory = await prisma.approvalHistoryItem.create({
      data: {
        expenseId: expense.id,
        approverId,
        approverName: approverName,
        stepIndex: currentStep.order,
        status: validatedData.approved ? 'approved' : 'rejected',
        comment: validatedData.comments,
      },
    });

    // Update expense status
    let newStatus: 'approved' | 'rejected' | 'pending' = expense.status;

    if (!validatedData.approved) {
      // Rejected at any step = rejected overall
      newStatus = 'rejected';
    } else if (currentStepIndex >= (expense.workflow?.steps.length || 0) - 1) {
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
        currentStepIndex: validatedData.approved ? currentStep.order : expense.currentStepIndex,
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
        userName: approverName,
        actionType: validatedData.approved ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.title,
        companyId: expense.companyId,
        comment: validatedData.comments,
        newValue: JSON.stringify({
          title: expense.title,
          amount: expense.amount,
          stepNumber: currentStep.order,
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
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const approverId = session.user.id;
    const companyId = session.user.companyId;

    // Find expenses pending approval in current company
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        status: 'pending',
        companyId,
      },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            managerId: true,
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

    // Filter to only expenses where current user is the next approver
    const userPendingApprovals = pendingExpenses.filter((expense: any) => {
      const currentStepIndex = expense.approvalHistory.length;
      const nextStep = expense.workflow?.steps[currentStepIndex];
      
      if (!nextStep) return false;

      // User can approve if:
      // 1. They are explicitly in the nextStep.approvers list
      // 2. They are the direct manager of the submitter
      // 3. They are an admin (can see all pending)
      const isExplicitApprover = nextStep.approvers.includes(approverId);
      const isDirectManager = expense.submitter.managerId === approverId;
      const isAdmin = session.user.role === 'admin';

      return isExplicitApprover || isDirectManager || isAdmin;
    });

    return apiResponse(userPendingApprovals);
  } catch (error) {
    return handleApiError(error);
  }
}
