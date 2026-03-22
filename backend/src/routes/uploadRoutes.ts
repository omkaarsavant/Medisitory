// === backend/src/routes/uploadRoutes.ts ===

import { Router } from 'express'
import multer from 'multer'
import {
  uploadFile,
  getUploadPreview,
  deleteUpload
} from '../controllers/uploadController'
import { extractData, confirmExtraction, createManualRecord } from '../controllers/ocrController'

// Configure multer for file uploads
const storage = multer.memoryStorage()
const uploadMock = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

const router = Router()

// Upload file
router.post(
  '/',
  uploadMock.single('file'),
  uploadFile // The controller function name in uploadController.ts is uploadFile
)

// Get upload details (preview)
router.get('/:uploadId', getUploadPreview)

// Delete upload
router.delete('/:uploadId', deleteUpload)

// OCR Extraction (matching frontend path)
router.post('/:id/extract', extractData)

// Confirm Extraction (matching frontend path)
router.post('/:id/confirm', confirmExtraction)

// Manual Entry
router.post('/manual', createManualRecord)

export default router