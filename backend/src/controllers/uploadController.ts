// === backend/src/controllers/uploadController.ts ===

import { Request, Response } from 'express'
import path from 'path'
import { uploadToCloudinary } from '../services/cloudinaryService'
import { MedicalRecord } from '../models/MedicalRecord'
import { logger } from '../utils/logger'
import { RequestValidationError } from '../errors/requestValidationError'

/**
 * Upload controller
 *
 * This controller handles file uploads for medical records, including
 * Cloudinary integration, database persistence, and error handling.
 */

/**
 * Upload file
 *
 * This endpoint handles file uploads for medical records.
 * It validates the file, uploads to Cloudinary, and saves
 * the record to the database.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function uploadFile(req: any, res: Response): Promise<void> {
  try {
    logger.info('Processing file upload request')

    // Validate that we have file and category
    const category = req.body.category
    
    if (!req.file || !category) {
      const error = new RequestValidationError(
        'File or category missing from request',
        'MISSING_REQUIRED_DATA'
      )
      logger.error('Upload error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    const file = req.file

    logger.info(`Uploading file: ${file.originalname} (category: ${category})`)

    try {
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        file.buffer,
        file.originalname
      )

      logger.info(`Cloudinary upload successful: ${cloudinaryResult.publicId}`)

      // Map category name to slug
      const categoryMap: Record<string, string> = {
        'Blood Sugar': 'blood_sugar',
        'Blood Pressure': 'bp',
        'OPD': 'opd',
        'Cholesterol': 'cholesterol',
        'Thyroid': 'thyroid',
        'Lab Results': 'lab',
        'Imaging': 'imaging',
        'Custom': 'custom'
      }
      
      const categorySlug = categoryMap[category as string] || 'custom'

      // Create medical record
      const medicalRecord = new MedicalRecord({
        patientId: '000000000000000000000000', // Dummy valid ObjectId string
        category: categorySlug,
        uploadDate: new Date(),
        imagePath: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        fileName: file.originalname,
        fileSize: file.size,
        extractedData: {
          fields: {},
          confidence: 0,
          extractedAt: new Date(),
          method: 'tesseract'
        },
        manualData: {},
        displayData: {},
        notes: '',
        doctorName: '',
        hospitalName: '',
        visitDate: null,
        status: 'Pending',
        isShared: []
      })

      // Save to database
      const savedRecord = await medicalRecord.save()

      logger.info(`Medical record saved: ${savedRecord._id}`)

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          uploadId: savedRecord._id,
          fileUrl: cloudinaryResult.url,
          fileSize: file.size,
          category: category,
          publicId: cloudinaryResult.publicId,
          format: cloudinaryResult.format,
          secureUrl: cloudinaryResult.secureUrl
        },
        message: 'File uploaded successfully'
      })

    } catch (cloudinaryError) {
      // Handle Cloudinary upload failures
      logger.error('Cloudinary upload failed:', cloudinaryError)

      if (cloudinaryError instanceof Error) {
        res.status(502).json({
          success: false,
          error: 'Cloudinary upload failed',
          errorCode: 'CLOUDINARY_FAILURE',
          details: cloudinaryError.message
        })
      } else {
        res.status(502).json({
          success: false,
          error: 'Cloudinary upload failed',
          errorCode: 'CLOUDINARY_FAILURE'
        })
      }
    }

  } catch (error) {
    logger.error('Unexpected error in upload controller:', error)

    if (error instanceof RequestValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      })
    }
  }
}

/**
 * Get upload preview
 *
 * This endpoint returns details about a specific upload for preview purposes.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function getUploadPreview(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.params.uploadId

    logger.info(`Fetching upload preview for ID: ${uploadId}`)

    // Find the medical record
    const medicalRecord = await MedicalRecord.findById(uploadId)
      .exec()

    if (!medicalRecord) {
      logger.warn(`Upload not found: ${uploadId}`)
      res.status(404).json({
        success: false,
        error: 'Upload not found',
        errorCode: 'UPLOAD_NOT_FOUND'
      })
      return
    }

    // Get Cloudinary file info
    try {
      const cloudinaryService = require('../services/cloudinaryService')
      const fileInfo = await cloudinaryService.getFileFromCloudinary(
        path.basename(medicalRecord.imagePath)
      )

      // Return preview data
      res.json({
        success: true,
        data: {
          uploadId: medicalRecord._id,
          fileName: medicalRecord.fileName,
          fileSize: medicalRecord.fileSize,
          category: medicalRecord.category,
          uploadDate: medicalRecord.uploadDate,
          status: medicalRecord.status,
          imageUrl: medicalRecord.imagePath,
          cloudinaryInfo: fileInfo
        }
      })

    } catch (cloudinaryError) {
      logger.warn('Could not retrieve Cloudinary file info:', cloudinaryError)

      // Return preview without Cloudinary info
      res.json({
        success: true,
        data: {
          uploadId: medicalRecord._id,
          fileName: medicalRecord.fileName,
          fileSize: medicalRecord.fileSize,
          category: medicalRecord.category,
          uploadDate: medicalRecord.uploadDate,
          status: medicalRecord.status,
          imageUrl: medicalRecord.imagePath
        }
      })
    }

  } catch (error) {
    logger.error('Unexpected error in getUploadPreview:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Delete upload
 *
 * This endpoint deletes an uploaded file and its record.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function deleteUpload(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.params.uploadId

    logger.info(`Deleting upload: ${uploadId}`)

    // Find the medical record
    const medicalRecord = await MedicalRecord.findById(uploadId).exec()

    if (!medicalRecord) {
      logger.warn(`Upload not found: ${uploadId}`)
      res.status(404).json({
        success: false,
        error: 'Upload not found',
        errorCode: 'UPLOAD_NOT_FOUND'
      })
      return
    }

    try {
      // Delete from Cloudinary (Best effort)
      try {
        const cloudinaryService = require('../services/cloudinaryService')
        
        // Use publicId if available, otherwise extract from URL
        let publicId = medicalRecord.publicId
        if (!publicId && medicalRecord.imagePath) {
          try {
            // Extract publicId from Cloudinary URL: .../upload/v123/folder/publicId.ext
            const parts = medicalRecord.imagePath.split('/upload/')
            if (parts.length > 1) {
              const afterUpload = parts[1].split('/')
              // Remove the version part (starts with 'v')
              const publicPath = afterUpload[0].startsWith('v') ? afterUpload.slice(1).join('/') : afterUpload.join('/')
              // Remove the extension
              publicId = publicPath.split('.')[0]
            }
          } catch (e) {
            logger.warn(`Failed to extract publicId from URL: ${medicalRecord.imagePath}`)
          }
        }

        if (publicId) {
          await cloudinaryService.deleteFromCloudinary(publicId)
        } else {
          logger.warn(`No publicId found and extraction failed for record: ${uploadId}`)
        }
      } catch (cloudinaryError) {
        logger.warn(`Failed to cleanup Cloudinary for upload ${uploadId}:`, cloudinaryError)
        // Continue with DB deletion
      }

      // Delete associated metrics
      try {
        const { ExtractedMetric } = require('../models/ExtractedMetric')
        if (ExtractedMetric) {
          await ExtractedMetric.deleteMany({ recordId: uploadId }).exec()
          logger.info(`Associated metrics deleted for upload: ${uploadId}`)
        }
      } catch (metricError) {
        logger.warn(`Failed to delete metrics for upload ${uploadId}:`, metricError)
      }

      // Delete from database
      await MedicalRecord.deleteOne({ _id: uploadId }).exec()

      logger.info(`Upload deleted: ${uploadId}`)

      res.json({
        success: true,
        message: 'Upload deleted successfully'
      })

    } catch (deleteError) {
      logger.error('Error deleting upload:', deleteError)
      res.status(500).json({
        success: false,
        error: 'Failed to delete upload',
        errorCode: 'DELETE_FAILURE'
      })
    }

  } catch (error) {
    logger.error('Unexpected error in deleteUpload:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Update upload metadata
 *
 * This endpoint allows updating metadata for an upload.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function updateUploadMetadata(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.params.uploadId
    const updateData = req.body

    logger.info(`Updating metadata for upload: ${uploadId}`)

    // Find the medical record
    const medicalRecord = await MedicalRecord.findById(uploadId).exec()

    if (!medicalRecord) {
      logger.warn(`Upload not found: ${uploadId}`)
      res.status(404).json({
        success: false,
        error: 'Upload not found',
        errorCode: 'UPLOAD_NOT_FOUND'
      })
      return
    }

    // Update allowed fields
    const allowedUpdates = ['notes', 'doctorName', 'hospitalName', 'visitDate', 'status']
    const updates: any = {}

    for (const field of allowedUpdates) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      logger.warn('No valid fields to update')
      res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        errorCode: 'NO_VALID_UPDATES'
      })
      return
    }

    // Apply updates
    Object.assign(medicalRecord, updates)
    const updatedRecord = await medicalRecord.save()

    logger.info(`Upload metadata updated: ${uploadId}`)

    res.json({
      success: true,
      data: updatedRecord,
      message: 'Upload metadata updated successfully'
    })

  } catch (error) {
    logger.error('Unexpected error in updateUploadMetadata:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}