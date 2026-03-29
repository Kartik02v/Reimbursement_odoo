import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let imageParts: any[] = [];

    if (imageBase64) {
      // Handle base64 image
      const [header, data] = imageBase64.split(';base64,');
      const mimeType = header.split(':').pop();
      imageParts = [{
        inlineData: {
          data: data || imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      }];
    } else if (imageUrl) {
      // Handle image URL
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      imageParts = [{
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: response.headers.get('content-type') || 'image/jpeg',
        },
      }];
    } else {
      return NextResponse.json(
        { error: 'No image source provided (imageUrl or imageBase64)' },
        { status: 400 }
      );
    }

    const prompt = `
      Extract information from this receipt and return it in a clean JSON format.
      The JSON should have these fields:
      - title: A short descriptive title for the expense
      - merchantName: Name of the merchant/store
      - amount: The total amount as a string (e.g. "125.50")
      - currency: The currency symbol or code (e.g. "USD", "$")
      - date: The date of the expense in YYYY-MM-DD format
      - categorySuggestion: A suggested expense category (e.g. Travel, Food, Supplies, Software, Medical)

      Return ONLY the raw JSON string.
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();
    
    // Clean JSON from markdown if necessary
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Vision API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image with Vision AI' },
      { status: 500 }
    );
  }
}
