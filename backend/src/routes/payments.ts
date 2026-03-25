// === backend/src/routes/payments.ts ===

import { Router } from 'express'
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController'

const router = Router()

router.post('/create-order', createPaymentOrder)
router.post('/verify', verifyPayment)

export default router
