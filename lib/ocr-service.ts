export interface OCRResult {
  title: string;
  merchantName: string;
  amount: string;
  currency: string;
  date: string;
  categorySuggestion: string;
}

export class OCRService {
  /**
   * Upload an image to Cloudinary with advanced error handling.
   * @param file - The image file to upload.
   * @returns {Promise<string>} - The URL of the uploaded image.
   */
  static async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading to internal Secure Upload API...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Secure Upload API Error:', errorData);
        throw new Error(`Failed to upload to secure server: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Secure Upload Successful:', data.secure_url);
      return data.secure_url;
    } catch (error: any) {
      console.error('Secure Upload Network/Runtime Error:', error);
      throw error;
    }
  }

  /**
   * Run high-accuracy Vision OCR on an image using Gemini 1.5 Flash.
   * @param imageUrl - The publicly accessible URL of the image.
   * @param imageBase64 - Optional base64 fallback.
   * @returns {Promise<OCRResult>} - The parsed expense data.
   */
  static async scanWithVision(imageUrl: string, imageBase64?: string): Promise<OCRResult> {
    try {
      console.log('Sending image to Gemini Vision API...');
      const response = await fetch('/api/vision/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, imageBase64 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process image with Vision AI.');
      }

      const result = await response.json();
      console.log('Vision Analysis Successful:', result.data);
      return result.data as OCRResult;
    } catch (error: any) {
      console.error('Vision Scanning Error:', error);
      throw error;
    }
  }
}
