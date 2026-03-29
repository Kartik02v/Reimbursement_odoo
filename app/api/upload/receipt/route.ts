import { NextRequest } from 'next/server';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import {
  uploadToCloudinary,
  validateFile,
} from '@/lib/cloudinary';
import { uploadReceiptSchema } from '@/lib/validations';

// POST /api/upload/receipt - Upload receipt to Cloudinary
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = uploadReceiptSchema.parse(body);

    // Validate file
    const validation = validateFile(validatedData.file, 10); // 10MB max
    if (!validation.valid) {
      return apiError(validation.error || 'Invalid file', 400, 'VALIDATION_ERROR');
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = validatedData.filename
      ? `${timestamp}-${validatedData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      : `receipt-${timestamp}`;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      validatedData.file,
      'expense-receipts',
      {
        filename,
        resourceType: 'auto',
        transformation: {
          quality: 'auto',
          fetch_format: 'auto',
        },
      }
    );

    // If expense ID provided, update expense with receipt URL
    if (validatedData.expenseId) {
      const { prisma } = await import('@/lib/prisma');
      
      const expense = await prisma.expense.findUnique({
        where: { id: validatedData.expenseId },
      });

      if (expense) {
        await prisma.expense.update({
          where: { id: validatedData.expenseId },
          data: { receiptUrl: result.secure_url },
        });
      }
    }

    return apiResponse({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
