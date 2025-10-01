import express, { Request, Response } from 'express';
import multer from 'multer';
import Receipt from '../models/Receipt';
import Restaurant from '../models/Restaurant';
import { S3Service } from '../services/s3Service';
import { TextractService } from '../services/textractService';
import { SplitCalculationService } from '../services/splitCalculationService';
import { OpenAIService } from '../services/openaiService';
import { S3_CONFIG } from '../config/aws';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for memory storage (we'll upload directly to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: S3_CONFIG.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (S3_CONFIG.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Middleware to validate user authentication (you'll need to implement this based on your auth system)
const authenticateUser = (req: Request, res: Response, next: express.NextFunction) => {
  // TODO: Implement JWT token validation
  // For now, we'll assume the user ID is passed in headers
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  req.userId = userId;
  next();
};

/**
 * POST /api/receipts/upload
 * Upload receipt image, process with OCR, and save to database
 */
router.post('/upload', authenticateUser, upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.userId!;

    // Step 1: Upload image to S3
    console.log('📸 Uploading image to S3...');
    const s3Result = await S3Service.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Step 2: Process with Textract
    console.log('🔍 Processing image with Textract...');
    const extractedData = await TextractService.extractReceiptData(
      s3Result.bucket,
      s3Result.key
    );

    // Step 3: Create receipt record in database
    const receipt = new Receipt({
      userId: new mongoose.Types.ObjectId(userId),
      restaurantName: extractedData.restaurantName || 'Unknown Restaurant',
      date: extractedData.date && !isNaN(new Date(extractedData.date).getTime()) ? new Date(extractedData.date) : new Date(),
      items: extractedData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        assignedTo: []
      })),
      subtotal: extractedData.subtotal || 0,
      tax: extractedData.tax || 0,
      tip: extractedData.tip || 0,
      total: extractedData.total || extractedData.subtotal || 0,
      imageUrl: s3Result.url,
      s3Key: s3Result.key,
      s3Bucket: s3Result.bucket,
      processingStatus: 'completed',
      ocrConfidence: extractedData.confidence,
      rawTextractData: extractedData.rawData
    });

    await receipt.save();

    // Step 4: Update restaurant history
    try {
      let restaurant = await Restaurant.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: receipt.restaurantName
      });

      if (restaurant) {
        // Update existing restaurant
        restaurant.visitCount += 1;
        // Don't update totalSpent here - only when split is finalized
        restaurant.lastVisit = receipt.date;
      } else {
        // Create new restaurant entry
        restaurant = new Restaurant({
          name: receipt.restaurantName,
          visitCount: 1,
          totalSpent: 0, // Will be updated when split is finalized
          lastVisit: receipt.date,
          userId: new mongoose.Types.ObjectId(userId)
        });
      }

      await restaurant.save();
      console.log('📍 Restaurant history updated');
    } catch (restaurantError) {
      console.error('Error updating restaurant history:', restaurantError);
      // Don't fail the receipt save if restaurant update fails
    }

    console.log('✅ Receipt processed and saved successfully');

    // Return the processed receipt data
    res.status(201).json({
      success: true,
      message: 'Receipt uploaded and processed successfully',
      receipt: {
        id: receipt._id,
        restaurantName: receipt.restaurantName,
        date: receipt.date,
        items: receipt.items,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        tip: receipt.tip,
        total: receipt.total,
        imageUrl: receipt.imageUrl,
        processingStatus: receipt.processingStatus,
        ocrConfidence: receipt.ocrConfidence,
        createdAt: receipt.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Receipt processing error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to process receipt',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/receipts
 * Get all receipts for the authenticated user
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const receipts = await Receipt.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-rawTextractData'); // Exclude raw data for performance

    const total = await Receipt.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

    res.json({
      success: true,
      receipts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReceipts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/receipts/restaurants/recalculate
 * Recalculate restaurant totals from completed splits
 */
router.post('/restaurants/recalculate', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    console.log('🔄 Starting restaurant totals recalculation...');

    // Get all restaurants for this user
    const restaurants = await Restaurant.find({ userId: new mongoose.Types.ObjectId(userId) });

    for (const restaurant of restaurants) {
      let newTotal = 0;

      // Find all completed receipts for this restaurant
      const completedReceipts = await Receipt.find({
        userId: new mongoose.Types.ObjectId(userId),
        restaurantName: restaurant.name,
        isComplete: true
      });

      // Sum up user's amounts from all completed splits
      for (const receipt of completedReceipts) {
        if (receipt.splitCalculations && receipt.splitCalculations.length > 0) {
          const meCalculation = receipt.splitCalculations.find(calc =>
            calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_')
          );

          if (meCalculation) {
            newTotal += meCalculation.total;
          }
        }
      }

      console.log(`📍 ${restaurant.name}: $${restaurant.totalSpent.toFixed(2)} → $${newTotal.toFixed(2)}`);
      restaurant.totalSpent = newTotal;
      await restaurant.save();
    }

    console.log('✅ Restaurant totals recalculation complete');

    res.json({
      success: true,
      message: 'Restaurant totals recalculated successfully',
      updated: restaurants.length
    });

  } catch (error) {
    console.error('Error recalculating restaurant totals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate restaurant totals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/receipts/restaurants
 * Get user's restaurant history
 */
router.get('/restaurants', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const restaurants = await Restaurant.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ lastVisit: -1 })
      .limit(50);

    res.json({
      success: true,
      restaurants
    });

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * DELETE /api/receipts/restaurants/:name
 * Delete a restaurant from history
 */
router.delete('/restaurants/:name', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name } = req.params;

    const restaurant = await Restaurant.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      name: decodeURIComponent(name)
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      success: true,
      message: 'Restaurant deleted successfully',
      deletedRestaurant: restaurant.name
    });

  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete restaurant',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * DELETE /api/receipts/restaurants
 * Clear all restaurant history for the user
 */
router.delete('/restaurants', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await Restaurant.deleteMany({
      userId: new mongoose.Types.ObjectId(userId)
    });

    res.json({
      success: true,
      message: `Cleared all restaurant history (${result.deletedCount} restaurants)`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing restaurant history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear restaurant history',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/receipts/:id
 * Get a specific receipt by ID
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Generate signed URL for secure image access
    const signedImageUrl = await S3Service.getSignedUrl(receipt.s3Key, 3600); // 1 hour expiry

    res.json({
      success: true,
      receipt: {
        ...receipt.toObject(),
        signedImageUrl
      }
    });

  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/receipts/:id
 * Update a receipt (for manual corrections after OCR)
 */
router.put('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    // Remove sensitive fields that shouldn't be updated
    delete updateData.userId;
    delete updateData.s3Key;
    delete updateData.s3Bucket;
    delete updateData.rawTextractData;

    const receipt = await Receipt.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      receipt
    });

  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update receipt',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * DELETE /api/receipts/:id
 * Delete a receipt and its associated S3 file
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete from S3
    if (receipt.s3Key) {
      await S3Service.deleteFile(receipt.s3Key);
    }

    // Update restaurant history - decrease visit count and total spent
    try {
      const restaurant = await Restaurant.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: receipt.restaurantName
      });

      if (restaurant) {
        restaurant.visitCount = Math.max(0, restaurant.visitCount - 1);

        // If receipt was completed (split was finalized), subtract user's amount
        // If not completed, nothing to subtract since we didn't add anything during upload
        let amountToSubtract = 0; // Default for incomplete receipts

        if (receipt.isComplete && receipt.splitCalculations && receipt.splitCalculations.length > 0) {
          // Find the "Me" person's amount from split calculations
          const meCalculation = receipt.splitCalculations.find(calc =>
            calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_')
          );

          if (meCalculation) {
            amountToSubtract = meCalculation.total;
            console.log(`📍 Using user's split amount for deletion: $${amountToSubtract}`);
          }
        } else {
          console.log(`📍 Receipt not completed, no amount to subtract from restaurant history`);
        }

        restaurant.totalSpent = Math.max(0, restaurant.totalSpent - amountToSubtract);

        // If no more visits, delete the restaurant entry
        if (restaurant.visitCount === 0) {
          await Restaurant.findByIdAndDelete(restaurant._id);
          console.log('📍 Restaurant removed from history (no more visits)');
        } else {
          // Find the most recent remaining receipt for this restaurant to update lastVisit
          const mostRecentReceipt = await Receipt.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            restaurantName: receipt.restaurantName,
            _id: { $ne: receipt._id } // Exclude the current receipt being deleted
          }).sort({ date: -1 });

          if (mostRecentReceipt) {
            restaurant.lastVisit = mostRecentReceipt.date;
          }

          await restaurant.save();
          console.log('📍 Restaurant history updated after receipt deletion');
        }
      }
    } catch (restaurantError) {
      console.error('Error updating restaurant history on deletion:', restaurantError);
      // Don't fail the receipt deletion if restaurant update fails
    }

    // Delete from database
    await Receipt.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete receipt',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/receipts/:id/people
 * Add people to a receipt
 */
router.post('/:id/people', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { people } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    if (!people || !Array.isArray(people)) {
      return res.status(400).json({ error: 'People array is required' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Add unique IDs to people if not provided
    const formattedPeople = people.map((person: any) => ({
      id: person.id || uuidv4(),
      name: person.name,
      email: person.email,
      isRegisteredUser: person.isRegisteredUser || false
    }));

    receipt.people = formattedPeople;
    await receipt.save();

    res.json({
      success: true,
      message: 'People added successfully',
      people: receipt.people
    });

  } catch (error) {
    console.error('Error adding people to receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add people to receipt',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/receipts/:id/items/:itemIndex/assign
 * Assign an item to people
 */
router.put('/:id/items/:itemIndex/assign', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id, itemIndex } = req.params;
    const { assignedTo, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const itemIdx = parseInt(itemIndex);
    if (itemIdx < 0 || itemIdx >= receipt.items.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    // Update item assignment
    receipt.items[itemIdx].assignedTo = assignedTo || [];
    if (notes !== undefined) {
      receipt.items[itemIdx].notes = notes;
    }

    // Calculate splits
    const splits = SplitCalculationService.calculateSplit(receipt);
    receipt.splitCalculations = splits;
    receipt.isComplete = SplitCalculationService.isReceiptComplete(receipt);

    await receipt.save();

    res.json({
      success: true,
      message: 'Item assignment updated successfully',
      item: receipt.items[itemIdx],
      splits,
      isComplete: receipt.isComplete
    });

  } catch (error) {
    console.error('Error assigning item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign item',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/receipts/:id/distribution
 * Update tax and tip distribution method
 */
router.put('/:id/distribution', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { taxDistribution, tipDistribution } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (taxDistribution) {
      receipt.taxDistribution = taxDistribution;
    }
    if (tipDistribution) {
      receipt.tipDistribution = tipDistribution;
    }

    // Recalculate splits with new distribution
    const splits = SplitCalculationService.calculateSplit(receipt);
    receipt.splitCalculations = splits;

    await receipt.save();

    res.json({
      success: true,
      message: 'Distribution updated successfully',
      splits,
      taxDistribution: receipt.taxDistribution,
      tipDistribution: receipt.tipDistribution
    });

  } catch (error) {
    console.error('Error updating distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update distribution',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/receipts/:id/split
 * Get split calculation for a receipt
 */
router.get('/:id/split', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const splits = SplitCalculationService.calculateSplit(receipt);
    const stats = SplitCalculationService.getReceiptStats(receipt, splits);
    const unassignedItems = SplitCalculationService.getUnassignedItems(receipt);

    res.json({
      success: true,
      splits,
      stats,
      unassignedItems,
      isComplete: SplitCalculationService.isReceiptComplete(receipt)
    });

  } catch (error) {
    console.error('Error getting split calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get split calculation',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/receipts/:id/finalize-split
 * Finalize the split and update restaurant history with user's amount
 */
router.put('/:id/finalize-split', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { userAmount } = req.body; // Amount the current user (Me) spent

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    if (typeof userAmount !== 'number' || userAmount < 0) {
      return res.status(400).json({ error: 'Valid user amount is required' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Update restaurant history with user's specific amount
    try {
      const restaurant = await Restaurant.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: receipt.restaurantName
      });

      if (restaurant) {
        // Only update if receipt hasn't been finalized before
        if (!receipt.isComplete) {
          const oldTotal = restaurant.totalSpent;
          // Add user's actual amount to total spent
          restaurant.totalSpent += userAmount;
          await restaurant.save();
          console.log(`📍 Restaurant ${receipt.restaurantName}:`);
          console.log(`   Old total: $${oldTotal.toFixed(2)}`);
          console.log(`   User amount: $${userAmount.toFixed(2)}`);
          console.log(`   New total: $${restaurant.totalSpent.toFixed(2)}`);
        } else {
          console.log(`📍 Receipt already finalized for ${receipt.restaurantName}, skipping restaurant update`);
        }
      } else {
        console.error(`Restaurant not found: ${receipt.restaurantName}`);
      }
    } catch (restaurantError) {
      console.error('Error updating restaurant with user amount:', restaurantError);
      // Don't fail the split save if restaurant update fails
    }

    // Mark receipt as complete
    receipt.isComplete = true;
    await receipt.save();

    res.json({
      success: true,
      message: 'Split finalized and restaurant history updated',
      userAmount
    });

  } catch (error) {
    console.error('Error finalizing split:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize split',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/receipts/:id/summary
 * Get shareable summary of the split
 */
router.get('/:id/summary', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid receipt ID format' });
    }

    const receipt = await Receipt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const splits = SplitCalculationService.calculateSplit(receipt);
    const summary = SplitCalculationService.generateShareableSummary(receipt, splits);

    res.json({
      success: true,
      summary,
      splits
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Restaurant route moved above to avoid conflict with /:id

/**
 * PUT /api/receipts/restaurants/:name/favorite
 * Toggle restaurant favorite status
 */
router.put('/restaurants/:name/favorite', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name } = req.params;

    const restaurant = await Restaurant.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      name: name
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    restaurant.isFavorite = !restaurant.isFavorite;
    await restaurant.save();

    res.json({
      success: true,
      message: `Restaurant ${restaurant.isFavorite ? 'added to' : 'removed from'} favorites`,
      restaurant
    });

  } catch (error) {
    console.error('Error updating restaurant favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant favorite',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/receipts/test-openai
 * Test OpenAI connection and parsing
 */
router.post('/test-openai', async (req: Request, res: Response) => {
  try {
    console.log('🤖 Testing OpenAI connection...');

    const openaiService = new OpenAIService();

    // Test basic connection
    const connectionTest = await openaiService.testConnection();

    if (!connectionTest) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI connection failed'
      });
    }

    // Test receipt parsing with sample data
    const sampleReceiptText = `
    Restaurant ABC
    123 Main St
    01/15/2024

    Burger                $12.99
    Fries                 $4.50
    Coke                  $2.99

    Subtotal             $20.48
    Tax                   $1.64
    Tip                   $3.00
    Total                $25.12
    `;

    const parsedReceipt = await openaiService.parseReceiptText(sampleReceiptText);

    res.json({
      success: true,
      message: 'OpenAI integration is working correctly',
      connectionTest: connectionTest,
      sampleParsing: parsedReceipt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OpenAI test error:', error);
    res.status(500).json({
      success: false,
      error: 'OpenAI test failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;