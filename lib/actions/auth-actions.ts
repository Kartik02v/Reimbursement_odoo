'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword, validateEmail, validatePasswordStrength } from '@/lib/auth-utils';
import { signupSchema } from '@/lib/validations';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * Server action to register a new user
 */
export async function signupAction(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  country: any;
  role?: 'employee' | 'manager' | 'admin';
  department?: string;
  managerId?: string;
}) {
  try {
    // Validate input
    const validatedData = signupSchema.parse(data);

    // Validate email format
    if (!validateEmail(validatedData.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.message };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create company for the new user
    const company = await prisma.company.create({
      data: {
        name: validatedData.companyName,
        country: validatedData.country,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role || 'admin',
        department: validatedData.department,
        managerId: validatedData.managerId,
        companyId: company.id,
        permissions: {
          canViewAllExpenses: true,
          canApproveAllExpenses: true,
          canManageUsers: true,
          canConfigureWorkflows: true,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Seed default data for the new company
    await seedCompanyData(company.id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        actionType: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        entityName: user.name,
        companyId: company.id,
        timestamp: new Date(),
      },
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the signup if email fails
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user',
    };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        permissions: true,
        company: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error: any) {
    console.error('Get current user error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    department?: string;
  }
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        updatedAt: true,
      },
    });

    return { success: true, data: user };
  } catch (error: any) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Seed default data for a new company
 */
async function seedCompanyData(companyId: string) {
  try {
    // 1. Create default categories
    const defaultCategories = [
      { name: 'Travel', icon: 'Plane' },
      { name: 'Food & Dining', icon: 'Utensils' },
      { name: 'Office Supplies', icon: 'Paperclip' },
      { name: 'Software/Subscriptions', icon: 'Monitor' },
      { name: 'Other', icon: 'MoreHorizontal' },
    ];

    await Promise.all(
      defaultCategories.map((cat) =>
        prisma.expenseCategory.create({
          data: {
            name: cat.name,
            icon: cat.icon,
            companyId: companyId,
          },
        })
      )
    );

    // 2. Create a default basic workflow
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        name: 'Default Approval Policy',
        description: 'Standard multi-level approval for all expenses',
        isDefault: true,
        companyId: companyId,
        conditions: { any: true },
      },
    });

    // 3. Add a default "Manager Approval" step
    await prisma.approvalStep.create({
      data: {
        order: 1,
        name: 'Manager Review',
        type: 'any',
        approvers: [], // In real app, this would dynamically target the user's manager
        workflowId: workflow.id,
      },
    });

    console.log(`Seeded default data for company: ${companyId}`);
  } catch (error) {
    console.error('Failed to seed company data:', error);
    // Don't fail the whole signup if seeding fails
  }
}
