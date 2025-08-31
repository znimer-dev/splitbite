import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Loading env variables
dotenv.config();

//creating express app
const app: Application = express();

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route to test server
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'SplitBite API is running!',
        timestamp: new Date().toISOString()
    });

});

// health check route
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        environment: process.env.NODE_ENV,
        port: process.env.PORT,
        timestamp: new Date().toISOString()
    });
});

//error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

//Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // adding mongoDB connection here later
    
        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV}`);

        });

    } catch (error) {
        console.error('❌Error starting server:', error);
        process.exit(1);
    }
}

startServer();
