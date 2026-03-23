// === backend/src/controllers/analyticsController.ts ===

import { Request, Response } from 'express'
import { ExtractedMetric } from '../models/ExtractedMetric'
import { logger } from '../utils/logger'
import { calculateHealthScore } from '../services/aiService'

/**
 * Get enhanced analytics data for health metrics
 */
export async function getMetricsData(req: Request, res: Response): Promise<void> {
  try {
    const { category, days = '30' } = req.query
    
    if (!category) {
      res.status(400).json({ success: false, error: 'Category is required' })
      return
    }

    const daysInt = parseInt(days as string)
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h buffer for timezones
    const startDate = new Date(endDate.getTime() - daysInt * 24 * 60 * 60 * 1000)

    // Fetch all metrics for this category up to the end date
    // This allows us to find a baseline even if it's outside the comparison window
    const allMetrics = await ExtractedMetric.find({
      category,
      measuredDate: { $lte: endDate }
    })
      .sort({ measuredDate: 1 }) // Oldest first (for chronological charts)
      .lean()

    const currentPeriod = allMetrics.filter(m => m.measuredDate >= startDate)
    const remainingMetrics = allMetrics.filter(m => m.measuredDate < startDate)

    // Group current metrics by metricName for timeseries
    const timeseries: Record<string, any[]> = {}
    currentPeriod.forEach(m => {
      if (!timeseries[m.metricName]) timeseries[m.metricName] = []
      timeseries[m.metricName].push({
        date: m.measuredDate,
        value: m.value,
        unit: m.unit,
        status: m.status
      })
    })

    // Calculate distributions (Frequency)
    const distributions: Record<string, any> = {}
    currentPeriod.forEach(m => {
      if (!distributions[m.metricName]) {
        distributions[m.metricName] = { normal: 0, high: 0, low: 0, abnormal: 0 }
      }
      distributions[m.metricName][m.status] = (distributions[m.metricName][m.status] || 0) + 1
    })

    // Calculate comparisons
    const comparisons: Record<string, any> = {}
    Object.keys(timeseries).forEach(metricName => {
      const metricMatches = currentPeriod.filter(m => m.metricName === metricName)
      const currentAvg = metricMatches.reduce((sum, m) => sum + m.value, 0) / (metricMatches.length || 1)
      
      // Calculate previous baseline
      let previousAvg = 0
      
      // 1. Try to get data from the same-length period immediately preceding the current one
      const prevStartDate = new Date(startDate.getTime() - daysInt * 24 * 60 * 60 * 1000)
      const precedingWindowMetrics = remainingMetrics.filter(m => 
        m.metricName === metricName && m.measuredDate >= prevStartDate
      )
      
      if (precedingWindowMetrics.length > 0) {
        previousAvg = precedingWindowMetrics.reduce((sum, m) => sum + m.value, 0) / precedingWindowMetrics.length
      } else {
        // 2. Fallback: Use the most recent single value available before the current period
        // Since remainingMetrics is sorted 1 (Oldest first), we need the LAST one for that metricName
        const latestBeforeWindow = [...remainingMetrics].reverse().find(m => m.metricName === metricName)
        if (latestBeforeWindow) {
          previousAvg = latestBeforeWindow.value
        }
      }
      
      const percentChange = previousAvg ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0
      
      comparisons[metricName] = {
        currentAvg: Math.round(currentAvg * 10) / 10,
        previousAvg: Math.round(previousAvg * 10) / 10,
        percentChange: Math.round(percentChange * 10) / 10
      }
    })

    res.json({
      success: true,
      data: {
        timeseries,
        distributions: Object.entries(distributions).map(([name, counts]) => ({
          name,
          ...counts
        })),
        comparisons
      }
    })
  } catch (error: any) {
    logger.error('Error fetching analytics data:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

/**
 * Get summary of health metrics
 */
export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    // Get latest metrics for each category
    const categories = ['blood_sugar', 'bp', 'cholesterol', 'thyroid']
    const summary: Record<string, any> = {}

    for (const category of categories) {
      const latestMetrics = await ExtractedMetric.find({ category })
        .sort({ measuredDate: -1 })
        .limit(1)
        .lean()
      
      summary[category] = latestMetrics[0] || null
    }

    res.json({
      success: true,
      data: summary
    })
  } catch (error: any) {
    logger.error('Error fetching metrics summary:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

/**
 * Get holistic dashboard summary (Health Score and Abnormal Count)
 */
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    // 1. Get total metrics count across all unique types (latest only)
    const latestMetrics = await ExtractedMetric.aggregate([
      { $sort: { measuredDate: -1 } },
      { $group: {
        _id: '$metricName',
        value: { $first: '$value' },
        unit: { $first: '$unit' },
        status: { $first: '$status' },
        measuredDate: { $first: '$measuredDate' }
      }},
      { $project: {
        _id: 0,
        metricName: '$_id',
        value: 1,
        unit: 1,
        status: 1,
        measuredDate: 1
      }}
    ])

    // 2. Identify abnormal metrics from the latest set
    const abnormalMetrics = latestMetrics.filter(m => 
      ['high', 'low', 'abnormal'].includes(m.status)
    )
    
    const abnormalCount = abnormalMetrics.length
    const abnormalMetricNames = abnormalMetrics.map(m => m.metricName)

    // 3. Get total readings count for context (optional, but keep totalRecords if needed)
    const totalReadingsCount = await ExtractedMetric.countDocuments()

    // 4. Calculate Health Score via AI
    const healthData = await calculateHealthScore(latestMetrics)

    res.json({
      success: true,
      data: {
        healthScore: healthData.score,
        healthAnalysis: healthData.analysis,
        abnormalCount,
        abnormalMetricNames,
        totalMetricsCount: latestMetrics.length,
        totalReadingsCount
      }
    })
  } catch (error: any) {
    logger.error('Error fetching dashboard summary:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
