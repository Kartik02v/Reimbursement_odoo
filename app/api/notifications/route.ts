import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
  getPaginationParams,
  getPaginationMeta,
} from '@/lib/api-utils';

// GET /api/notifications - Get notifications for user
export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const userId = searchParams.get('userId'); // TODO: Get from session
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return apiError('User ID required', 400, 'BAD_REQUEST');
    }

    const { page, limit, skip } = getPaginationParams(req.url);

    const where: any = { userId };
    
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return apiResponse(
      notifications,
      200,
      getPaginationMeta(page, limit, total)
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationIds, userId } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return apiError('Notification IDs array required', 400, 'BAD_REQUEST');
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user owns these notifications
      },
      data: {
        read: true,
      },
    });

    return apiResponse({ success: true, updated: notificationIds.length });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/notifications - Delete notification
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const notificationId = searchParams.get('id');
    const userId = searchParams.get('userId'); // TODO: Get from session

    if (!notificationId) {
      return apiError('Notification ID required', 400, 'BAD_REQUEST');
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
    });

    return apiResponse({ success: true, message: 'Notification deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
