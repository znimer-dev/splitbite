"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAWSConfig = exports.S3_CONFIG = exports.textract = exports.s3 = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configure AWS SDK
aws_sdk_1.default.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});
// Create S3 instance
exports.s3 = new aws_sdk_1.default.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4'
});
// Create Textract instance
exports.textract = new aws_sdk_1.default.Textract({
    apiVersion: '2018-06-27'
});
// S3 Configuration
exports.S3_CONFIG = {
    bucket: process.env.S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    keyPrefix: 'receipts/'
};
// Validate AWS configuration
const validateAWSConfig = () => {
    const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'S3_BUCKET_NAME'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('❌ Missing required AWS environment variables:', missingVars);
        return false;
    }
    console.log('✅ AWS configuration validated');
    return true;
};
exports.validateAWSConfig = validateAWSConfig;
exports.default = { s3: exports.s3, textract: exports.textract, S3_CONFIG: exports.S3_CONFIG, validateAWSConfig: exports.validateAWSConfig };
