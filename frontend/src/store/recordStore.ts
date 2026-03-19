import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MedicalRecord, GetRecordsResponse } from '../services/api'

interface RecordState {
  records: MedicalRecord[]
  currentRecord: MedicalRecord | null
  loading: boolean
  error: string | null
  total: number
  totalPages: number
  filters: {
    category: string
    startDate: string
    endDate: string
    page: number
    limit: number
  }
}

type RecordActions = {
  setRecords: (records: MedicalRecord[]) => void
  addRecord: (record: MedicalRecord) => void
  updateRecord: (id: string, data: Partial<MedicalRecord>) => void
  deleteRecord: (id: string) => void
  setFilters: (filters: Partial<RecordState['filters']>) => void
  clearFilters: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentRecord: (record: MedicalRecord | null) => void
  fetchRecords: () => Promise<void>
  fetchRecord: (id: string) => Promise<void>
}

type RecordStore = RecordState & RecordActions

export const useRecordStore = create<RecordStore>()(
  persist(
    (set, get) => ({
      // Initial state
      records: [],
      currentRecord: null,
      loading: false,
      error: null,
      total: 0,
      totalPages: 0,
      filters: {
        category: '',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 10
      },

      // Actions
      setRecords: (records: MedicalRecord[]) => set({ records }),

      addRecord: (record) => {
        set((state) => ({
          records: [record, ...state.records]
        }))
      },

      updateRecord: (id, data) => {
        set((state) => ({
          records: state.records.map(record =>
            record.id === id ? { ...record, ...data } : record
          ),
          currentRecord: state.currentRecord?.id === id
            ? { ...state.currentRecord, ...data }
            : state.currentRecord
        }))
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter(record => record.id !== id),
          currentRecord: state.currentRecord?.id === id ? null : state.currentRecord
        }))
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters }
        }))
      },

      clearFilters: () => {
        set({
          filters: {
            category: '',
            startDate: '',
            endDate: '',
            page: 1,
            limit: 10
          }
        })
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setCurrentRecord: (record) => set({ currentRecord: record }),

      fetchRecords: async () => {
        const { filters } = get()
        try {
          set({ loading: true, error: null })

          const response = await import('../services/api').then(m => m.getRecords(filters))

          set({
            records: response.data.records,
            total: response.data.total,
            totalPages: response.data.totalPages,
            loading: false
          })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch records'
          })
        }
      },

      fetchRecord: async (id: string) => {
        try {
          set({ loading: true, error: null })

          const response = await import('../services/api').then(m => m.getRecord(id))

          set({
            currentRecord: response.data.record,
            loading: false
          })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch record'
          })
        }
      }
    }),
    {
      name: 'record-store',
      partialize: (state) => ({
        records: state.records,
        currentRecord: state.currentRecord,
        filters: state.filters
      })
    }
  )
)