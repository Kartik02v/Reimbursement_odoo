'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return notifications;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

export async function markNotificationRead(id: string) {
  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath('/dashboard');
    return notification;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
}
