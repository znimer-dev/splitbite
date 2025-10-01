import { s3, S3_CONFIG } from '../config/aws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  location: string;
}

export class S3Service {

  /**
   * Upload a file to S3
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<S3UploadResult> {
    try {
      // Validate file type
      if (!S3_CONFIG.allowedTypes.includes(mimeType)) {
        throw new Error(`File type ${mimeType} not allowed. Allowed types: ${S3_CONFIG.allowedTypes.join(', ')}`);
      }

      // Validate file size
      if (fileBuffer.length > S3_CONFIG.maxFileSize) {
        throw new Error(`File size ${fileBuffer.length} exceeds maximum allowed size of ${S3_CONFIG.maxFileSize} bytes`);
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const key = `${S3_CONFIG.keyPrefix}${uniqueFileName}`;

      // Upload parameters
      const uploadParams = {
        Bucket: S3_CONFIG.bucket,
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
      const result = await s3.upload(uploadParams).promise();

      return {
        key: result.Key,
        url: result.Location,
        bucket: result.Bucket,
        location: result.Location
      };

    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a pre-signed URL for secure file access
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key,
        Expires: expiresIn // URL expires in seconds (default 1 hour)
      };

      return s3.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<boolean> {
    try {
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key
      };

      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key
      };

      await s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  static async getFileMetadata(key: string) {
    try {
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key
      };

      const result = await s3.headObject(params).promise();
      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default S3Service;