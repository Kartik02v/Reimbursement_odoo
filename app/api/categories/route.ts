import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { createCategorySchema } from '@/lib/validations';

// GET /api/categories - List all categories
export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const companyId = searchParams.get('companyId');
    const where: any = {};
    if (companyId) where.companyId = companyId;

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
    const body = await req.json();
    const validatedData = createCategorySchema.parse(body);

    // TODO: Check admin role from session

    const category = await prisma.expenseCategory.create({
      data: {
        name: validatedData.name,
        icon: validatedData.icon,
        companyId: validatedData.companyId || body.companyId || 'company-1',
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
