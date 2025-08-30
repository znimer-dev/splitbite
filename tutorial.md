# Building SplitBite: Complete Receipt OCR & Bill Splitting MVP Tutorial

## Table of Contents
1. [Prerequisites & Environment Setup](#prerequisites)
2. [Project Architecture Overview](#architecture)
3. [Setting Up Your Development Environment](#dev-setup)
4. [Backend Development](#backend)
5. [Database Setup with MongoDB](#database)
6. [AWS Services Configuration](#aws-setup)
7. [Frontend Development](#frontend)
8. [Connecting Everything Together](#integration)
9. [Testing Your MVP](#testing)
10. [Deployment](#deployment)

---

## Prerequisites & Environment Setup {#prerequisites}

### What We're Building
A web application where users can:
1. Upload a photo of a restaurant receipt
2. Automatically extract all items, prices, and totals
3. Split the bill between multiple people
4. See their dining history and spending

### Required Software to Install

Before we start coding, you need to install these tools on your computer:

#### 1. Node.js and npm
Node.js is the JavaScript runtime for our backend, and npm is the package manager.

**Installation:**
- Go to [nodejs.org](https://nodejs.org/)
- Download the LTS version (should be 18.x or higher)
- Run the installer
- Verify installation by opening Terminal/Command Prompt and typing:
```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

#### 2. Visual Studio Code (VS Code)
This is our code editor - it's free and powerful.

**Installation:**
- Go to [code.visualstudio.com](https://code.visualstudio.com/)
- Download and install
- Open VS Code and install these extensions:
  - Click the Extensions icon (square icon on left sidebar)
  - Search and install:
    - "ESLint" (code quality)
    - "Prettier" (code formatting)
    - "Thunder Client" (API testing)
    - "MongoDB for VS Code"

#### 3. Git
Version control system to track your code changes.

**Installation:**
- Go to [git-scm.com](https://git-scm.com/)
- Download and install
- Verify with:
```bash
git --version
# Should show: git version 2.x.x
```

#### 4. MongoDB Atlas Account (Free)
We'll use cloud MongoDB so you don't need to install it locally.

**Setup:**
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Click "Try Free"
3. Create account with your email
4. We'll configure it together in the Database section

#### 5. AWS Account
For image storage and OCR processing.

**Setup:**
1. Go to [aws.amazon.com](https://aws.amazon.com/)
2. Click "Create an AWS Account"
3. You'll need a credit card (but we'll stay in free tier)
4. Important: Enable MFA for security

---

## Project Architecture Overview {#architecture}

Here's how our app will work:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   React App     │────▶│   Node.js API   │────▶│    MongoDB      │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               │
                               ▼
                    ┌─────────────────────┐
                    │                     │
                    │    AWS Services     │
                    │  - S3 (Storage)     │
                    │  - Textract (OCR)   │
                    │                     │
                    └─────────────────────┘
```

**Flow Explanation:**
1. User uploads receipt photo in React app
2. React sends image to Node.js backend
3. Backend uploads image to AWS S3
4. Backend calls AWS Textract to extract text
5. Backend processes and stores data in MongoDB
6. Backend sends structured data back to React
7. React displays the receipt data and bill splitting interface

---

## Setting Up Your Development Environment {#dev-setup}

### Step 1: Create Your Project Folder

Open Terminal (Mac/Linux) or Command Prompt (Windows):

```bash
# Navigate to your desktop (or wherever you want to work)
cd ~/Desktop

# Create main project folder
mkdir splitbite-mvp
cd splitbite-mvp

# Create folders for frontend and backend
mkdir backend
mkdir frontend
```

### Step 2: Initialize Git Repository

```bash
# Initialize git in the main folder
git init

# Create a .gitignore file to exclude files from git
echo "node_modules/
.env
.DS_Store
*.log
build/
dist/" > .gitignore

# Make your first commit
git add .
git commit -m "Initial project setup"
```

---

## Backend Development {#backend}

Let's build our server that will handle all the business logic.

### Step 1: Initialize the Backend Project

```bash
# Navigate to backend folder
cd backend

# Initialize a new Node.js project
npm init -y
```

This creates a `package.json` file. This file tracks all the packages we'll use.

### Step 2: Install Required Packages

```bash
# Install main dependencies
npm install express cors dotenv mongoose multer aws-sdk bcryptjs jsonwebtoken

# Install TypeScript and development dependencies
npm install -D typescript @types/node @types/express @types/cors @types/multer @types/bcryptjs @types/jsonwebtoken nodemon ts-node
```

**What each package does:**
- `express`: Web framework for creating our API
- `cors`: Allows frontend to communicate with backend
- `dotenv`: Manages environment variables (secrets)
- `mongoose`: MongoDB connection and data modeling
- `multer`: Handles file uploads
- `aws-sdk`: Connects to AWS services
- `bcryptjs`: Password hashing for user security
- `jsonwebtoken`: User authentication tokens
- `typescript`: Adds type safety to JavaScript
- `nodemon`: Auto-restarts server when you make changes

### Step 3: Configure TypeScript

Create `tsconfig.json` in the backend folder:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Create Project Structure

```bash
# Create source folder and subfolders
mkdir src
cd src
mkdir config controllers middleware models routes services types utils
cd ..
```

### Step 5: Update package.json Scripts

Edit `backend/package.json` and update the "scripts" section:

```json
"scripts": {
  "dev": "nodemon src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

### Step 6: Create Environment Variables File

Create `.env` file in backend folder:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB (we'll fill this later)
MONGODB_URI=

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS Configuration (we'll fill these later)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=
```

### Step 7: Create the Main Server File

Create `backend/src/server.ts`:

```typescript
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic route to test server
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SplitBite API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (should be last)
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // We'll add MongoDB connection here later
    
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();
```

### Step 8: Test Your Server

```bash
# In the backend folder, run:
npm run dev
```

You should see:
```
✅ Server is running on http://localhost:5000
📱 Environment: development
```

Open your browser and go to `http://localhost:5000`. You should see:
```json
{
  "message": "SplitBite API is running!",
  "timestamp": "2024-01-15T..."
}
```

**Congratulations! Your backend server is running!** 🎉

---

## Database Setup with MongoDB {#database}

### Step 1: Set Up MongoDB Atlas

1. Log into [MongoDB Atlas](https://cloud.mongodb.com)
2. Click "New Project"
   - Name it: "splitbite-mvp"
   - Click "Create Project"

3. Click "Build a Database"
   - Choose "FREE Shared" option
   - Select AWS provider
   - Choose region closest to you
   - Click "Create"

4. Set up authentication:
   - Username: `splitbiteadmin`
   - Password: Generate a secure password (save it!)
   - Click "Create User"

5. Set up network access:
   - Click "Add My Current IP Address"
   - For development, also add: `0.0.0.0/0` (allows access from anywhere)
   - Click "Finish and Close"

6. Get your connection string:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string, it looks like:
   ```
   mongodb+srv://splitbiteadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

7. Update your `.env` file:
   ```env
   MONGODB_URI=mongodb+srv://splitbiteadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/splitbite?retryWrites=true&w=majority
   ```
   (Replace YOUR_PASSWORD with your actual password, add `/splitbite` before the `?`)

### Step 2: Create Database Models

Create `backend/src/models/User.ts`:

```typescript
import mongoose, { Document, Schema } from 'mongoose';

// Define the shape of a User document
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => {
          // Simple email validation
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email'
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create and export the model
export default mongoose.model<IUser>('User', UserSchema);
```

Create `backend/src/models/Receipt.ts`:

```typescript
import mongoose, { Document, Schema } from 'mongoose';

// Interface for individual receipt items
interface IReceiptItem {
  name: string;
  quantity: number;
  price: number;
  assignedTo?: string[]; // Array of user IDs for bill splitting
}

// Interface for the receipt document
export interface IReceipt extends Document {
  userId: mongoose.Types.ObjectId;
  restaurantName: string;
  date: Date;
  items: IReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  imageUrl: string;
  rawTextractData?: any; // Store raw OCR data for reference
  splitBetween?: Array<{
    userId: string;
    name: string;
    amount: number;
    items: string[];
  }>;
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
    date: {
      type: Date,
      default: Date.now
    },
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
        }]
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
    rawTextractData: {
      type: Schema.Types.Mixed
    },
    splitBetween: [
      {
        userId: String,
        name: String,
        amount: Number,
        items: [String]
      }
    ]
  },
  {
    timestamps: true
  }
);

// Add indexes for better query performance
ReceiptSchema.index({ userId: 1, createdAt: -1 });
ReceiptSchema.index({ restaurantName: 'text' });

export default mongoose.model<IReceipt>('Receipt', ReceiptSchema);
```

### Step 3: Connect to MongoDB

Update `backend/src/server.ts` to connect to MongoDB:

```typescript
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection function
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Basic route to test server
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SplitBite API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK',
    database: dbStatus,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();
```

Restart your server (`npm run dev`) and you should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
✅ Server is running on http://localhost:5000
📱 Environment: development
```

---

## AWS Services Configuration {#aws-setup}

### Step 1: Set Up IAM User for Your App

1. Log into AWS Console
2. Search for "IAM" and click on it
3. Click "Users" → "Add users"
4. User name: `splitbite-app`
5. Select "Access key - Programmatic access"
6. Click "Next: Permissions"
7. Click "Attach existing policies directly"
8. Search and select these policies:
   - `AmazonS3FullAccess`
   - `AmazonTextractFullAccess`
9. Click "Next" → "Next" → "Create user"
10. **IMPORTANT**: Save the Access Key ID and Secret Access Key!

Update your `.env` file:
```env
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=us-east-1
```

### Step 2: Create S3 Bucket for Receipt Images

1. Search for "S3" in AWS Console
2. Click "Create bucket"
3. Bucket name: `splitbite-receipts-[your-name]` (must be globally unique)
4. Region: US East (N. Virginia) us-east-1
5. Uncheck "Block all public access" (we'll use signed URLs)
6. Acknowledge the warning
7. Click "Create bucket"

Update your `.env` file:
```env
AWS_S3_BUCKET_NAME=splitbite-receipts-[your-name]
```

### Step 3: Configure CORS for S3 Bucket

1. Click on your bucket name
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit" and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

5. Click "Save changes"

### Step 4: Create AWS Service File

Create `backend/src/services/aws.service.ts`:

```typescript
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 instance
const s3 = new AWS.S3();

// Create Textract instance
const textract = new AWS.Textract();

// Service class for AWS operations
export class AWSService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }
  }

  /**
   * Upload image to S3
   */
  async uploadImage(file: Express.Multer.File, userId: string): Promise<string> {
    const timestamp = Date.now();
    const key = `receipts/${userId}/${timestamp}-${file.originalname}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        userId: userId,
        originalName: file.originalname
      }
    };

    try {
      const result = await s3.upload(params).promise();
      console.log('✅ Image uploaded to S3:', result.Location);
      return result.Location;
    } catch (error) {
      console.error('❌ S3 upload error:', error);
      throw new Error('Failed to upload image to S3');
    }
  }

  /**
   * Delete image from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    // Extract key from URL
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1); // Remove leading '/'

    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    try {
      await s3.deleteObject(params).promise();
      console.log('✅ Image deleted from S3:', key);
    } catch (error) {
      console.error('❌ S3 delete error:', error);
      throw new Error('Failed to delete image from S3');
    }
  }

  /**
   * Process receipt with Textract
   */
  async extractTextFromReceipt(imageUrl: string): Promise<any> {
    // Extract bucket and key from URL
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1);

    const params = {
      Document: {
        S3Object: {
          Bucket: this.bucketName,
          Name: key
        }
      },
      FeatureTypes: ['TABLES', 'FORMS'] // Extract tables and key-value pairs
    };

    try {
      console.log('🔍 Processing receipt with Textract...');
      const result = await textract.analyzeDocument(params).promise();
      console.log('✅ Textract processing complete');
      return this.parseTextractResult(result);
    } catch (error) {
      console.error('❌ Textract error:', error);
      throw new Error('Failed to process receipt with OCR');
    }
  }

  /**
   * Parse Textract result into structured data
   */
  private parseTextractResult(textractResult: any): any {
    const blocks = textractResult.Blocks || [];
    const extractedData = {
      rawText: '',
      lines: [] as string[],
      keyValuePairs: {} as any,
      tables: [] as any[],
      items: [] as any[]
    };

    // Extract all text lines
    blocks.forEach((block: any) => {
      if (block.BlockType === 'LINE') {
        extractedData.lines.push(block.Text);
        extractedData.rawText += block.Text + '\n';
      }
    });

    // Parse receipt items (basic implementation)
    // This is a simplified parser - you can make it more sophisticated
    const parsedReceipt = this.parseReceiptLines(extractedData.lines);

    return {
      ...extractedData,
      parsed: parsedReceipt
    };
  }

  /**
   * Parse receipt lines into structured data
   * This is a basic implementation - enhance based on your needs
   */
  private parseReceiptLines(lines: string[]): any {
    const receipt: any = {
      restaurantName: '',
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0
    };

    // Simple patterns for common receipt formats
    const pricePattern = /\$?\d+\.?\d{0,2}/;
    const itemPattern = /^(.+?)\s+(\$?\d+\.?\d{0,2})$/;
    const subtotalPattern = /subtotal|sub\s*total/i;
    const taxPattern = /tax/i;
    const tipPattern = /tip|gratuity/i;
    const totalPattern = /total|amount\s*due|balance/i;

    // First non-empty line is often the restaurant name
    for (let i = 0; i < lines.length && !receipt.restaurantName; i++) {
      if (lines[i].trim().length > 2) {
        receipt.restaurantName = lines[i].trim();
        break;
      }
    }

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;

      // Check for totals
      if (totalPattern.test(line) && !subtotalPattern.test(line)) {
        const match = line.match(pricePattern);
        if (match) {
          receipt.total = parseFloat(match[0].replace('$', ''));
        }
      } else if (subtotalPattern.test(line)) {
        const match = line.match(pricePattern);
        if (match) {
          receipt.subtotal = parseFloat(match[0].replace('$', ''));
        }
      } else if (taxPattern.test(line)) {
        const match = line.match(pricePattern);
        if (match) {
          receipt.tax = parseFloat(match[0].replace('$', ''));
        }
      } else if (tipPattern.test(line)) {
        const match = line.match(pricePattern);
        if (match) {
          receipt.tip = parseFloat(match[0].replace('$', ''));
        }
      } else {
        // Try to parse as an item
        const itemMatch = line.match(itemPattern);
        if (itemMatch) {
          receipt.items.push({
            name: itemMatch[1].trim(),
            quantity: 1,
            price: parseFloat(itemMatch[2].replace('$', ''))
          });
        }
      }
    }

    // Calculate missing values
    if (!receipt.subtotal && receipt.items.length > 0) {
      receipt.subtotal = receipt.items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0
      );
    }

    if (!receipt.total && receipt.subtotal) {
      receipt.total = receipt.subtotal + receipt.tax + receipt.tip;
    }

    return receipt;
  }

  /**
   * Get a signed URL for secure uploads directly from frontend
   */
  async getSignedUploadUrl(fileName: string, fileType: string, userId: string): Promise<any> {
    const timestamp = Date.now();
    const key = `receipts/${userId}/${timestamp}-${fileName}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 300, // URL expires in 5 minutes
      ContentType: fileType,
      Metadata: {
        userId: userId
      }
    };

    try {
      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
      return {
        uploadUrl,
        key,
        imageUrl: `https://${this.bucketName}.s3.amazonaws.com/${key}`
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }
}

// Export singleton instance
export default new AWSService();
```

---

## Creating API Routes

### Step 1: Create Authentication Middleware

Create `backend/src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = decoded;
    } catch (error) {
      // Invalid token, but we don't fail the request
      console.log('Invalid token provided');
    }
  }
  
  next();
};
```

### Step 2: Create Upload Middleware

Create `backend/src/middleware/upload.middleware.ts`:

```typescript
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Create multer instance with size limit
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
```

### Step 3: Create Authentication Routes

Create `backend/src/routes/auth.routes.ts`:

```typescript
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

const router = express.Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Send response (don't send password back)
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register user',
      details: error.message 
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Send response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login',
      details: error.message 
    });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 * Requires authentication
 */
