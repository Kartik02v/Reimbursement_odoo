import { z } from 'zod';

// Upload schemas
export const uploadReceiptSchema = z.object({
  file: z.string().min(1, 'File is required'), // Base64 string
  filename: z.string().optional(),
  expenseId: z.string().optional(),
});

export const deleteFileSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  resourceType: z.enum(['image', 'raw', 'video']).optional(),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
