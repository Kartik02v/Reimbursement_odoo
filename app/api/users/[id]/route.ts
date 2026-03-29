import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { updateUserSchema } from '@/lib/validations';

// GET /api/users/[id] - Get user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add session check
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            submittedExpenses: true,
          },
        },
      },
    });

    if (!user) {
      return apiError('User not found', 404, 'NOT_FOUND');
    }

    return apiResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add session check and authorization
    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        permissions: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: id,
        userName: user.name,
        actionType: 'USER_UPDATED',
        entityType: 'user',
        entityId: user.id,
        entityName: user.name,
        companyId: body.companyId || 'company-1',
        newValue: JSON.stringify({
          changes: validatedData,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return apiResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add admin authorization check
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: id,
        userName: 'Unknown',
        actionType: 'USER_DELETED',
        entityType: 'user',
        entityId: id,
        entityName: id,
        companyId: 'company-1',
        newValue: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return apiResponse({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
