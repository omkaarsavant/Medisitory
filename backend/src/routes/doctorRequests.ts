// === backend/src/routes/doctorRequests.ts ===

import express from 'express'
import {
  getDoctorId,
  sendRequest,
  getPatientRequests,
  getDoctorRequests,
  respondToRequest
} from '../controllers/doctorRequestController'

const router = express.Router()

// @route   GET /api/doctor-requests/doctor-id
// @desc    Get or generate the unique doctor ID
router.get('/doctor-id', getDoctorId)

// @route   POST /api/doctor-requests/send
// @desc    Patient sends a connection request to a doctor by unique ID
router.post('/send', sendRequest)

// @route   GET /api/doctor-requests/patient
// @desc    Patient fetches all their sent requests
router.get('/patient', getPatientRequests)

// @route   GET /api/doctor-requests/doctor/:doctorId
// @desc    Doctor fetches incoming requests for their unique ID
router.get('/doctor/:doctorId', getDoctorRequests)

// @route   POST /api/doctor-requests/:id/respond
// @desc    Doctor accepts or rejects a connection request
router.post('/:id/respond', respondToRequest)

export default router
