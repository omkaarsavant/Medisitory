// === backend/src/routes/ocr.ts ===

import { Router } from 'express'
import { extractData, confirmExtraction } from '../controllers/ocrController'
import { logger } from '../utils/logger'

/**
 * OCR routes
 *
 * This file defines the routes for OCR processing and data extraction.
 */

// Create router
const router = Router()

/**
 * POST /api/extract
 *
 * Extract data from medical record using OCR
 *
 * Body:
 * {
 *   uploadId: "record_id",
 *   category: "blood_sugar" (optional)
 * }
 */
router.post('/', extractData)

/**
 * POST /api/extract/confirm
 *
 * Confirm extracted data and save to database
 *
 * Body:
 * {
 *   uploadId: "record_id",
 *   manualCorrections: { field: corrected_value }
 * }
 */
router.post('/confirm', confirmExtraction)

// Export the router
export default router

// Log route initialization
logger.info('OCR routes initialized successfully')