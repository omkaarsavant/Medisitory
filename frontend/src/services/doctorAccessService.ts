import axios from 'axios'
import { MedicalRecord } from './api'

const API_URL = 'http://localhost:5000/api/doctor-access'

export interface DoctorAccess {
  shareToken: string
  patientId: string
  recordIds: string[]
  doctorEmail?: string
  doctorName?: string
  doctorUniqueId?: string
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

// === Doctor Request APIs ===

const REQUEST_URL = 'http://localhost:5000/api/doctor-requests'

export interface DoctorRequestData {
  _id: string
  doctorUniqueId: string
  patientId: string
  patientName: string
  status: 'Pending' | 'Accepted' | 'Rejected'
  respondedAt?: string
  createdAt: string
}

export const getDoctorUniqueId = async (sessionKey: string = 'default_doctor'): Promise<string> => {
  const response = await axios.get(`${REQUEST_URL}/doctor-id?key=${sessionKey}`)
  return response.data.data.doctorId
}

export const sendDoctorRequest = async (doctorUniqueId: string, patientName: string = 'Patient'): Promise<DoctorRequestData> => {
  const response = await axios.post(`${REQUEST_URL}/send`, { doctorUniqueId, patientName })
  return response.data.data
}

export const getMyRequests = async (): Promise<DoctorRequestData[]> => {
  const response = await axios.get(`${REQUEST_URL}/patient`)
  return response.data.data
}

export const getDoctorRequests = async (doctorId: string): Promise<DoctorRequestData[]> => {
  const response = await axios.get(`${REQUEST_URL}/doctor/${doctorId}`)
  return response.data.data
}

export const respondToRequest = async (id: string, accept: boolean, doctorName: string = 'Doctor'): Promise<any> => {
  const response = await axios.post(`${REQUEST_URL}/${id}/respond`, { accept, doctorName })
  return response.data
}
