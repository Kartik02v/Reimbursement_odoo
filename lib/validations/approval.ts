import { z } from 'zod';

// Approval schemas
export const approveExpenseSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  comments: z.string().max(1000).optional(),
  approved: z.boolean(),
});

export const bulkApproveSchema = z.object({
  expenseIds: z.array(z.string()).min(1, 'At least one expense required'),
  approved: z.boolean(),
  comments: z.string().max(1000).optional(),
});

export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;
