import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
  getPaginationParams,
  getPaginationMeta,
} from '@/lib/api-utils';
import { createExpenseSchema } from '@/lib/validations';

// GET /api/expenses - List expenses with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(req.url);
    const searchParams = new URL(req.url).searchParams;
    
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (userId) {
      where.submittedBy = userId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { merchantName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          approvalHistory: {
            select: {
              id: true,
              stepIndex: true,
              status: true,
              comment: true,
              timestamp: true,
              approverId: true,
              approverName: true,
            },
            orderBy: { stepIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);

    return apiResponse(expenses, 200, getPaginationMeta(page, limit, total));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/expenses - Create new expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createExpenseSchema.parse(body);

    // TODO: Get userId from session
    const userId = body.userId;
    if (!userId) {
      return apiError('User ID is required', 400, 'BAD_REQUEST');
    }

    const expense = await prisma.expense.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        amount: validatedData.amount,
        currency: validatedData.currency,
        category: validatedData.category,
        expenseDate: new Date(validatedData.expenseDate),
        receiptUrl: validatedData.receiptUrl,
        attachmentUrl: validatedData.attachmentUrl,
        merchantName: validatedData.merchantName,
        paidBy: validatedData.paidBy,
        status: 'draft',
        submittedBy: userId,
        companyId: validatedData.companyId || body.companyId || 'company-1',
        workflowId: validatedData.workflowId || body.workflowId,
      },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userName: expense.submitter.name,
        actionType: 'EXPENSE_CREATED',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.title,
        companyId: expense.companyId,
        newValue: JSON.stringify({
          title: expense.title,
          amount: expense.amount,
          currency: expense.currency,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return apiResponse(expense, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
