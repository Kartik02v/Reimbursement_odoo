import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  department: z.string().optional(),
  managerId: z.string().nullable().optional(),
  permissions: z.record(z.boolean()).optional(),
});

// GET /api/users/[id] - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        companyId: true,
        permissions: true,
        company: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.companyId !== session.user.companyId) {
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
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Only admin can update users (or managers with permission)
    if (session.user.role !== 'admin' && !session.user.permissions?.canManageUsers) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.companyId !== session.user.companyId) {
      return apiError('User not found', 404, 'NOT_FOUND');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...validatedData,
        managerId: validatedData.managerId === 'none' ? null : (validatedData.managerId || targetUser.managerId),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        actionType: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        entityName: updatedUser.name,
        companyId: session.user.companyId,
        timestamp: new Date(),
        newValue: JSON.stringify(validatedData),
      },
    });

    return apiResponse(updatedUser);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (session.user.role !== 'admin') {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return apiError('Cannot delete your own account', 400, 'BAD_REQUEST');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.companyId !== session.user.companyId) {
      return apiError('User not found', 404, 'NOT_FOUND');
    }

    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        actionType: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        entityName: targetUser.name,
        companyId: session.user.companyId,
        timestamp: new Date(),
      },
    });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
