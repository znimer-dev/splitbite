"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const aws_1 = require("../config/aws");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
class S3Service {
    /**
     * Upload a file to S3
     */
    static async uploadFile(fileBuffer, originalName, mimeType) {
        try {
            // Validate file type
            if (!aws_1.S3_CONFIG.allowedTypes.includes(mimeType)) {
                throw new Error(`File type ${mimeType} not allowed. Allowed types: ${aws_1.S3_CONFIG.allowedTypes.join(', ')}`);
            }
            // Validate file size
            if (fileBuffer.length > aws_1.S3_CONFIG.maxFileSize) {
                throw new Error(`File size ${fileBuffer.length} exceeds maximum allowed size of ${aws_1.S3_CONFIG.maxFileSize} bytes`);
            }
            // Generate unique filename
            const fileExtension = path_1.default.extname(originalName);
            const uniqueFileName = `${(0, uuid_1.v4)()}${fileExtension}`;
            const key = `${aws_1.S3_CONFIG.keyPrefix}${uniqueFileName}`;
            // Upload parameters
            const uploadParams = {
                Bucket: aws_1.S3_CONFIG.bucket,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
                ACL: 'private', // Keep files private for security
                Metadata: {
                    originalName: originalName,
                    uploadDate: new Date().toISOString()
                }
            };
            // Upload to S3
            const result = await aws_1.s3.upload(uploadParams).promise();
            return {
                key: result.Key,
                url: result.Location,
                bucket: result.Bucket,
                location: result.Location
            };
        }
        catch (error) {
            console.error('S3 upload error:', error);
            throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate a pre-signed URL for secure file access
     */
    static async getSignedUrl(key, expiresIn = 3600) {
        try {
            const params = {
                Bucket: aws_1.S3_CONFIG.bucket,
                Key: key,
                Expires: expiresIn // URL expires in seconds (default 1 hour)
            };
            return aws_1.s3.getSignedUrl('getObject', params);
        }
        catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete a file from S3
     */
    static async deleteFile(key) {
        try {
            const params = {
                Bucket: aws_1.S3_CONFIG.bucket,
                Key: key
            };
            await aws_1.s3.deleteObject(params).promise();
            return true;
        }
        catch (error) {
            console.error('S3 delete error:', error);
            throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if a file exists in S3
     */
    static async fileExists(key) {
        try {
            const params = {
                Bucket: aws_1.S3_CONFIG.bucket,
                Key: key
            };
            await aws_1.s3.headObject(params).promise();
            return true;
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get file metadata from S3
     */
    static async getFileMetadata(key) {
        try {
            const params = {
                Bucket: aws_1.S3_CONFIG.bucket,
                Key: key
            };
            const result = await aws_1.s3.headObject(params).promise();
            return {
                contentType: result.ContentType,
                contentLength: result.ContentLength,
                lastModified: result.LastModified,
                metadata: result.Metadata
            };
        }
        catch (error) {
            console.error('Error getting file metadata:', error);
            throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.S3Service = S3Service;
exports.default = S3Service;
