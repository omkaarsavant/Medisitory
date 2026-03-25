// === backend/src/routes/appointments.ts ===

import { Router } from 'express'
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getDoctorAppointments
} from '../controllers/appointmentController'

const router = Router()

router
  .route('/')
  .get(getAppointments)
  .post(createAppointment)

router
  .route('/doctor')
  .get(getDoctorAppointments)

router
  .route('/:id')
  .get(getAppointment)
  .put(updateAppointment)
  .delete(deleteAppointment)

export default router