router.get('/me', async (req: Request, res: Response) => {
  // This route will use auth middleware
  try {
    const userId = (req as any).user?.userId;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      details: error.message 
    });
  }
});

export default router;
```

### Step 4: Create Receipt Routes

Create `backend/src/routes/receipt.routes.ts`:

```typescript
import express, { Request, Response } from 'express';
import Receipt from '../models/Receipt';
import awsService from '../services/aws.service';
import { upload } from '../middleware/upload.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Upload and process a receipt
 * POST /api/receipts/upload
 */
router.post('/upload', 
  authenticateToken, 
  upload.single('receipt'), 
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const userId = (req as any).user.userId;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('📤 Uploading receipt for user:', userId);

      // Step 1: Upload to S3
      const imageUrl = await awsService.uploadImage(file, userId);

      // Step 2: Process with Textract
      const ocrResult = await awsService.extractTextFromReceipt(imageUrl);

      // Step 3: Create receipt record
      const receipt = new Receipt({
        userId,
        restaurantName: ocrResult.parsed.restaurantName || 'Unknown Restaurant',
        items: ocrResult.parsed.items || [],
        subtotal: ocrResult.parsed.subtotal || 0,
        tax: ocrResult.parsed.tax || 0,
        tip: ocrResult.parsed.tip || 0,
        total: ocrResult.parsed.total || 0,
        imageUrl,
        rawTextractData: ocrResult
      });

      await receipt.save();

      res.status(201).json({
        message: 'Receipt processed successfully',
        receipt,
        ocrData: ocrResult.parsed
      });

    } catch (error: any) {
      console.error('Receipt upload error:', error);
      res.status(500).json({ 
        error: 'Failed to process receipt',
        details: error.message 
      });
    }
});

