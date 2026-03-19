// === backend/src/controllers/healthController.ts ===

import { Request, Response } from 'express'

export const getHealth = async (req: Request, res: Response) => {
  try {
    // Health check response with system information
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }

    res.status(200).json(healthData)
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}