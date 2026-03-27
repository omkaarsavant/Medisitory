import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SharedPatientData } from '../services/doctorAccessService'

export interface SavedPatient {
  patientId: string
  name: string
  age: number
  dob: string
  bloodGroup: string
  shareToken: string
  sharedAt: string
  expiresAt: string
  recordCount: number
}

interface DoctorState {
  savedPatients: SavedPatient[]
  activeToken: string | null
  unreadCounts: Record<string, number>
  doctorUniqueId: string | null
  
  // Actions
  addPatient: (data: SharedPatientData, token: string) => void
  removePatient: (token: string) => void
  setActiveToken: (token: string | null) => void
  incrementUnread: (token: string) => void
  clearUnread: (token: string) => void
  clearAll: () => void
  setDoctorUniqueId: (id: string) => void
}

export const useDoctorStore = create<DoctorState>()(
  persist(
    (set, get) => ({
      savedPatients: [],
      activeToken: null,
      unreadCounts: {},
      doctorUniqueId: null,

      addPatient: (data: SharedPatientData, token: string) => {
        set((state) => {
          // Check if already exists, update if true, otherwise add
          const existing = state.savedPatients.find(p => p.shareToken === token || p.patientId === data.patient.id)
          const newPatient: SavedPatient = {
            patientId: data.patient.id,
            name: data.patient.name,
            age: data.patient.age,
            dob: data.patient.dob,
            bloodGroup: data.patient.bloodGroup,
            shareToken: token,
            sharedAt: data.patient.sharedAt,
            expiresAt: data.patient.expiresAt,
            recordCount: data.records.length
          }

          if (existing) {
            return {
              savedPatients: state.savedPatients.map(p => 
                p.shareToken === existing.shareToken ? newPatient : p
              ),
              activeToken: token
            }
          }

          return {
            savedPatients: [...state.savedPatients, newPatient],
            activeToken: token
          }
        })
      },

      removePatient: (token: string) => {
        set((state) => {
          const newUnreads = { ...state.unreadCounts }
          delete newUnreads[token]
          return {
            savedPatients: state.savedPatients.filter(p => p.shareToken !== token),
            activeToken: state.activeToken === token ? null : state.activeToken,
            unreadCounts: newUnreads
          }
        })
      },

      setActiveToken: (token: string | null) => {
        set({ activeToken: token })
        if (token) get().clearUnread(token)
      },

      incrementUnread: (token: string) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [token]: (state.unreadCounts[token] || 0) + 1
          }
        }))
      },

      clearUnread: (token: string) => {
        set((state) => {
          const newUnreads = { ...state.unreadCounts }
          delete newUnreads[token]
          return { unreadCounts: newUnreads }
        })
      },

      clearAll: () => {
        set({ savedPatients: [], activeToken: null, unreadCounts: {}, doctorUniqueId: null })
      },

      setDoctorUniqueId: (id: string) => {
        set({ doctorUniqueId: id })
      }
    }),
    {
      name: 'doctor-portal-storage',
    }
  )
)
