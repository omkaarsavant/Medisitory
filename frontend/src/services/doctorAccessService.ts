import axios from 'axios'
import { MedicalRecord } from './api'

const API_URL = 'http://localhost:5000/api/doctor-access'

export interface DoctorAccess {
  shareToken: string
  patientId: string
  recordIds: string[]
  doctorEmail?: string
  doctorName?: string
  expiresAt: string
  createdAt: string
  accessType: string
}

export interface Message {
  _id: string
  shareToken: string
  senderId: 'patient' | 'doctor' | 'system'
  senderName: string
  content: string
  contextRecordId?: string
  timestamp: string
  createdAt: string
}

export interface SharedPatientData {
  shareToken: string
  patient: {
    name: string
    id: string
    age: number
    dob: string
    bloodGroup: string
    sharedAt: string
    expiresAt: string
  }
  records: MedicalRecord[]
  accessType: string
}

export const createShareToken = async (recordIds: string[], expiresInDays: number = 1): Promise<DoctorAccess> => {
  const response = await axios.post(`${API_URL}/share`, { recordIds, expiresInDays })
  return response.data.data
}

export const getSharedRecords = async (token: string, isSaved: boolean = false): Promise<SharedPatientData> => {
  try {
    const response = await axios.get(`${API_URL}/${token}${isSaved ? '?saved=true' : ''}`)
    return response.data.data
  } catch (error) {
    // Handle error, e.g., rethrow or return a default value
    throw error
  }
}

export const getActiveShares = async (): Promise<DoctorAccess[]> => {
  try {
    const response = await axios.get(`${API_URL}/shares/active`)
    return response.data.data
  } catch (error) {
    console.error('Error fetching active shares:', error)
    throw error
  }
}

export const revokeAccess = async (token: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/shares/${token}`)
  } catch (error) {
    console.error('Error revoking access:', error)
    throw error
  }
}

export const updateShareRecords = async (token: string, recordIds: string[]): Promise<DoctorAccess> => {
  try {
    const response = await axios.put(`${API_URL}/shares/${token}`, { recordIds })
    return response.data.data
  } catch (error) {
    console.error('Error updating share records:', error)
    throw error
  }
}

export const saveDoctorNotes = async (recordId: string, notes: string): Promise<any> => {
  try {
    const response = await axios.put(`${API_URL}/records/${recordId}/notes`, { notes })
    return response.data
  } catch (error) {
    console.error('Error saving doctor notes:', error)
    throw error
  }
}

export const clearNoteNotification = async (recordId: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_URL}/records/${recordId}/clear-notification`)
    return response.data
  } catch (error) {
    console.error('Error clearing notification:', error)
    throw error
  }
}

export const getChatHistory = async (token: string): Promise<Message[]> => {
  try {
    const response = await axios.get(`${API_URL}/messages/${token}`)
    return response.data.data
  } catch (error) {
    console.error('Error fetching chat history:', error)
    throw error
  }
}
