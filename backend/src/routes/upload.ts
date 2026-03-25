// === backend/src/routes/upload.ts ===

import { Router } from 'express'
import { uploadFile, getUploadPreview, deleteUpload, updateUploadMetadata } from '../controllers/uploadController'
import { validateUploadFile, validateFileCategory, validateFormData } from '../middleware/fileValidation'
import multer from 'multer'
import { logger } from '../utils/logger'

/**
 * Upload routes
 *
 * This file defines the routes for file upload functionality,
 * including upload, preview, and metadata management.
 */

// Create router
const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5242880 // 5MB in bytes
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  }
})

/**
 * POST /api/upload
 *
 * Upload a medical record file
 *
 * - Requires: file (multipart/form-data), category (form data)
 * - Validates: file type, size, category
 * - Uploads: to Cloudinary
 * - Saves: MedicalRecord to database
 */
router.post(
  '/',
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'prescriptionFile', maxCount: 1 }]),
  validateFormData,
  validateFileCategory,
  validateUploadFile,
  uploadFile
)

/**
 * GET /api/upload/:uploadId
 *
 * Get upload preview details
 *
 * - Returns: Upload details including Cloudinary info
 */
router.get('/:uploadId', getUploadPreview)

/**
 * DELETE /api/upload/:uploadId
 *
 * Delete an upload
 *
 * - Deletes: from Cloudinary and database
 */
router.delete('/:uploadId', deleteUpload)

/**
 * PUT /api/upload/:uploadId
 *
 * Update upload metadata
 *
 * - Updates: notes, doctorName, hospitalName, visitDate, status
 */
router.put('/:uploadId', updateUploadMetadata)

// Export the router
export default router

// Log route initialization
logger.info('Upload routes initialized successfully')