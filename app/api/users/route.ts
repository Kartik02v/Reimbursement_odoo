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
import { hashPassword, validateEmail, validatePasswordStrength } from '@/lib/auth-utils';
import { signupSchema } from '@/lib/validations';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'employee']),
  department: z.string().optional(),
  managerId: z.string().optional(),
  companyId: z.string(),
  avatar: z.string().optional(),
});

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
          companyId: true,
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

// POST /api/users - Create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Only admin can create users
    if (session.user.role !== 'admin') {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Validate email
    if (!validateEmail(validatedData.email)) {
      return apiError('Invalid email format', 400, 'BAD_REQUEST');
    }

    // Validate password
    const pwdValidation = validatePasswordStrength(validatedData.password);
    if (!pwdValidation.valid) {
      return apiError(pwdValidation.message || 'Weak password', 400, 'BAD_REQUEST');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return apiError('User with this email already exists', 400, 'ALREADY_EXISTS');
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        department: validatedData.department,
        managerId: validatedData.managerId && validatedData.managerId !== 'none' ? validatedData.managerId : null,
        companyId: session.user.companyId,
        avatar: validatedData.avatar,
        permissions: {},
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        companyId: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        actionType: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        entityName: user.name,
        companyId: session.user.companyId,
        timestamp: new Date(),
      },
    });

    return apiResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
