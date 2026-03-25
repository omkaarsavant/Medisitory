// === backend/src/routes/index.ts ===

import { Router } from 'express'
import healthRoutes from './healthRoutes'
import uploadRoutes from './uploadRoutes'
import recordsRoutes from './records'
import ocrRoutes from './ocr'
import analyticsRoutes from './analytics'
import appointmentRoutes from './appointments'
import doctorAccessRoutes from './doctorAccess'

const router = Router()

// Unified API prefix
router.use('/api', Router()
  .use('/health', healthRoutes)
  .use('/upload', uploadRoutes)
  .use('/records', recordsRoutes)
  .use('/ocr', ocrRoutes)
  .use('/analytics', analyticsRoutes)
  .use('/appointments', appointmentRoutes)
  .use('/doctor-access', doctorAccessRoutes)
)

export default router