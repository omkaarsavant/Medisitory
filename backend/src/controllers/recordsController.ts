// === backend/src/controllers/recordsController.ts ===

import { Request, Response } from 'express'
import { MedicalRecord } from '../models/MedicalRecord'
import { logger } from '../utils/logger'
import { RequestValidationError } from '../errors/requestValidationError'
import { isValidObjectId } from 'mongoose'
import { parseNumericValue, getFieldInfo } from '../utils/metrics'
import { ExtractedMetric } from '../models/ExtractedMetric'

/**
 * Records controller
 *
 * This controller handles CRUD operations for medical records,
 * including pagination, filtering, and data updates.
 */

/**
 * Get records
 *
 * This endpoint retrieves medical records with pagination and filtering.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function getRecords(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Fetching medical records')

    // Parse query parameters
    const {
      category,
      startDate,
      endDate,
      doctorName,
      page = '1',
      limit = '10'
    } = req.query

    // Validate pagination parameters
    const pageNumber = parseInt(page as string)
    const limitNumber = parseInt(limit as string)

    if (isNaN(pageNumber) || pageNumber < 1) {
      const error = new RequestValidationError(
        'Invalid page number',
        'INVALID_PAGE_NUMBER'
      )
      logger.error('Records error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
      const error = new RequestValidationError(
        'Invalid limit (must be 1-1000)',
        'INVALID_LIMIT'
      )
      logger.error('Records error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Build query
    const query: any = {}

    // Filter by category
    if (category) {
      const validCategories = ['blood_sugar', 'bp', 'opd', 'cholesterol', 'thyroid', 'custom']
      if (!validCategories.includes(category as string)) {
        const error = new RequestValidationError(
          'Invalid category',
          'INVALID_CATEGORY'
        )
        logger.error('Records error:', error.message)
        res.status(400).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode
        })
        return
      }
      query.category = category
    }

    // Filter by date range
    if (startDate || endDate) {
      const dateQuery: any = {}

      if (startDate) {
        const start = new Date(startDate as string)
        if (isNaN(start.getTime())) {
          const error = new RequestValidationError(
            'Invalid start date',
            'INVALID_START_DATE'
          )
          logger.error('Records error:', error.message)
          res.status(400).json({
            success: false,
            error: error.message,
            errorCode: error.errorCode
          })
          return
        }
        dateQuery.$gte = start
      }

      if (endDate) {
        const end = new Date(endDate as string)
        if (isNaN(end.getTime())) {
          const error = new RequestValidationError(
            'Invalid end date',
            'INVALID_END_DATE'
          )
          logger.error('Records error:', error.message)
          res.status(400).json({
            success: false,
            error: error.message,
            errorCode: error.errorCode
          })
          return
        }
        dateQuery.$lte = end
      }

      query.uploadDate = dateQuery
    }

    // Pagination
    const skip = (pageNumber - 1) * limitNumber

    // Build options
    const options = {
      sort: { uploadDate: -1, visitDate: -1 },
      limit: limitNumber,
      skip: skip,
      lean: true
    }

    // Execute query
    const [records, total] = await Promise.all([
      MedicalRecord.find(query, null, options).exec(),
      MedicalRecord.countDocuments(query).exec()
    ])

    logger.info(`Found ${total} records, returning ${records.length}`)

    // Calculate total pages
    const totalPages = Math.ceil(total / limitNumber)

    res.json({
      success: true,
      data: {
        records,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages
      }
    })

  } catch (error) {
    logger.error('Error fetching records:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch records',
      errorCode: 'DATABASE_ERROR'
    })
  }
}

/**
 * Get record
 *
 * This endpoint retrieves a specific medical record by ID.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function getRecord(req: Request, res: Response): Promise<void> {
  try {
    const recordId = req.params.id

    logger.info(`Fetching record: ${recordId}`)

    // Validate ObjectId
    if (!isValidObjectId(recordId)) {
      const error = new RequestValidationError(
        'Invalid record ID format',
        'INVALID_ID_FORMAT'
      )
      logger.error('Record error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Find record
    const record = await MedicalRecord.findById(recordId).lean().exec()

    if (!record) {
      logger.warn(`Record not found: ${recordId}`)
      res.status(404).json({
        success: false,
        error: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND'
      })
      return
    }

    logger.info(`Record found: ${recordId}`)

    res.json({
      success: true,
      data: { record }
    })

  } catch (error) {
    logger.error('Error fetching record:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch record',
      errorCode: 'DATABASE_ERROR'
    })
  }
}

/**
 * Update record
 *
 * This endpoint updates a medical record's manual data, notes, and status.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function updateRecord(req: Request, res: Response): Promise<void> {
  try {
    const recordId = req.params.id
    const updateData = req.body

    logger.info(`Updating record: ${recordId}`)

    // Validate ObjectId
    if (!isValidObjectId(recordId)) {
      const error = new RequestValidationError(
        'Invalid record ID format',
        'INVALID_ID_FORMAT'
      )
      logger.error('Update error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Validate update data
    if (!updateData || (!updateData.manualData && !updateData.notes && !updateData.status)) {
      const error = new RequestValidationError(
        'No valid fields to update',
        'NO_VALID_UPDATES'
      )
      logger.error('Update error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Validate status if provided
    const validStatuses = ['pending', 'completed', 'flagged']
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      const error = new RequestValidationError(
        'Invalid status',
        'INVALID_STATUS'
      )
      logger.error('Update error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Find record
    const record = await MedicalRecord.findById(recordId).exec()

    if (!record) {
      logger.warn(`Record not found: ${recordId}`)
      res.status(404).json({
        success: false,
        error: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND'
      })
      return
    }

    // Update fields
    if (updateData.manualData) {
      record.manualData = updateData.manualData
    }

    if (updateData.notes !== undefined) {
      record.notes = updateData.notes
    }

    if (updateData.status) {
      record.status = updateData.status
    }

    // Update display data (merge extracted + manual)
    record.displayData = { ...record.extractedData.fields, ...record.manualData }

    // Save updated record (this will trigger the post-save syncMetrics hook)
    const updatedRecord = await record.save()

    logger.info(`Record updated: ${recordId}`)

    res.json({
      success: true,
      data: { record: updatedRecord }
    })

  } catch (error) {
    logger.error('Error updating record:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update record',
      errorCode: 'DATABASE_ERROR'
    })
  }
}

/**
 * Delete record
 *
 * This endpoint deletes a medical record and its associated file.
 *
 * @param req Express request object
 * @param res Express response object
 */