/**
 * Get all receipts for logged-in user
 * GET /api/receipts
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Get query parameters for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get receipts with pagination
    const receipts = await Receipt.find({ userId })
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Receipt.countDocuments({ userId });

    res.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get receipts error:', error);
    res.status(500).json({ 
      error: 'Failed to get receipts',
      details: error.message 
    });
  }
});

/**
 * Get single receipt by ID
 * GET /api/receipts/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const receiptId = req.params.id;

    const receipt = await Receipt.findOne({ 
      _id: receiptId, 
      userId // Ensure user owns this receipt
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt });

  } catch (error: any) {
    console.error('Get receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to get receipt',
      details: error.message 
    });
  }
});

/**
 * Update receipt (for manual corrections)
 * PUT /api/receipts/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const receiptId = req.params.id;
    const updates = req.body;

    // Find and update receipt
    const receipt = await Receipt.findOneAndUpdate(
      { 
        _id: receiptId, 
        userId 
      },
      updates,
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ 
      message: 'Receipt updated successfully',
      receipt 
    });

  } catch (error: any) {
    console.error('Update receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to update receipt',
      details: error.message 
    });
  }
});

/**
 * Delete receipt
 * DELETE /api/receipts/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const receiptId = req.params.id;

    // Find receipt
    const receipt = await Receipt.findOne({ 
      _id: receiptId, 
      userId 
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete image from S3
    await awsService.deleteImage(receipt.imageUrl);

    // Delete receipt from database
    await receipt.deleteOne();

    res.json({ 
      message: 'Receipt deleted successfully' 
    });

  } catch (error: any) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to delete receipt',
      details: error.message 
    });
  }
});

/**
 * Split a receipt
 * POST /api/receipts/:id/split
 */
