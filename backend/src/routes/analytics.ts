// === backend/src/routes/analytics.ts ===

import { Router } from 'express'
import { getMetricsData, getSummary } from '../controllers/analyticsController'

const router = Router()

/**
 * @route   GET /api/analytics/metrics
 * @desc    Get metrics timeseries data
 * @access  Public (for now)
 */
router.get('/metrics', getMetricsData)

/**
 * @route   GET /api/analytics/summary
 * @desc    Get overall health summary
 * @access  Public (for now)
 */
router.get('/summary', getSummary)

export default router
