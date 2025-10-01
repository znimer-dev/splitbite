import OpenAI from 'openai';

interface ParsedReceipt {
  restaurantName: string;
  restaurantAddress?: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Fix for SSL certificate issues in development
    if (process.env.NODE_ENV === 'development') {
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseReceiptText(textractOutput: string): Promise<ParsedReceipt> {
    try {
      const prompt = `
Parse this receipt text from AWS Textract OCR output and extract the following information in valid JSON format:

TEXTRACT OUTPUT:
${textractOutput}

Please extract and return ONLY a valid JSON object with this exact structure:
{
  "restaurantName": "string - name of the restaurant",
  "restaurantAddress": "string - address if available, or null",
  "date": "string - date in YYYY-MM-DD format, or today's date if not found",
  "items": [
    {
      "name": "string - item name",
      "quantity": number - quantity (default 1 if not specified),
      "price": number - individual item price (not total for quantity)
    }
  ],
  "subtotal": number - subtotal amount,
  "tax": number - tax amount,
  "tip": number - tip amount (0 if not found),
  "total": number - total amount
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. For items, extract the individual price per item, not the total for multiple quantities
3. If quantity is not specified, assume 1
4. Clean up item names (remove extra characters, numbers that aren't quantities)
5. Convert all prices to numbers (remove $ signs, commas)
6. If date is not found, use today's date in YYYY-MM-DD format
7. If any numeric value is not found, use 0
8. Ensure the JSON is properly formatted and parseable

Example item: "2x Burger $15.00" should be:
{
  "name": "Burger",
  "quantity": 2,
  "price": 7.50
}
`;

      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a precise receipt parser. Return only valid JSON with the exact structure requested. Do not include any explanation or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gpt-4o-mini', // Using the more cost-effective model
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No response from OpenAI API');
      }

      console.log('🤖 OpenAI Raw Response:', response);

      // Try to parse the JSON response
      let parsedData: ParsedReceipt;
      try {
        // Clean the response in case there's any extra text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI JSON response:', response);
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Validate the parsed data structure
      if (!parsedData.restaurantName || !Array.isArray(parsedData.items)) {
        throw new Error('Invalid receipt data structure from OpenAI');
      }

      // Ensure all required fields have default values
      const result: ParsedReceipt = {
        restaurantName: parsedData.restaurantName || 'Unknown Restaurant',
        restaurantAddress: parsedData.restaurantAddress || undefined,
        date: parsedData.date || new Date().toISOString().split('T')[0],
        items: parsedData.items.map(item => ({
          name: item.name || 'Unknown Item',
          quantity: Math.max(1, item.quantity || 1),
          price: Math.max(0, item.price || 0)
        })),
        subtotal: Math.max(0, parsedData.subtotal || 0),
        tax: Math.max(0, parsedData.tax || 0),
        tip: Math.max(0, parsedData.tip || 0),
        total: Math.max(0, parsedData.total || 0)
      };

      console.log('✅ Parsed receipt data:', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.error('❌ OpenAI parsing error:', error);
      throw new Error(`Failed to parse receipt with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello, respond with "OK" if you can receive this message.' }],
        model: 'gpt-4o-mini',
        max_tokens: 10
      });

      return completion.choices[0]?.message?.content?.includes('OK') || false;
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error);
      return false;
    }
  }
}

export default OpenAIService;