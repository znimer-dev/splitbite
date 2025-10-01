import { textract } from '../config/aws';
import AWS from 'aws-sdk';
import { OpenAIService } from './openaiService';

export interface ExtractedReceiptData {
  restaurantName?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  confidence: number;
  rawData: any;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  confidence: number;
}

export class TextractService {

  /**
   * Extract text from receipt image using AWS Textract + OpenAI parsing
   */
  static async extractReceiptData(s3Bucket: string, s3Key: string): Promise<ExtractedReceiptData> {
    try {
      // Step 1: Use Textract to extract raw text from the image
      console.log('📊 Extracting text with Textract...');
      const rawTextLines = await this.detectTextOnly(s3Bucket, s3Key);
      const textractOutput = rawTextLines.join('\n');

      console.log('📝 Raw Textract output:', textractOutput);

      // Step 2: Use OpenAI to intelligently parse the text
      console.log('🤖 Parsing with OpenAI...');
      const openaiService = new OpenAIService();
      const parsedData = await openaiService.parseReceiptText(textractOutput);

      // Step 3: Convert to our expected format
      const extractedData: ExtractedReceiptData = {
        restaurantName: parsedData.restaurantName,
        date: parsedData.date,
        items: parsedData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          confidence: 95 // OpenAI parsing is generally high confidence
        })),
        subtotal: parsedData.subtotal,
        tax: parsedData.tax,
        tip: parsedData.tip,
        total: parsedData.total,
        confidence: 95, // OpenAI parsing confidence
        rawData: {
          textractOutput,
          openaiParsed: parsedData
        }
      };

      console.log('✅ Final extracted data:', JSON.stringify(extractedData, null, 2));
      return extractedData;

    } catch (error) {
      console.error('❌ Receipt extraction error:', error);

      // Fallback to basic Textract parsing if OpenAI fails
      if (error instanceof Error && error.message.includes('OpenAI')) {
        console.log('⚠️ OpenAI failed, falling back to basic Textract parsing...');
        return this.extractReceiptDataFallback(s3Bucket, s3Key);
      }

      throw new Error(`Failed to extract text from receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fallback method using original Textract parsing
   */
  private static async extractReceiptDataFallback(s3Bucket: string, s3Key: string): Promise<ExtractedReceiptData> {
    try {
      const params = {
        Document: {
          S3Object: {
            Bucket: s3Bucket,
            Name: s3Key
          }
        },
        FeatureTypes: ['TABLES', 'FORMS']
      };

      const result = await textract.analyzeDocument(params).promise();

      if (!result.Blocks) {
        throw new Error('No text blocks found in the document');
      }

      const extractedData = this.parseTextractResponse(result.Blocks);

      return {
        ...extractedData,
        rawData: result
      };

    } catch (error) {
      console.error('Fallback Textract analysis error:', error);
      throw new Error(`Failed to extract text from receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Textract response into structured receipt data
   */
  private static parseTextractResponse(blocks: AWS.Textract.Block[]): Omit<ExtractedReceiptData, 'rawData'> {
    const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
    const lines = textBlocks
      .map(block => ({
        text: block.Text || '',
        confidence: block.Confidence || 0
      }))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Extract restaurant name (usually the first high-confidence line)
    const restaurantName = this.extractRestaurantName(lines);

    // Extract date
    const date = this.extractDate(lines);

    // Extract items and prices
    const items = this.extractItems(lines);

    // Extract totals
    const totals = this.extractTotals(lines);

    // Calculate overall confidence
    const avgConfidence = lines.reduce((sum, line) => sum + (line.confidence || 0), 0) / lines.length;

    return {
      restaurantName,
      date,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      tip: totals.tip,
      total: totals.total,
      confidence: avgConfidence
    };
  }

  /**
   * Extract restaurant name from text lines
   */
  private static extractRestaurantName(lines: { text: string; confidence: number }[]): string | undefined {
    // Look for the first line that's likely a restaurant name (high confidence, not a price/number)
    const restaurantLine = lines.find(line =>
      line.confidence > 80 &&
      line.text.length > 3 &&
      !this.containsPrice(line.text) &&
      !this.isDateLine(line.text)
    );

    return restaurantLine?.text.trim();
  }

  /**
   * Extract date from text lines
   */
  private static extractDate(lines: { text: string; confidence: number }[]): string | undefined {
    const dateLine = lines.find(line => this.isDateLine(line.text));
    return dateLine?.text.trim();
  }

  /**
   * Extract items and prices from text lines
   */
  private static extractItems(lines: { text: string; confidence: number }[]): ReceiptItem[] {
    const items: ReceiptItem[] = [];

    for (const line of lines) {
      const itemMatch = this.parseItemLine(line.text);
      if (itemMatch) {
        items.push({
          ...itemMatch,
          confidence: line.confidence
        });
      }
    }

    return items;
  }

  /**
   * Extract totals (subtotal, tax, tip, total) from text lines
   */
  private static extractTotals(lines: { text: string; confidence: number }[]): {
    subtotal?: number;
    tax?: number;
    tip?: number;
    total?: number;
  } {
    const totals: any = {};

    for (const line of lines) {
      const text = line.text.toLowerCase();
      const priceMatch = text.match(/(\d+\.?\d*)/);

      if (priceMatch) {
        const amount = parseFloat(priceMatch[1]);

        if (text.includes('subtotal') || text.includes('sub total')) {
          totals.subtotal = amount;
        } else if (text.includes('tax')) {
          totals.tax = amount;
        } else if (text.includes('tip') || text.includes('gratuity')) {
          totals.tip = amount;
        } else if (text.includes('total') && !text.includes('subtotal')) {
          totals.total = amount;
        }
      }
    }

    return totals;
  }

  /**
   * Check if a line contains a price
   */
  private static containsPrice(text: string): boolean {
    return /\$?\d+\.?\d*/.test(text);
  }

  /**
   * Check if a line contains a date
   */
  private static isDateLine(text: string): boolean {
    // Basic date patterns - can be enhanced
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // MM/DD/YYYY or M/D/YY
      /\d{1,2}-\d{1,2}-\d{2,4}/,   // MM-DD-YYYY or M-D-YY
      /\d{1,2}\.\d{1,2}\.\d{2,4}/,  // MM.DD.YYYY or M.D.YY
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i // Month names
    ];

    return datePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Parse a line to extract item information
   */
  private static parseItemLine(text: string): Omit<ReceiptItem, 'confidence'> | null {
    // Look for patterns like "Item Name $XX.XX" or "2x Item Name $XX.XX"
    const patterns = [
      /^(\d+)x?\s+(.+?)\s+\$?(\d+\.?\d*)$/i,  // "2x Item Name $XX.XX"
      /^(.+?)\s+\$?(\d+\.?\d*)$/i,            // "Item Name $XX.XX"
      /^(.+?)\s+(\d+)\s+\$?(\d+\.?\d*)$/i     // "Item Name 2 $XX.XX"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 4 && match[1].match(/^\d+$/)) {
          // Pattern: "2x Item Name $XX.XX"
          return {
            name: match[2].trim(),
            quantity: parseInt(match[1]),
            price: parseFloat(match[3])
          };
        } else if (match.length === 3) {
          // Pattern: "Item Name $XX.XX"
          return {
            name: match[1].trim(),
            quantity: 1,
            price: parseFloat(match[2])
          };
        } else if (match.length === 4) {
          // Pattern: "Item Name 2 $XX.XX"
          return {
            name: match[1].trim(),
            quantity: parseInt(match[2]),
            price: parseFloat(match[3])
          };
        }
      }
    }

    return null;
  }

  /**
   * Process receipt using synchronous Textract (for small documents)
   */
  static async detectTextOnly(s3Bucket: string, s3Key: string): Promise<string[]> {
    try {
      const params = {
        Document: {
          S3Object: {
            Bucket: s3Bucket,
            Name: s3Key
          }
        }
      };

      const result = await textract.detectDocumentText(params).promise();

      if (!result.Blocks) {
        throw new Error('No text blocks found in the document');
      }

      // Extract just the text lines
      return result.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text || '')
        .filter(text => text.trim().length > 0);

    } catch (error) {
      console.error('Textract text detection error:', error);
      throw new Error(`Failed to detect text from receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default TextractService;