router.post('/:id/split', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const receiptId = req.params.id;
    const { splits } = req.body; // Array of split assignments

    const receipt = await Receipt.findOne({ 
      _id: receiptId, 
      userId 
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Calculate split amounts
    const splitCalculations = splits.map((split: any) => {
      const assignedItems = receipt.items.filter(item => 
        split.itemIds.includes(item._id.toString())
      );

      const itemsTotal = assignedItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      // Calculate proportional tax and tip
      const proportion = itemsTotal / receipt.subtotal;
      const taxShare = receipt.tax * proportion;
      const tipShare = receipt.tip * proportion;

      return {
        userId: split.userId,
        name: split.name,
        items: assignedItems.map(item => item.name),
        amount: itemsTotal + taxShare + tipShare
      };
    });

    // Update receipt with split information
    receipt.splitBetween = splitCalculations;
    await receipt.save();

    res.json({
      message: 'Receipt split successfully',
      splits: splitCalculations,
      receipt
    });

  } catch (error: any) {
    console.error('Split receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to split receipt',
      details: error.message 
    });
  }
});

export default router;
```

### Step 5: Update Server to Use Routes

Update `backend/src/server.ts`:

```typescript
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth.routes';
import receiptRoutes from './routes/receipt.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);

// MongoDB connection function
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Basic route to test server
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SplitBite API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      receipts: '/api/receipts'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK',
    database: dbStatus,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔐 JWT configured: ${!!process.env.JWT_SECRET}`);
      console.log(`☁️  AWS configured: ${!!process.env.AWS_ACCESS_KEY_ID}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();
