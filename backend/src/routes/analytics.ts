// === backend/src/routes/analytics.ts ===

import { Router } from 'express'
import { getMetricsData, getSummary, getDashboardSummary } from '../controllers/analyticsController'

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

/**
 * @route   GET /api/analytics/dashboard-summary
 * @desc    Get dashboard metrics (Health Score, Abnormal Count)
 * @access  Public (for now)
 */
router.get('/dashboard-summary', getDashboardSummary)

export default router