export async function deleteRecord(req: Request, res: Response): Promise<void> {
  try {
    const recordId = req.params.id

    logger.info(`Deleting record: ${recordId}`)

    // Validate ObjectId
    if (!isValidObjectId(recordId)) {
      const error = new RequestValidationError(
        'Invalid record ID format',
        'INVALID_ID_FORMAT'
      )
      logger.error('Delete error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Find record
    const record = await MedicalRecord.findById(recordId).exec()

    if (!record) {
      logger.warn(`Record not found: ${recordId}`)
      res.status(404).json({
        success: false,
        error: 'Record not found',
        errorCode: 'RECORD_NOT_FOUND'
      })
      return
    }

    try {
      // Delete from Cloudinary (Best effort)
      try {
        // Use publicId if available, otherwise extract from URL
        let publicId = record.publicId
        if (!publicId && record.imagePath) {
          try {
            // Extract publicId from Cloudinary URL: .../upload/v123/folder/publicId.ext
            const parts = record.imagePath.split('/upload/')
            if (parts.length > 1) {
              const afterUpload = parts[1].split('/')
              // Remove the version part (starts with 'v')
              const publicPath = afterUpload[0].startsWith('v') ? afterUpload.slice(1).join('/') : afterUpload.join('/')
              // Remove the extension
              publicId = publicPath.split('.')[0]
            }
          } catch (e) {
            logger.warn(`Failed to extract publicId from URL: ${record.imagePath}`)
          }
        }

        if (publicId) {
          const cloudinaryService = require('../services/cloudinaryService')
          await cloudinaryService.deleteFromCloudinary(publicId)
        } else {
          logger.warn(`No publicId found and extraction failed for record: ${recordId}`)
        }
      } catch (cloudinaryError) {
        logger.warn(`Failed to cleanup Cloudinary for record ${recordId}:`, cloudinaryError)
        // Continue with DB deletion even if Cloudinary fails
      }

      // Delete from database (this will trigger the post-deleteOne sync cleanup hook)
      await MedicalRecord.deleteOne({ _id: recordId }).exec()

      logger.info(`Record deleted: ${recordId}`)

      res.json({
        success: true,
        message: 'Record deleted successfully'
      })

    } catch (deleteError) {
      logger.error('Error deleting record:', deleteError)
      res.status(500).json({
        success: false,
        error: 'Failed to delete record',
        errorCode: 'DELETE_FAILURE'
      })
    }

  } catch (error) {
    logger.error('Unexpected error in deleteRecord:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}