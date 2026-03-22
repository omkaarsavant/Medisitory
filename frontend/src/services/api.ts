import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

// Request interceptor for adding auth token if available
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          console.error('Validation error:', data.errors || data.message)
          break
        case 401:
          console.error('Unauthorized')
          break
        case 403:
          console.error('Forbidden')
          break
        case 404:
          console.error('Not found')
          break
        case 500:
          console.error('Server error:', data.message || 'Internal server error')
          break
        default:
          console.error('HTTP error:', status, data.message || 'Unknown error')
      }
    } else if (error.request) {
      console.error('No response from server')
    } else {
      console.error('Request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Type definitions
export interface UploadFileResponse {
  success: boolean
  data: {
    uploadId: string
    fileUrl: string
    fileSize: number
    fileName: string
    category: string
    publicId: string
  }
}

export interface ExtractDataResponse {
  success: boolean
  data: {
    fields: Record<string, any>
    patientName?: string
    confidence: number
    missingFields: string[]
    processedText: string
    rawText?: string
    detectedCategory?: string
  }
}

export interface ConfirmExtractionResponse {
  success: boolean
}

export interface MedicalRecord {
  id: string
  _id?: string
  category: string
  date: string
  visitDate?: string
  uploadDate?: string
  doctor?: string
  doctorName?: string
  hospital?: string
  hospitalName?: string
  imagePath?: string
  fileName?: string
  fileSize?: number
  fileType?: string
  status: 'processing' | 'processed' | 'error' | 'Completed' | 'Pending' | 'Active'
  extractedData?: Record<string, any>
  manualData?: Record<string, any>
  notes?: string
  aiFindings?: string
  aiNotes?: string
  createdAt: string
  updatedAt: string
}

export interface GetRecordsResponse {
  success: boolean
  data: {
    records: MedicalRecord[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface GetRecordResponse {
  success: boolean
  data: {
    record: MedicalRecord
  }
}

export interface UpdateRecordResponse {
  record: MedicalRecord
}

export interface DeleteRecordResponse {
  success: boolean
}

// API functions
export const uploadFile = async (file: File, category: string, skipRecord: boolean = false): Promise<UploadFileResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    if (skipRecord) {
      formData.append('skipRecord', 'true')
    }

    const response = await apiClient.post<UploadFileResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  } catch (error) {
    console.error('Upload file error:', error)
    throw new Error('Failed to upload file')
  }
}

export const extractData = async (uploadId: string, category: string = ''): Promise<ExtractDataResponse> => {
  try {
    const response = await apiClient.post<ExtractDataResponse>(`/api/upload/${uploadId}/extract`, {
      category
    }, {
      timeout: 60000
    })

    return response.data
  } catch (error) {
    console.error('Extract data error:', error)
    throw new Error('Failed to extract data')
  }
}

export const confirmExtraction = async (
  uploadId: string, 
  manualCorrections: Record<string, any>, 
  category?: string,
  date?: string,
  time?: string
): Promise<ConfirmExtractionResponse> => {
  try {
    const response = await apiClient.post<ConfirmExtractionResponse>(`/api/upload/${uploadId}/confirm`, {
      manualCorrections,
      category,
      date,
      time
    })

    return response.data
  } catch (error) {
    console.error('Confirm extraction error:', error)
    throw new Error('Failed to confirm extraction')
  }
}

export interface ManualAddRecordData {
  category: string
  date: string
  time?: string
  doctor?: string
  hospital?: string
  metrics: Record<string, any>
  imagePath?: string
  publicId?: string
  fileName?: string
  fileSize?: number
}

export const manualAddRecord = async (data: ManualAddRecordData): Promise<GetRecordResponse> => {
  try {
    const response = await apiClient.post<GetRecordResponse>('/api/upload/manual', data)
    return response.data
  } catch (error) {
    console.error('Manual add record error:', error)
    throw new Error('Failed to add record manually')
  }
}

export const getRecords = async (filters: {
  category?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): Promise<GetRecordsResponse> => {
  try {
    const params = new URLSearchParams()

    if (filters.category) params.append('category', filters.category)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())

    const response = await apiClient.get<GetRecordsResponse>(`/api/records?${params.toString()}`)

    return response.data
  } catch (error) {
    console.error('Get records error:', error)
    throw new Error('Failed to fetch records')
  }
}

export const getRecord = async (recordId: string): Promise<GetRecordResponse> => {
  try {
    const response = await apiClient.get<GetRecordResponse>(`/api/records/${recordId}`)

    return response.data
  } catch (error) {
    console.error('Get record error:', error)
    throw new Error('Failed to fetch record')
  }
}

export const updateRecord = async (recordId: string, data: Partial<MedicalRecord>): Promise<UpdateRecordResponse> => {
  try {
    const response = await apiClient.put<UpdateRecordResponse>(`/api/records/${recordId}`, data)

    return response.data
  } catch (error) {
    console.error('Update record error:', error)
    throw new Error('Failed to update record')
  }
}

export const deleteRecord = async (recordId: string): Promise<DeleteRecordResponse> => {
  try {
    const response = await apiClient.delete<DeleteRecordResponse>(`/api/records/${recordId}`)

    return response.data
  } catch (error) {
    console.error('Delete record error:', error)
    throw new Error('Failed to delete record')
  }
}

// Progress upload function with cancellation
export const uploadFileWithProgress = async (
  file: File,
  category: string,
  onProgress: (progress: number) => void,
  cancelToken?: CancelTokenSource
): Promise<UploadFileResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    const response = await apiClient.post<UploadFileResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          onProgress(progress)
        }
      },
      cancelToken: cancelToken?.token
    })

    return response.data
  } catch (error) {
    console.error('Upload file with progress error:', error)
    throw new Error('Failed to upload file')
  }
}

export const getAnalyticsData = async (category: string, days: number = 30, _cb?: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/analytics/metrics`, {
      params: { category, days, _cb }
    })
    return response.data
  } catch (error) {
    console.error('Get analytics data error:', error)
    throw new Error('Failed to fetch analytics data')
  }
}

export const getAnalyticsSummary = async (): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/analytics/summary`)
    return response.data
  } catch (error) {
    console.error('Get analytics summary error:', error)
    throw new Error('Failed to fetch analytics summary')
  }
}

// Export all functions for easy import
export default {
  uploadFile,
  extractData,
  confirmExtraction,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  uploadFileWithProgress,
  getAnalyticsData,
  getAnalyticsSummary,
  manualAddRecord
}