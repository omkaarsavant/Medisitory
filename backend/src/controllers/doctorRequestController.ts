// === backend/src/controllers/doctorRequestController.ts ===

import { Request, Response } from 'express'
import DoctorRequest from '../models/DoctorRequest'
import DoctorAccess from '../models/DoctorAccess'
import MedicalRecord from '../models/MedicalRecord'

// In-memory doctor ID store (persisted per session; in production use a DB collection)
const doctorIds: Map<string, string> = new Map()

const generateDoctorId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let id = 'DOC-'
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

// GET /api/doctor-requests/doctor-id?key=<sessionKey>
// Returns existing or generates new unique doctor ID for this session
export const getDoctorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionKey = (req.query.key as string) || 'default_doctor'
    
    if (!doctorIds.has(sessionKey)) {
      doctorIds.set(sessionKey, generateDoctorId())
    }
    
    res.status(200).json({
      success: true,
      data: { doctorId: doctorIds.get(sessionKey) }
    })
  } catch (error) {
    console.error('Error getting doctor ID:', error)
    res.status(500).json({ error: 'Failed to get doctor ID' })
  }
}

// POST /api/doctor-requests/send
// Patient sends a connection request to a doctor
export const sendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorUniqueId, patientName } = req.body
    const patientId = '000000000000000000000000' // mock patient

    if (!doctorUniqueId) {
      res.status(400).json({ error: 'Doctor ID is required' })
      return
    }

    // Check if a pending request already exists
    const existing = await DoctorRequest.findOne({
      doctorUniqueId: doctorUniqueId.toUpperCase(),
      patientId,
      status: 'Pending'
    })

    if (existing) {
      res.status(409).json({ error: 'A pending request already exists for this doctor' })
      return
    }

    const request = new DoctorRequest({
      doctorUniqueId: doctorUniqueId.toUpperCase(),
      patientId,
      patientName: patientName || 'Patient'
    })

    await request.save()

    res.status(201).json({
      success: true,
      data: request
    })
  } catch (error) {
    console.error('Error sending doctor request:', error)
    res.status(500).json({ error: 'Failed to send request' })
  }
}

// GET /api/doctor-requests/patient
// Patient fetches their sent requests
export const getPatientRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = '000000000000000000000000'
    const requests = await DoctorRequest.find({ patientId }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('Error fetching patient requests:', error)
    res.status(500).json({ error: 'Failed to fetch requests' })
  }
}

// GET /api/doctor-requests/doctor/:doctorId
// Doctor fetches incoming requests for their unique ID
export const getDoctorRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params
    const id = Array.isArray(doctorId) ? doctorId[0] : doctorId
    const requests = await DoctorRequest.find({
      doctorUniqueId: id.toUpperCase()
    }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('Error fetching doctor requests:', error)
    res.status(500).json({ error: 'Failed to fetch requests' })
  }
}

// POST /api/doctor-requests/:id/respond
// Doctor accepts or rejects a request
export const respondToRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { accept, doctorName } = req.body

    const request = await DoctorRequest.findById(id)

    if (!request) {
      res.status(404).json({ error: 'Request not found' })
      return
    }

    if (request.status !== 'Pending') {
      res.status(400).json({ error: 'Request has already been responded to' })
      return
    }

    request.status = accept ? 'Accepted' : 'Rejected'
    request.respondedAt = new Date()
    await request.save()

    // If accepted, create a DoctorAccess share with NO records (patient adds manually)
    if (accept) {
      const recordIds: string[] = []

      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 10) // Long-lived access

      const shareToken = Math.random().toString(36).substring(2, 8).toUpperCase()

      const access = new DoctorAccess({
        patientId: request.patientId,
        doctorEmail: '',
        doctorName: doctorName || 'Doctor',
        shareToken,
        recordIds,
        expiresAt,
        accessType: 'view_with_notes'
      })

      await access.save()

      res.status(200).json({
        success: true,
        message: 'Request accepted. Patient connected.',
        data: { request, shareToken: access.shareToken }
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Request rejected.',
      data: { request }
    })
  } catch (error) {
    console.error('Error responding to request:', error)
    res.status(500).json({ error: 'Failed to respond to request' })
  }
}
