import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  getAppointments as fetchApptsApi, 
  createAppointment as createApptApi, 
  updateAppointment as updateApptApi, 
  deleteAppointment as deleteApptApi,
  IAppointment,
  CreateAppointmentDTO,
  UpdateAppointmentDTO
} from '../services/appointmentService'

interface AppointmentState {
  appointments: IAppointment[]
  loading: boolean
  error: string | null
  fetchAppointments: () => Promise<void>
  addAppointment: (data: CreateAppointmentDTO) => Promise<IAppointment>
  updateAppointment: (id: string, data: UpdateAppointmentDTO) => Promise<IAppointment>
  deleteAppointment: (id: string) => Promise<void>
  setAppointments: (appointments: IAppointment[]) => void
}

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      appointments: [],
      loading: false,
      error: null,

      setAppointments: (appointments) => set({ appointments }),

      fetchAppointments: async () => {
        set({ loading: true, error: null })
        try {
          const data = await fetchApptsApi()
          // Sort: upcoming first
          data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          set({ appointments: data, loading: false })
        } catch (err: any) {
          set({ error: err.message || 'Failed to fetch appointments', loading: false })
        }
      },

      addAppointment: async (data) => {
        const newAppt = await createApptApi(data)
        const current = get().appointments
        const updated = [...current, newAppt].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        set({ appointments: updated })
        return newAppt
      },

      updateAppointment: async (id, data) => {
        const updatedAppt = await updateApptApi(id, data)
        const updated = get().appointments.map(a => a._id === id ? updatedAppt : a)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        set({ appointments: updated })
        return updatedAppt
      },

      deleteAppointment: async (id) => {
        await deleteApptApi(id)
        set({ appointments: get().appointments.filter(a => a._id !== id) })
      }
    }),
    {
      name: 'appointment-storage',
    }
  )
)
