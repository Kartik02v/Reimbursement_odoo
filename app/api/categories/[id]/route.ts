import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { updateCategorySchema } from '@/lib/validations';

// GET /api/categories/[id] - Get category by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return apiError('Category not found', 404, 'NOT_FOUND');
    }

    return apiResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/categories/[id] - Update category (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Check admin role from session
    
    const body = await req.json();
    const validatedData = updateCategorySchema.parse(body);

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: validatedData,
    });

    return apiResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/categories/[id] - Delete category (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Check admin role from session

    // Check if category has expenses
    const expenseCount = await prisma.expense.count({
      where: { category: id },
    });

    if (expenseCount > 0) {
      return apiError(
        'Cannot delete category with existing expenses',
        400,
        'BAD_REQUEST'
      );
    }

    await prisma.expenseCategory.delete({
      where: { id },
    });

    return apiResponse({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
