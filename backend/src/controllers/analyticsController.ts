// === backend/src/controllers/analyticsController.ts ===

import { Request, Response } from 'express'
import { ExtractedMetric } from '../models/ExtractedMetric'
import { logger } from '../utils/logger'

/**
 * Get enhanced analytics data for health metrics
 */
export async function getMetricsData(req: Request, res: Response): Promise<void> {
  try {
    const { category, patientId = '000000000000000000000000', days = '30' } = req.query
    
    if (!category) {
      res.status(400).json({ success: false, error: 'Category is required' })
      return
    }

    const daysInt = parseInt(days as string)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - daysInt)

    // Previous period for comparison
    const prevStartDate = new Date()
    prevStartDate.setDate(startDate.getDate() - daysInt)

    const query: any = {
      patientId,
      category,
      measuredDate: { $gte: prevStartDate, $lte: endDate }
    }

    const allMetrics = await ExtractedMetric.find(query)
      .sort({ measuredDate: 1 })
      .lean()

    const currentPeriod = allMetrics.filter(m => m.measuredDate >= startDate)
    const previousPeriod = allMetrics.filter(m => m.measuredDate < startDate)

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
      const currentAvg = currentPeriod
        .filter(m => m.metricName === metricName)
        .reduce((sum, m) => sum + m.value, 0) / 
        (currentPeriod.filter(m => m.metricName === metricName).length || 1)
      
      const previousAvg = previousPeriod
        .filter(m => m.metricName === metricName)
        .reduce((sum, m) => sum + m.value, 0) / 
        (previousPeriod.filter(m => m.metricName === metricName).length || 1)
      
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
    const { patientId = '000000000000000000000000' } = req.query
    
    // Get latest metrics for each category
    const categories = ['blood_sugar', 'bp', 'cholesterol', 'thyroid']
    const summary: Record<string, any> = {}

    for (const category of categories) {
      const latestMetrics = await ExtractedMetric.find({ patientId, category })
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
