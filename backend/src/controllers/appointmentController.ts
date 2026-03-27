// === backend/src/controllers/appointmentController.ts ===

import { Request, Response } from 'express'
import { Appointment } from '../models/Appointment'
import { getSocketService } from '../services/socketService'

interface CustomRequest extends Request {
  user?: { id: string }
}

// Get all appointments for a user
export const getAppointments = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'demo_user'
    // Include appointments created through Doctor Portal (which uses hardcoded '0000...0000' patientId for demo)
    const query = { $or: [{ userId }, { userId: '000000000000000000000000' }] }
    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 })
    res.json({ success: true, count: appointments.length, data: appointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}

// Get all appointments for a doctor
export const getDoctorAppointments = async (req: CustomRequest, res: Response) => {
  try {
    const doctorId = req.user?.id || 'demo_doctor'
    const appointments = await Appointment.find({ doctorId }).sort({ date: 1, time: 1 })
    res.json({ success: true, count: appointments.length, data: appointments })
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}

// Get single appointment
export const getAppointment = async (req: CustomRequest, res: Response) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }
    
    // Check permission (either user or doctor)
    const actorId = req.user?.id || 'demo_user'
    if (appointment.userId !== actorId && appointment.doctorId !== actorId && appointment.userId !== '000000000000000000000000') {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    res.json({ success: true, data: appointment })
  } catch (error) {
    console.error('Error fetching appointment:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}

// Create new appointment
export const createAppointment = async (req: CustomRequest, res: Response) => {
  try {
    const actorId = req.user?.id || 'demo_user'
    
    // Validate required fields
    const { date, time, doctorName, location, doctorId, userId, patientName } = req.body
    if (!date || !time || !doctorName || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide date, time, doctorName, and location' 
      })
    }

    // Set userId to actorId if not provided (patient-initiated)
    // Set doctorId to actorId if not provided (doctor-initiated)
    // In a real app, we'd check roles here.
    const finalUserId = userId || actorId
    const finalDoctorId = doctorId || actorId

    // If doctor is creating, set a default consultation fee
    const paymentAmount = req.body.paymentAmount ?? (doctorId ? 500 : 0)

    const appointment = await Appointment.create({
      ...req.body,
      userId: finalUserId,
      doctorId: finalDoctorId,
      patientName: patientName || 'Patient',
      paymentAmount,
      paymentStatus: 'Pending'
    })

    try {
      const io = getSocketService().getIO()
      io.emit('new_appointment', appointment)
    } catch (e) {
      console.error('Socket emit error for appointment:', e)
    }

    res.status(201).json({ success: true, data: appointment })
  } catch (error) {
    console.error('Error creating appointment:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}

// Update appointment
export const updateAppointment = async (req: CustomRequest, res: Response) => {
  try {
    let appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    // Check permission
    const userId = req.user?.id || 'demo_user'
    if (appointment.userId !== userId && appointment.userId !== '000000000000000000000000') {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    res.json({ success: true, data: appointment })
  } catch (error) {
    console.error('Error updating appointment:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}

// Delete appointment
export const deleteAppointment = async (req: CustomRequest, res: Response) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    // Check permission
    const userId = req.user?.id || 'demo_user'
    if (appointment.userId !== userId && appointment.userId !== '000000000000000000000000') {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    // Prevent patient from deleting doctor-scheduled appointments
    const isDoctorCreated = appointment.doctorId && appointment.doctorId !== userId && appointment.doctorId !== 'demo_user'
    if (isDoctorCreated) {
      return res.status(403).json({ success: false, message: 'Cannot delete doctor-scheduled appointments' })
    }

    await appointment.deleteOne()

    res.json({ success: true, data: {} })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
}
