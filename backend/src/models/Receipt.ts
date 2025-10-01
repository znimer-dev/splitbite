import mongoose, { Document, Schema } from 'mongoose';

// Interface for people in the dining group
interface IPerson {
  id: string;
  name: string;
  email?: string;
  isRegisteredUser: boolean; // true if they have an account, false if just added for this receipt
}

// Interface for individual receipt items
interface IReceiptItem {
  name: string;
  quantity: number;
  price: number;
  assignedTo: string[]; // Array of person IDs
  sharedBy?: number; // How many people share this item (for equal splitting)
  notes?: string; // Optional notes about the item
}

// Interface for split calculations
interface ISplitCalculation {
  personId: string;
  name: string;
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  items: Array<{
    itemName: string;
    fullPrice: number;
    shareAmount: number;
    sharedWith: string[];
  }>;
}

// Interface for the receipt document
export interface IReceipt extends Document {
  userId: mongoose.Types.ObjectId;
  restaurantName: string;
  restaurantAddress?: string;
  date: Date;
  items: IReceiptItem[];
  people: IPerson[]; // People in the dining group
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  imageUrl: string;
  s3Key: string;
  s3Bucket: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrConfidence?: number;
  rawTextractData?: any; // Store raw OCR data for reference
  splitCalculations?: ISplitCalculation[]; // Calculated splits
  taxDistribution: 'proportional' | 'equal'; // How to distribute tax
  tipDistribution: 'proportional' | 'equal'; // How to distribute tip
  isComplete: boolean; // True when all items are assigned
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const ReceiptSchema = new Schema<IReceipt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true
    },
    restaurantAddress: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    people: [
      {
        id: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true,
          trim: true
        },
        email: {
          type: String,
          trim: true
        },
        isRegisteredUser: {
          type: Boolean,
          default: false
        }
      }
    ],
    items: [
      {
        name: {
          type: String,
          required: true,
          trim: true
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, 'Quantity must be at least 1']
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative']
        },
        assignedTo: [{
          type: String
        }],
        sharedBy: {
          type: Number,
          min: 1
        },
        notes: {
          type: String,
          trim: true
        }
      }
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    tip: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String,
      required: true
    },
    s3Key: {
      type: String,
      required: true
    },
    s3Bucket: {
      type: String,
      required: true
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100
    },
    rawTextractData: {
      type: Schema.Types.Mixed
    },
    splitCalculations: [
      {
        personId: String,
        name: String,
        subtotal: Number,
        taxShare: Number,
        tipShare: Number,
        total: Number,
        items: [
          {
            itemName: String,
            fullPrice: Number,
            shareAmount: Number,
            sharedWith: [String]
          }
        ]
      }
    ],
    taxDistribution: {
      type: String,
      enum: ['proportional', 'equal'],
      default: 'proportional'
    },
    tipDistribution: {
      type: String,
      enum: ['proportional', 'equal'],
      default: 'proportional'
    },
    isComplete: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for better query performance
ReceiptSchema.index({ userId: 1, createdAt: -1 });
ReceiptSchema.index({ restaurantName: 'text' });

export default mongoose.model<IReceipt>('Receipt', ReceiptSchema);