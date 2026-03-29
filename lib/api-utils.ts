import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  errors?: ApiError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Standard API response wrapper
 */
export function apiResponse<T>(
  data: T,
  status: number = 200,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status }
  );
}

/**
 * Standard API error response
 */
export function apiError(
  message: string,
  status: number = 400,
  code?: string,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
    },
    { status }
  );
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse<ApiResponse> {
  const errors: ApiError[] = error.errors.map((err) => ({
    message: err.message,
    field: err.path.join('.'),
    code: err.code,
  }));

  return NextResponse.json(
    {
      success: false,
      errors,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
      },
    },
    { status: 400 }
  );
}

/**
 * Handle Prisma errors
 */
export function handlePrismaError(error: any): NextResponse<ApiResponse> {
  console.error('Prisma error:', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return apiError(
          'A record with this value already exists',
          409,
          'DUPLICATE_ERROR',
          { field: error.meta?.target }
        );
      case 'P2025':
        return apiError('Record not found', 404, 'NOT_FOUND');
      case 'P2003':
        return apiError(
          'Foreign key constraint failed',
          400,
          'FOREIGN_KEY_ERROR'
        );
      default:
        return apiError('Database operation failed', 500, error.code);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError('Invalid data provided', 400, 'VALIDATION_ERROR');
  }

  return apiError('Database error occurred', 500, 'DATABASE_ERROR');
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Zod validation error
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return handlePrismaError(error);
  }

  // Custom API errors
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('Unauthorized')) {
      return apiError('Unauthorized access', 401, 'UNAUTHORIZED');
    }
    if (error.message.includes('Forbidden')) {
      return apiError('Access forbidden', 403, 'FORBIDDEN');
    }
    if (error.message.includes('Not found')) {
      return apiError('Resource not found', 404, 'NOT_FOUND');
    }

    return apiError(error.message, 500, 'INTERNAL_ERROR');
  }

  // Unknown error
  return apiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Async handler wrapper for API routes
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Extract pagination params from URL
 */
export function getPaginationParams(url: string): {
  page: number;
  limit: number;
  skip: number;
} {
  const searchParams = new URL(url).searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '10'))
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): ApiResponse['meta'] {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: any,
  fields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = fields.filter((field) => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Log API request
 */
export function logRequest(req: Request, userId?: string) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  
  console.log(`[${timestamp}] ${method} ${url}`, {
    userId,
    userAgent: req.headers.get('user-agent'),
  });
}
