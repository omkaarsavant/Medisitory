// === backend/src/routes/healthRoutes.ts ===

import { Router } from 'express'
import { getHealth } from '../controllers/healthController'

const router = Router()

// Health check endpoint
router.get('/', getHealth)

export default router