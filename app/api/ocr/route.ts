import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return apiError('No sufficient text provided for parsing', 400, 'BAD_REQUEST');
    }

    const systemPrompt = `
      You are an expert expense receipt parser. Your task is to extract structured information from the raw OCR text of a receipt.
      Provide the result in valid JSON format ONLY, without any markdown formatting or extra text.
      
      Fields to extract:
      - title: A short, descriptive name for the expense (e.g., "Business Lunch", "Office Supplies").
      - merchantName: Name of the store or company (e.g., "Starbucks", "Amazon").
      - amount: The total numerical amount as a string (e.g., "45.00").
      - currency: The 3-letter currency code (e.g., "USD", "INR", "EUR").
      - date: The date in ISO format YYYY-MM-DD (e.g., "2024-03-29").
      - categorySuggestion: A suggested category name (one of: Food, Travel, Supplies, Software, Other).

      If a field is not found, use an empty string.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this receipt text: ${text}` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content || '{}');

    return apiResponse(result);
  } catch (error) {
    console.error('OCR Parsing Error:', error);
    return handleApiError(error);
  }
}
