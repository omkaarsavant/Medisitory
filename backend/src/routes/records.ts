// === backend/src/routes/records.ts ===

import { Router } from 'express'
import { getRecords, getRecord, updateRecord, deleteRecord } from '../controllers/recordsController'
import { logger } from '../utils/logger'

/**
 * Records routes
 *
 * This file defines the routes for medical record CRUD operations.
 */

// Create router
const router = Router()

/**
 * GET /api/records
 *
 * Get medical records with pagination and filtering
 *
 * Query parameters:
 * - category: blood_sugar, bp, opd, cholesterol, thyroid, custom
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - doctorName: text search
 * - page: number (default: 1)
 * - limit: number (default: 10)
 */
router.get('/', getRecords)

/**
 * GET /api/records/:id
 *
 * Get a specific medical record by ID
 */
router.get('/:id', getRecord)

/**
 * PUT /api/records/:id
 *
 * Update a medical record
 *
 * Body:
 * {
 *   manualData: Object,
 *   notes: string,
 *   status: 'pending' | 'completed' | 'flagged'
 * }
 */
router.put('/:id', updateRecord)

/**
 * DELETE /api/records/:id
 *
 * Delete a medical record
 */
router.delete('/:id', deleteRecord)

// Export the router
export default router

// Log route initialization
logger.info('Records routes initialized successfully')