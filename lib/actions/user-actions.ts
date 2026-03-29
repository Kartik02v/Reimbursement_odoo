'use server';

import prisma from '@/lib/prisma';
import type { UserRole } from '@prisma/client';

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        manager: true,
        subordinates: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user');
  }
}

export async function getSubordinates(managerId: string) {
  try {
    const subordinates = await prisma.user.findMany({
      where: { managerId },
      orderBy: {
        name: 'asc',
      },
    });
    return subordinates;
  } catch (error) {
    console.error('Failed to fetch subordinates:', error);
    throw new Error('Failed to fetch subordinates');
  }
}

export async function getCompanyData(companyId: string) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        categories: true,
        workflows: {
          include: {
            steps: true,
          },
        },
      },
    });
    return company;
  } catch (error) {
    console.error('Failed to fetch company data:', error);
    throw new Error('Failed to fetch company data');
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return user;
  } catch (error) {
    console.error('Failed to update user role:', error);
    throw new Error('Failed to update user role');
  }
}