```

---

## Frontend Development {#frontend}

Now let's build a beautiful, modern React frontend!

### Step 1: Create React App with TypeScript

Open a new terminal window (keep backend running):

```bash
# Navigate to your project root
cd ~/Desktop/splitbite-mvp

# Create React app with TypeScript
npx create-react-app frontend --template typescript

# Navigate to frontend
cd frontend

# Install additional packages
npm install axios react-router-dom @types/react-router-dom
npm install react-dropzone react-hot-toast
npm install @heroicons/react
npm install -D tailwindcss postcss autoprefixer
```

### Step 2: Set Up Tailwind CSS for Styling

```bash
# Initialize Tailwind
npx tailwindcss init -p
```

Update `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

Update `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 
           transition-colors duration-200 font-medium focus:outline-none 
           focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 
           transition-colors duration-200 font-medium border border-gray-300
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }

  .input-field {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
           focus:ring-primary-500 focus:border-transparent transition-all duration-200;
  }

  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}
```

### Step 3: Set Up API Service

Create `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getMe: () => api.get('/auth/me'),
};

// Receipt APIs
export const receiptAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getAll: (page = 1, limit = 10) =>
    api.get(`/receipts?page=${page}&limit=${limit}`),

  getById: (id: string) =>
    api.get(`/receipts/${id}`),

  update: (id: string, data: any) =>
    api.put(`/receipts/${id}`, data),

  delete: (id: string) =>
    api.delete(`/receipts/${id}`),

  split: (id: string, splits: any) =>
    api.post(`/receipts/${id}/split`, { splits }),
};

export default api;
```

