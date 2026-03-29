import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: string;
}

export interface CloudinaryError {
  message: string;
  http_code?: number;
}

/**
 * Upload a file to Cloudinary
 * @param file - File buffer or base64 string
 * @param folder - Cloudinary folder path
 * @param options - Additional upload options
 */
export async function uploadToCloudinary(
  file: string | Buffer,
  folder: string = 'receipts',
  options: {
    filename?: string;
    transformation?: any;
    resourceType?: 'image' | 'raw' | 'video' | 'auto';
  } = {}
): Promise<UploadResult> {
  try {
    const uploadOptions: any = {
      folder,
      resource_type: options.resourceType || 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    };

    if (options.filename) {
      uploadOptions.public_id = options.filename;
    }

    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    const result = await cloudinary.uploader.upload(
      typeof file === 'string' ? file : `data:image/png;base64,${file.toString('base64')}`,
      uploadOptions
    );

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      width: result.width || 0,
      height: result.height || 0,
      bytes: result.bytes,
      resource_type: result.resource_type,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public_id of the file to delete
 * @param resourceType - Type of resource (image, raw, video)
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<{ result: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Delete failed: ${result.result}`);
    }
    
    return result;
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Generate a transformed image URL
 * @param publicId - The public_id of the image
 * @param transformations - Cloudinary transformation options
 */
export function getTransformedUrl(
  publicId: string,
  transformations: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit';
    quality?: number | 'auto';
    format?: 'jpg' | 'png' | 'webp' | 'auto';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
  } = transformations;

  return cloudinary.url(publicId, {
    transformation: [
      {
        width,
        height,
        crop,
        quality,
        fetch_format: format,
        gravity,
      },
    ],
  });
}

/**
 * Generate a thumbnail URL
 * @param publicId - The public_id of the image
 * @param size - Thumbnail size (default: 200)
 */
export function getThumbnailUrl(publicId: string, size: number = 200): string {
  return getTransformedUrl(publicId, {
    width: size,
    height: size,
    crop: 'thumb',
    quality: 'auto',
    format: 'auto',
    gravity: 'face',
  });
}

/**
 * Generate an optimized image URL
 * @param publicId - The public_id of the image
 * @param maxWidth - Maximum width (default: 1920)
 */
export function getOptimizedUrl(publicId: string, maxWidth: number = 1920): string {
  return getTransformedUrl(publicId, {
    width: maxWidth,
    crop: 'limit',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Validate file before upload
 * @param file - File buffer
 * @param maxSizeInMB - Maximum file size in MB
 */
export function validateFile(
  file: Buffer | string,
  maxSizeInMB: number = 10
): { valid: boolean; error?: string } {
  if (typeof file === 'string') {
    // Base64 validation
    const base64Pattern = /^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,/;
    if (!base64Pattern.test(file)) {
      return { valid: false, error: 'Invalid base64 format' };
    }
    
    // Estimate size from base64
    const base64Length = file.replace(/^data:[^;]+;base64,/, '').length;
    const sizeInBytes = (base64Length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > maxSizeInMB) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeInMB}MB limit`,
      };
    }
  } else {
    const sizeInMB = file.length / (1024 * 1024);
    if (sizeInMB > maxSizeInMB) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeInMB}MB limit`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get file info from Cloudinary
 * @param publicId - The public_id of the file
 */
export async function getFileInfo(publicId: string): Promise<any> {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error: any) {
    console.error('Cloudinary get file info error:', error);
    throw new Error(`Failed to get file info: ${error.message}`);
  }
}

export default cloudinary;
