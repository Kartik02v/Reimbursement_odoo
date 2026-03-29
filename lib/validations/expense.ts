import { z } from 'zod';

// Expense schemas
export const createExpenseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
  category: z.string().min(1, 'Category is required'),
  expenseDate: z.string().or(z.date()),
  receiptUrl: z.string().optional(),
  attachmentUrl: z.string().optional(),
  merchantName: z.string().max(200).optional(),
  paidBy: z.string().max(200).optional(),
  companyId: z.string().optional(),
  workflowId: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  expenseDate: z.string().or(z.date()).optional(),
  receiptUrl: z.string().optional(),
  attachmentUrl: z.string().optional(),
  merchantName: z.string().max(200).optional(),
  paidBy: z.string().max(200).optional(),
  rejectionReason: z.string().max(1000).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
});

export const submitExpenseSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  workflowId: z.string().optional(),
});

export const filterExpensesSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
  category: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type SubmitExpenseInput = z.infer<typeof submitExpenseSchema>;
export type FilterExpensesInput = z.infer<typeof filterExpensesSchema>;
