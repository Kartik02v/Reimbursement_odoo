import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { createCategorySchema } from '@/lib/validations';

// GET /api/categories - List all categories
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const companyId = session.user.companyId;
    const where: any = { companyId };

    const categories = await prisma.expenseCategory.findMany({
      where,
      select: {
        id: true,
        name: true,
        icon: true,
        companyId: true,
      },
      orderBy: { name: 'asc' },
    });

    return apiResponse(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/categories - Create new category (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Only admin can create categories
    if (session.user.role !== 'admin') {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const validatedData = createCategorySchema.parse(body);

    const category = await prisma.expenseCategory.create({
      data: {
        name: validatedData.name,
        icon: validatedData.icon,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        companyId: true,
      },
    });

    return apiResponse(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
