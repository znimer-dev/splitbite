import mongoose, { Document, Schema } from 'mongoose';

// Interface for restaurant document
export interface IRestaurant extends Document {
  name: string;
  address?: string;
  cuisine?: string;
  website?: string;
  phone?: string;
  priceRange?: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
  averageRating?: number;
  visitCount: number;
  totalSpent: number;
  lastVisit: Date;
  userId: mongoose.Types.ObjectId; // User who added this restaurant
  isFavorite: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    cuisine: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    priceRange: {
      type: String,
      enum: ['budget', 'moderate', 'expensive', 'fine_dining']
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5
    },
    visitCount: {
      type: Number,
      default: 1,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    lastVisit: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for better query performance
RestaurantSchema.index({ userId: 1, name: 1 }, { unique: true }); // One restaurant per user
RestaurantSchema.index({ userId: 1, lastVisit: -1 });
RestaurantSchema.index({ userId: 1, isFavorite: 1, visitCount: -1 });

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);