### Step 4: Create Context for Authentication

Create `frontend/src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authAPI.register({ email, password, name });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Step 5: Create App Components

Create `frontend/src/components/Layout.tsx`:

```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SplitBite</span>
            </Link>

            {/* Navigation Links */}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  <HomeIcon className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                
                <Link
                  to="/receipts"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Receipts</span>
                </Link>

                <Link
                  to="/upload"
                  className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New Receipt</span>
                </Link>

                <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
```

Create `frontend/src/pages/Login.tsx`:

```typescript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-600 mt-2">Sign in to your SplitBite account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
```

Create `frontend/src/pages/Register.tsx`:

```typescript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-600 mt-2">Start splitting bills in seconds</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
```

Create `frontend/src/pages/Upload.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { receiptAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  XMarkIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setProcessing(true);

    try {
      const response = await receiptAPI.upload(file);
      toast.success('Receipt processed successfully!');
      navigate(`/receipts/${response.data.receipt._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process receipt');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Receipt</h1>
        <p className="mt-2 text-gray-600">
          Take a photo or upload an image of your restaurant receipt
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            
            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop your receipt here' : 'Drag & drop your receipt'}
            </p>
            
            <p className="text-sm text-gray-500 mb-4">
              or click to browse from your device
            </p>
            
            <p className="text-xs text-gray-400">
              Supports: JPG, PNG, GIF (max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="relative">
              <img
                src={preview!}
                alt="Receipt preview"
                className="w-full max-h-[500px] object-contain rounded-lg"
              />
              
              {/* Remove button */}
              <button
                onClick={removeFile}
                className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* File info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {!uploading && (
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 btn-primary py-3"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {processing ? 'Processing receipt...' : 'Uploading...'}
                  </span>
                ) : (
                  'Process Receipt'
                )}
              </button>
              
              <button
                onClick={removeFile}
                disabled={uploading}
                className="px-6 btn-secondary"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for best results:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure the receipt is well-lit and clearly visible</li>
            <li>• Avoid shadows or glare on the receipt</li>
            <li>• Include the entire receipt in the photo</li>
            <li>• Make sure text is legible and not blurry</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Upload;
```

Create `frontend/src/pages/Dashboard.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { receiptAPI } from '../services/api';
import { 
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalReceipts: number;
  totalSpent: number;
  averagePerReceipt: number;
  thisMonthSpent: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceipts: 0,
    totalSpent: 0,
    averagePerReceipt: 0,
    thisMonthSpent: 0
  });
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await receiptAPI.getAll(1, 5);
      const receipts = response.data.receipts;
      
      // Calculate stats
      const total = receipts.reduce((sum: number, r: any) => sum + r.total, 0);
      const thisMonth = receipts
        .filter((r: any) => {
          const receiptDate = new Date(r.createdAt);
          const now = new Date();
          return receiptDate.getMonth() === now.getMonth() && 
                 receiptDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, r: any) => sum + r.total, 0);

      setStats({
        totalReceipts: response.data.pagination.total,
        totalSpent: total,
        averagePerReceipt: response.data.pagination.total > 0 ? total / response.data.pagination.total : 0,
        thisMonthSpent: thisMonth
      });

      setRecentReceipts(receipts);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Here's your dining expense overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalReceipts}
              </p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average/Receipt</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${stats.averagePerReceipt.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${stats.thisMonthSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Receipts */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Receipts</h2>
          <Link to="/receipts" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>

        {recentReceipts.length > 0 ? (
          <div className="space-y-4">
            {recentReceipts.map((receipt) => (
              <Link
                key={receipt._id}
                to={`/receipts/${receipt._id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{receipt.restaurantName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(receipt.createdAt).toLocaleDateString()} • {receipt.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${receipt.total.toFixed(2)}</p>
                  {receipt.splitBetween && receipt.splitBetween.length > 0 && (
                    <p className="text-xs text-green-600">Split ✓</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No receipts yet</p>
            <Link to="/upload" className="btn-primary inline-flex items-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Upload your first receipt
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
```

### Step 6: Update App.tsx

Update `frontend/src/App.tsx`:

```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public route wrapper (redirects to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          } />
          <Route path="/receipts" element={
            <ProtectedRoute>
              <div>Receipts List (To be implemented)</div>
            </ProtectedRoute>
          } />
          <Route path="/receipts/:id" element={
            <ProtectedRoute>
              <div>Receipt Detail (To be implemented)</div>
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

---

## Testing Your MVP {#testing}

### Step 1: Start Both Servers

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd ~/Desktop/splitbite-mvp/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd ~/Desktop/splitbite-mvp/frontend
npm start
```

### Step 2: Test the Application

1. Open your browser to `http://localhost:3000`
2. Click "Get Started" to register a new account
3. Fill in your details and create an account
4. You'll be automatically logged in and redirected to the dashboard
5. Click "New Receipt" to upload a receipt
6. Upload a receipt image and watch it process
7. View your processed receipt with extracted data


### Step 3: Test API with Thunder Client (VS Code)

1. Open VS Code
2. Click Thunder Client extension
3. Create a new request:
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body (JSON):
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "testpassword123"
   }
   ```
   - Send the request - you should get a response with a token
   - Test login with the same credentials
   - Test protected routes by adding the token to Authorization header

### Step 4: Verify Database Records

1. Log into MongoDB Atlas
2. Go to Collections
3. Check that users and receipts are being created properly
4. Verify that receipt data matches what was extracted

### Step 5: Test Error Cases

Try these scenarios to ensure your error handling works:

- Upload a non-image file
- Upload a very large file (>10MB)
- Try accessing protected routes without authentication
- Register with duplicate email
- Login with wrong credentials

---

## Deployment {#deployment}

### Step 1: Prepare for Production

Update your `backend/.env` with production values:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-jwt-secret-for-production
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-production-bucket-name
```

Create `frontend/.env`:

```env
REACT_APP_API_URL=https://your-backend-url.com/api
```

### Step 2: Deploy Backend to Railway

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. In your project root, create `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "cd backend && npm install && npm run build"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "always"

[[services]]
name = "splitbite-backend"
```

4. Set environment variables in Railway dashboard
5. Deploy your backend

### Step 3: Deploy Frontend to Vercel

1. Create account at [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`
4. Set environment variables
5. Deploy your frontend

### Step 4: Configure Production CORS

Update your backend CORS configuration:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));
```

### Step 5: Update S3 CORS for Production

Add your production frontend URL to the S3 CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-frontend-domain.vercel.app"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Conclusion

**Congratulations! 🎉** You've successfully built a complete receipt OCR and bill splitting application! Your MVP includes:

### Features Implemented:
- ✅ User registration and authentication
- ✅ Receipt image upload to AWS S3
- ✅ OCR processing with AWS Textract
- ✅ Structured data extraction
- ✅ Receipt management dashboard
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Error handling and validation
- ✅ Database with MongoDB
- ✅ Production-ready deployment setup

### What You've Learned:
- Full-stack TypeScript development
- AWS services integration (S3, Textract)
- Modern React with hooks and context
- RESTful API design
- Database modeling with MongoDB
- File upload handling
- Authentication with JWT
- Modern UI/UX with Tailwind CSS
- Production deployment

### Next Steps to Enhance Your App:

#### 1. Complete the Bill Splitting Feature:
- Add user invitation system
- Implement real-time splitting interface
- Add payment tracking

#### 2. Improve OCR Accuracy:
- Add manual correction interface
- Implement machine learning to improve parsing
- Support more receipt formats

#### 3. Add More Features:
- Expense categorization
- Monthly spending reports
- Export to CSV/PDF
- Mobile app with React Native
- Group management
- Payment integration (Stripe, PayPal)

#### 4. Performance & Monitoring:
- Add logging with Winston
- Implement rate limiting
- Add monitoring with Sentry
- Optimize images and caching

### Troubleshooting Common Issues:

**Backend won't start:**
- Check MongoDB connection string
- Verify all environment variables are set
- Check AWS credentials

**Frontend won't connect to backend:**
- Verify API URL in frontend .env
- Check CORS configuration
- Ensure backend is running

**OCR not working:**
- Verify AWS permissions
- Check S3 bucket configuration
- Ensure Textract is enabled in your region

**Uploads failing:**
- Check S3 bucket permissions
- Verify file size limits
- Check network connectivity

You now have a solid foundation for a production-ready application. This tutorial covered full-stack development, cloud services integration, and modern web development practices. Keep building and learning!

**Need help?** This tutorial covered a lot of ground. If you encounter issues:
- Check the console errors first
- Verify your environment variables
- Test your API endpoints individually
- Make sure all services (MongoDB, AWS) are properly configured

Happy coding! 🚀