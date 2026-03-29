import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';

// GET /api/analytics - Get dashboard analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id: userId, role, companyId } = session.user;
    const searchParams = new URL(req.url).searchParams;
    const period = searchParams.get('period') || '30'; // days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Build query based on role and company
    const whereClause: any = {
      companyId,
      createdAt: { gte: startDate },
    };

    if (role === 'employee') {
      whereClause.submittedBy = userId;
    } else if (role === 'manager') {
      // Filter by team members (manager themselves + their subordinates)
      whereClause.OR = [
        { submittedBy: userId },
        { submitter: { managerId: userId } },
      ];
    }

    // Get expense statistics
    const [
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      totalAmount,
      expensesByCategory,
      recentExpenses,
    ] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.count({
        where: { ...whereClause, status: 'pending' },
      }),
      prisma.expense.count({
        where: { ...whereClause, status: 'approved' },
      }),
      prisma.expense.count({
        where: { ...whereClause, status: 'rejected' },
      }),
      prisma.expense.aggregate({
        where: { ...whereClause, status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: whereClause,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.findMany({
        where: whereClause,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Get category details for grouped data
    const categoryIds = expensesByCategory.map((e: any) => e.category);
    const categories = await prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
    });

    const expensesByCategoryWithDetails = expensesByCategory.map((group: any) => {
      const category = categories.find((c: any) => c.id === group.category);
      return {
        category: {
          id: category?.id,
          name: category?.name,
          icon: category?.icon,
        },
        total: group._sum.amount || 0,
        count: group._count,
      };
    });

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    const previousPeriodTotal = await prisma.expense.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
    });

    const trend =
      previousPeriodTotal > 0
        ? ((totalExpenses - previousPeriodTotal) / previousPeriodTotal) * 100
        : 0;

    return apiResponse({
      summary: {
        total: totalExpenses,
        pending: pendingExpenses,
        approved: approvedExpenses,
        rejected: rejectedExpenses,
        totalAmount: totalAmount._sum.amount || 0,
        trend: Math.round(trend * 10) / 10,
      },
      byCategory: expensesByCategoryWithDetails,
      recent: recentExpenses,
      period: {
        days: periodDays,
        startDate,
        endDate: new Date(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
