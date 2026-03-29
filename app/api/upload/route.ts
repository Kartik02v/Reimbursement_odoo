import { NextRequest } from 'next/server';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { deleteFileSchema } from '@/lib/validations';

// DELETE /api/upload - Delete file from Cloudinary
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = deleteFileSchema.parse(body);

    // Delete from Cloudinary
    const result = await deleteFromCloudinary(
      validatedData.publicId,
      validatedData.resourceType || 'image'
    );

    return apiResponse({
      success: true,
      message: 'File deleted successfully',
      result: result.result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
