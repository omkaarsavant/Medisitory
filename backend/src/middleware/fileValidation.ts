// === backend/src/middleware/fileValidation.ts ===

import { Request, Response, NextFunction } from 'express'
import { RequestValidationError } from '../errors/requestValidationError'
import { logger } from '../utils/logger'
import { CLOUDINARY_CONFIG } from '../utils/constants'

/**
 * File validation middleware
 *
 * This middleware validates uploaded files for type, size, and
 * security before processing them further in the request pipeline.
 */

/**
 * Validate upload file
 *
 * This middleware validates the uploaded file for:
 * - File existence
 * - File type (jpg, jpeg, png, pdf)
 * - File size (max 5MB)
 * - MIME type validation
 * - Security checks
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function in middleware chain
 */
export function validateUploadFile(req: any, res: Response, next: NextFunction): void {
  try {
    // Collect all files to validate
    let filesToValidate = [];
    if (req.file) {
      filesToValidate.push(req.file);
    } else if (req.files) {
      if (req.files['file'] && req.files['file'].length > 0) {
        filesToValidate.push(req.files['file'][0]);
      }
      if (req.files['prescriptionFile'] && req.files['prescriptionFile'].length > 0) {
        filesToValidate.push(req.files['prescriptionFile'][0]);
      }
    }

    // Check if primary file exists in request
    if (filesToValidate.length === 0) {
      const error = new RequestValidationError(
        'No file uploaded',
        'NO_FILE_UPLOADED'
      )
      logger.error('File validation error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    const maxSize = CLOUDINARY_CONFIG.maxFileSize || 5242880 // 5MB in bytes
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']

    for (const file of filesToValidate) {
      // Validate file size
      if (file.size > maxSize) {
        throw new RequestValidationError('File size exceeds 5MB', 'FILE_SIZE_EXCEEDED')
      }

      // Check MIME type
      if (!allowedTypes.includes(file.mimetype)) {
        throw new RequestValidationError('File type not supported', 'INVALID_FILE_TYPE')
      }

      // Check file extension
      const fileExtension = require('path').extname(file.originalname).toLowerCase()
      if (!allowedExtensions.includes(fileExtension)) {
        throw new RequestValidationError('File extension not supported', 'INVALID_FILE_EXTENSION')
      }

      // Validate MIME type matches extension for images
      if (file.mimetype.startsWith('image/') && !['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
        throw new RequestValidationError('MIME type does not match file extension', 'MIME_TYPE_MISMATCH')
      }

      // Additional security checks
      if (file.mimetype === 'application/pdf' && file.buffer.length < 10) {
        throw new RequestValidationError('Invalid PDF file', 'INVALID_PDF')
      }

      // Check for potentially malicious files
      if (file.mimetype.startsWith('image/') && file.size < 1000) {
        throw new RequestValidationError('Invalid image file', 'INVALID_IMAGE')
      }
      
      logger.info(`File validation passed for: ${file.originalname}`)
    }

    // All files are valid, proceed to next middleware
    next()

  } catch (error) {
    logger.error('Unexpected error in file validation middleware:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Validate file category
 *
 * This middleware validates the file category parameter.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function in middleware chain
 */
export function validateFileCategory(req: any, res: Response, next: NextFunction): void {
  try {
    const validCategories = [
      'blood_sugar',
      'bp',
      'opd',
      'cholesterol',
      'thyroid',
      'custom'
    ]

    const category = req.body.category?.toString().toLowerCase().trim()
    if (!category || !validCategories.includes(category)) {
      const error = new RequestValidationError(
        'Invalid file category',
        'INVALID_CATEGORY'
      )
      logger.error('Category validation error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Valid category, proceed
    req.validatedCategory = category
    next()
  } catch (error) {
    logger.error('Unexpected error in category validation:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Validate form data
 *
 * This middleware validates that required form data is present.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function in middleware chain
 */
export function validateFormData(req: any, res: Response, next: NextFunction): void {
  try {
    if (!req.body || !req.body.category) {
      const error = new RequestValidationError(
        'Missing form data (category required)',
        'MISSING_FORM_DATA'
      )
      logger.error('Form data validation error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    next()
  } catch (error) {
    logger.error('Unexpected error in form data validation:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}