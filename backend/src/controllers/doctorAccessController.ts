import { Request, Response } from 'express'
import DoctorAccess from '../models/DoctorAccess'
import MedicalRecord from '../models/MedicalRecord'
import Message from '../models/Message'
import DoctorRequest from '../models/DoctorRequest'

// Generate a random 6-character alphanumeric code for easy typing
const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const createShareToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordIds, expiresInDays } = req.body
    
    // In a real app we'd get this from req.user
    // But since this is a local app without real auth right now, we hardcode a string or use a mock
    const patientId = '000000000000000000000000' 

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      res.status(400).json({ error: 'Please select at least one record to share.' })
      return
    }

    const days = expiresInDays || 1
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

    const shareToken = generateShortCode()

    const access = new DoctorAccess({
      patientId,
      shareToken,
      recordIds,
      expiresAt,
      accessType: 'view_only',
      // Provide an empty/anonymous dummy since the doctor is just scanning
      doctorEmail: ''
    })

    await access.save()

    res.status(201).json({
      success: true,
      data: {
        shareToken: access.shareToken,
        expiresAt: access.expiresAt,
        recordCount: access.recordIds.length
      }
    })
  } catch (error) {
    console.error('Error creating share token:', error)
    res.status(500).json({ error: 'Failed to create share token' })
  }
}

export const getSharedRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params

    if (!token) {
      res.status(400).json({ error: 'Share token is required' })
      return
    }

    const isSaved = req.query.saved === 'true'

    // Find the token
    const tokenStr = Array.isArray(token) ? token[0] : token
    const query: any = {
      shareToken: tokenStr.toUpperCase(),
      revokedAt: null
    }

    // Only enforce expiration if not accessed from a saved dashboard claim
    if (!isSaved) {
      query.expiresAt = { $gt: new Date() }
    }

    const access = await DoctorAccess.findOne(query)

    if (!access) {
      res.status(404).json({ error: 'Invalid or expired share token' })
      return
    }

    // Get ALL records (In this single-patient app, all records are patient records)
    const allRecords = await MedicalRecord.find({}).sort({ visitDate: -1 })

    // Map records to include a restricted flag and scrub data if restricted
    const records = allRecords.map(record => {
      const isShared = access.recordIds.some(id => id.toString() === record._id.toString())
      
      if (isShared) {
        return {
          ...record.toObject(),
          isRestricted: false
        }
      }

      // Scrub metadata for restricted records
      return {
        _id: record._id,
        category: record.category,
        visitDate: record.visitDate,
        doctorName: record.doctorName,
        hospitalName: record.hospitalName,
        status: record.status,
        createdAt: record.createdAt,
        isRestricted: true
        // DO NOT include: extractedData, displayData, manualData, notes, aiAnalysis, imagePath, fileUrl, aiFindings, aiNotes
      }
    })

    // Optionally log access
    if (typeof (access as any).logAccess === 'function') {
      await (access as any).logAccess('view', req.ip || 'unknown')
    }

    res.status(200).json({
      success: true,
      data: {
        shareToken: token, // Added for chat integration
        patient: {
          name: 'Jane Doe',
          id: access.patientId,
          age: 28,
          dob: '1996-03-24',
          bloodGroup: 'A+',
          sharedAt: access.createdAt,
          expiresAt: access.expiresAt
        },
        records: records,
        accessType: access.accessType
      }
    })
  } catch (error) {
    console.error('Error retrieving shared records:', error)
    res.status(500).json({ error: 'Failed to retrieve shared records' })
  }
}

export const getPatientShares = async (req: Request, res: Response): Promise<void> => {
  try {
    // Hardcoded patientId for now
    const patientId = '000000000000000000000000'

    const shares = await DoctorAccess.find({
      patientId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: shares
    })
  } catch (error) {
    console.error('Error fetching patient shares:', error)
    res.status(500).json({ error: 'Failed to fetch active shares' })
  }
}

export const revokeShare = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params
    const tokenStr = Array.isArray(token) ? token[0] : token

    const share = await DoctorAccess.findOneAndUpdate(
      { shareToken: tokenStr.toUpperCase(), revokedAt: null },
      { revokedAt: new Date() },
      { new: true }
    )

    if (!share) {
      res.status(404).json({ error: 'Share not found or already revoked' })
      return
    }

    // If this share was linked to a doctor connection request, mark the request as Rejected
    // so the patient can re-add the doctor if they want to.
    if (share.doctorUniqueId) {
      await DoctorRequest.findOneAndUpdate(
        { 
          doctorUniqueId: share.doctorUniqueId, 
          patientId: share.patientId,
          status: 'Accepted'
        },
        { status: 'Rejected' }
      )
    }

    res.status(200).json({
      success: true,
      message: 'Access revoked successfully'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke access' })
  }
}

export const updateShareRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params
    const { recordIds } = req.body
    const tokenStr = Array.isArray(token) ? token[0] : token

    if (!recordIds || !Array.isArray(recordIds)) {
      res.status(400).json({ error: 'Record IDs must be an array' })
      return
    }

    const share = await DoctorAccess.findOneAndUpdate(
      { shareToken: tokenStr.toUpperCase(), revokedAt: null },
      { recordIds },
      { new: true }
    )

    if (!share) {
      res.status(404).json({ error: 'Share not found or already revoked' })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Access records updated successfully',
      data: share
    })
  } catch (error) {
    console.error('Error updating share records:', error)
    res.status(500).json({ error: 'Failed to update share records' })
  }
}

export const updateDoctorNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { notes } = req.body

    const record = await MedicalRecord.findByIdAndUpdate(
      id,
      { 
        doctorNotes: notes,
        hasNewDoctorNote: true // Trigger notification for user
      },
      { new: true }
    )

    if (!record) {
      res.status(404).json({ error: 'Medical record not found' })
      return
    }

    res.status(200).json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Error updating doctor notes:', error)
    res.status(500).json({ error: 'Failed to update doctor notes' })
  }
}

export const clearNoteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    await MedicalRecord.findByIdAndUpdate(id, { hasNewDoctorNote: false })
    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notification' })
  }
}

export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params
    const messages = await Message.find({ shareToken: token }).sort({ createdAt: 1 })
    
    res.status(200).json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    res.status(500).json({ error: 'Failed to fetch chat history' })
  }
}
