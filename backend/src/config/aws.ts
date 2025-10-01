import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 instance
export const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Create Textract instance
export const textract = new AWS.Textract({
  apiVersion: '2018-06-27'
});

// S3 Configuration
export const S3_CONFIG = {
  bucket: process.env.S3_BUCKET_NAME || '',
  region: process.env.AWS_REGION || 'us-east-1',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  keyPrefix: 'receipts/'
};

// Validate AWS configuration
export const validateAWSConfig = (): boolean => {
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

export default { s3, textract, S3_CONFIG, validateAWSConfig };