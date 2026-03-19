// === backend/src/services/cloudinaryService.ts ===

import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

/**
 * Cloudinary service for file uploads
 *
 * This service handles file uploads to Cloudinary with retry logic,
 * error handling, and proper logging for debugging.
 */

/**
 * Initialize Cloudinary configuration
 *
 * This function configures Cloudinary with environment variables
 * and sets up the connection for file uploads.
 */
export function initializeCloudinary(): void {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    
    logger.info(`Initializing Cloudinary: ${cloudName || 'MISSING'}, API Key: ${apiKey ? 'PRESENT' : 'MISSING'}`)

    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    })

    logger.info('Cloudinary initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Cloudinary:', error)
    throw new Error('Cloudinary configuration error')
  }
}

/**
 * Upload file to Cloudinary
 *
 * This function uploads a file buffer to Cloudinary with retry logic
 * and exponential backoff for handling temporary failures.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  retries: number = 3,
  backoffBase: number = 1000
): Promise<{
  url: string
  publicId: string
  size: number
  format: string
  secureUrl: string
}> {
  let attempt = 0

  while (attempt < retries) {
    try {
      attempt++

      // Log upload attempt
      logger.info(`Cloudinary upload attempt ${attempt} for file: ${fileName}`)

      // Create a promise to handle the stream upload
      const uploadResult: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: path.parse(fileName).name,
            folder: 'medvault/reports',
            use_filename: true,
            unique_filename: true,
            overwrite: true,
            resource_type: 'auto',
            tags: ['medvault', 'report']
          },
          (error, result) => {
            if (error) return reject(error)
            resolve(result)
          }
        )

        // Write the buffer to the stream and end it
        uploadStream.end(fileBuffer)
      })

      // Log successful upload
      logger.info(`Cloudinary upload successful: ${uploadResult.public_id}`)

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        size: uploadResult.bytes,
        format: uploadResult.format,
        secureUrl: uploadResult.secure_url
      }

    } catch (error) {
      // Log the error
      logger.error(`Cloudinary upload attempt ${attempt} failed:`, error)

      // Check if we should retry
      if (attempt < retries) {
        const backoffTime = backoffBase * Math.pow(2, attempt - 1)
        logger.info(`Waiting ${backoffTime}ms before retry...`)

        // Exponential backoff with jitter
        await new Promise(resolve => setTimeout(resolve, backoffTime + Math.random() * 1000))
      } else {
        // All retries failed, throw error
        logger.error('All Cloudinary upload attempts failed')
        throw new Error('Cloudinary upload failed after multiple attempts')
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Cloudinary upload failed') // For type safety
}

/**
 * Delete file from Cloudinary
 *
 * This function deletes a file from Cloudinary by public ID.
 *
 * @param publicId - Public ID of the file to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true
    })
    logger.info(`Cloudinary file deleted: ${publicId}`)
  } catch (error) {
    logger.error(`Failed to delete file from Cloudinary: ${publicId}`, error)
    throw new Error('Cloudinary deletion failed')
  }
}

/**
 * Get file information from Cloudinary
 *
 * This function retrieves information about a file from Cloudinary.
 *
 * @param publicId - Public ID of the file
 * @returns Promise resolving to file information
 */
export async function getFileFromCloudinary(publicId: string): Promise<any> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    })
    logger.info(`Retrieved Cloudinary file info: ${publicId}`)
    return result
  } catch (error) {
    logger.error(`Failed to get file info from Cloudinary: ${publicId}`, error)
    throw new Error('Cloudinary file info retrieval failed')
  }
}

/**
 * Check if file exists in Cloudinary
 *
 * This function checks if a file exists in Cloudinary by public ID.
 *
 * @param publicId - Public ID of the file
 * @returns Promise resolving to true if file exists, false otherwise
 */
export async function fileExistsInCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    })
    return result && result.public_id === publicId
  } catch (error: any) {
    if (error && error.http_code === 404) {
      return false
    }
    logger.error(`Error checking file existence in Cloudinary: ${publicId}`, error)
    throw new Error('Cloudinary file existence check failed')
  }
}