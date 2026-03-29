import { z } from 'zod';

// User schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  country: z.any(), // Country object from countries array
  role: z.enum(['employee', 'manager', 'admin']).optional().default('employee'),
  department: z.string().optional(),
  managerId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().optional(),
  managerId: z.string().optional(),
  role: z.enum(['employee', 'manager', 'admin']).optional(),
  permissions: z.record(z.boolean()).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
