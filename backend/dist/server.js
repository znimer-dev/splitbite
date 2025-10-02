"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const receiptRoutes_1 = __importDefault(require("./routes/receiptRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const aws_1 = require("./config/aws");
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from frontend
const frontendPath = path_1.default.join(__dirname, '../../frontend');
console.log('📁 Serving static files from:', frontendPath);
console.log('📁 Frontend path exists:', require('fs').existsSync(frontendPath));
app.use(express_1.default.static(frontendPath));
// MongoDB connection function
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};
// Basic route to test server
app.get('/', (req, res) => {
    res.json({
        message: 'SplitBite API is running!',
        timestamp: new Date().toISOString()
    });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/receipts', receiptRoutes_1.default);
// Debug route to check file structure
app.get('/debug/files', (req, res) => {
    const fs = require('fs');
    const frontendPath = path_1.default.join(__dirname, '../../frontend');
    const jsPath = path_1.default.join(frontendPath, 'js/dist/app.js');
    let fileInfo = {
        frontendPathExists: fs.existsSync(frontendPath),
        frontendPath: frontendPath,
        jsFileExists: fs.existsSync(jsPath),
        jsPath: jsPath,
        frontendContents: fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : 'Path does not exist',
        jsDistContents: fs.existsSync(path_1.default.join(frontendPath, 'js/dist')) ? fs.readdirSync(path_1.default.join(frontendPath, 'js/dist')) : 'js/dist does not exist'
    };
    res.json(fileInfo);
});
// Specific route for JavaScript file (debugging)
app.get('/js/dist/app.js', (req, res) => {
    const jsPath = path_1.default.join(__dirname, '../../frontend/js/dist/app.js');
    console.log('🔍 JS file requested, path:', jsPath);
    console.log('🔍 JS file exists:', require('fs').existsSync(jsPath));
    if (require('fs').existsSync(jsPath)) {
        res.sendFile(jsPath);
    }
    else {
        res.status(404).send('JavaScript file not found');
    }
});
// Health check endpoint
app.get('/health', async (req, res) => {
    const dbStatus = mongoose_1.default.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    const awsConfigValid = (0, aws_1.validateAWSConfig)();
    res.json({
        status: 'OK',
        database: dbStatus,
        aws: awsConfigValid ? 'Configured' : 'Not Configured',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
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
    }
    catch (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
};
startServer();
