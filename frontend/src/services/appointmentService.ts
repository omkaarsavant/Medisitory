// === frontend/src/services/appointmentService.ts ===

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

apiClient.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('auth_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface IAppointment {
  _id: string;
  userId: string;
  doctorId: string;
  patientName: string;
  date: string; // ISO String
  time: string;
  doctorName: string;
  duration: number;
  type: 'Checkup' | 'Follow-up' | 'Consultation' | 'Emergency' | 'Other';
  status: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'Completed';
  location: string;
  reason?: string;
  notesForPatient: string;
  reminderType: '1 day before' | '1 hour before' | 'anytime' | 'none';
  customReminderTime?: string;
  preVisitQuestions: string[];
  postVisitNotes: string;
  suggestedFollowUp: string;
  createdAt: string;
  updatedAt: string;
}

export const getAppointments = async (): Promise<IAppointment[]> => {
  const response = await apiClient.get('/api/appointments')
  return response.data.data
}

export const getDoctorAppointments = async (): Promise<IAppointment[]> => {
  const response = await apiClient.get('/api/appointments/doctor')
  return response.data.data
}

export const getAppointment = async (id: string): Promise<IAppointment> => {
  const response = await apiClient.get(`/api/appointments/${id}`)
  return response.data.data
}

export interface CreateAppointmentDTO {
  date: string;
  time: string;
  doctorName: string;
  patientName?: string;
  userId?: string;
  doctorId?: string;
  duration?: number;
  type?: 'Checkup' | 'Follow-up' | 'Consultation' | 'Emergency' | 'Other';
  status?: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'Completed';
  location: string;
  reason?: string;
  notesForPatient?: string;
  reminderType?: '1 day before' | '1 hour before' | 'anytime' | 'none';
  customReminderTime?: string;
  preVisitQuestions?: string[];
}

export const createAppointment = async (data: CreateAppointmentDTO): Promise<IAppointment> => {
  const response = await apiClient.post('/api/appointments', data)
  return response.data.data
}

export interface UpdateAppointmentDTO extends Partial<CreateAppointmentDTO> {
  postVisitNotes?: string;
  suggestedFollowUp?: string;
}

export const updateAppointment = async (id: string, data: UpdateAppointmentDTO): Promise<IAppointment> => {
  const response = await apiClient.put(`/api/appointments/${id}`, data)
  return response.data.data
}

export const deleteAppointment = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/appointments/${id}`)
}
