import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import receiptRoutes from './routes/receiptRoutes';
import authRoutes from './routes/authRoutes';
import { validateAWSConfig } from './config/aws';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
const frontendPath = path.join(__dirname, '../../frontend');
console.log('📁 Serving static files from:', frontendPath);
console.log('📁 Frontend path exists:', require('fs').existsSync(frontendPath));
app.use(express.static(frontendPath));

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);

// Debug route to check file structure
app.get('/debug/files', (req: Request, res: Response) => {
  const fs = require('fs');
  const frontendPath = path.join(__dirname, '../../frontend');
  const jsPath = path.join(frontendPath, 'js/dist/app.js');

  let fileInfo = {
    frontendPathExists: fs.existsSync(frontendPath),
    frontendPath: frontendPath,
    jsFileExists: fs.existsSync(jsPath),
    jsPath: jsPath,
    frontendContents: fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : 'Path does not exist',
    jsDistContents: fs.existsSync(path.join(frontendPath, 'js/dist')) ? fs.readdirSync(path.join(frontendPath, 'js/dist')) : 'js/dist does not exist'
  };

  res.json(fileInfo);
});

// Specific route for JavaScript file (debugging)
app.get('/js/dist/app.js', (req: Request, res: Response) => {
  const jsPath = path.join(__dirname, '../../frontend/js/dist/app.js');
  console.log('🔍 JS file requested, path:', jsPath);
  console.log('🔍 JS file exists:', require('fs').existsSync(jsPath));
  if (require('fs').existsSync(jsPath)) {
    res.sendFile(jsPath);
  } else {
    res.status(404).send('JavaScript file not found');
  }
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const awsConfigValid = validateAWSConfig();

  res.json({
    status: 'OK',
    database: dbStatus,
    aws: awsConfigValid ? 'Configured' : 'Not Configured',
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