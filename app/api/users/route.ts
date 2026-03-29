import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
  getPaginationParams,
  getPaginationMeta,
} from '@/lib/api-utils';
import { updateUserSchema } from '@/lib/validations';

// GET /api/users - Get all users (admin/manager only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Only admin and managers can list users
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { page, limit, skip } = getPaginationParams(req.url);
    const searchParams = new URL(req.url).searchParams;
    const role = searchParams.get('role');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    const where: any = {
      companyId: session.user.companyId,
    };

    // Managers can only see their team
    if (session.user.role === 'manager') {
      where.OR = [
        { managerId: session.user.id },
        { id: session.user.id },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          managerId: true,
          createdAt: true,
          updatedAt: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              subordinates: true,
              submittedExpenses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return apiResponse(users, 200, getPaginationMeta(page, limit, total));
  } catch (error) {
    return handleApiError(error);
  }
}
