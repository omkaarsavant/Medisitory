import { useState, useEffect } from 'react'
import { MedicalRecord, GetRecordsResponse } from '../services/api'

interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export const useApi = <T>(url: string, options?: RequestInit): ApiResponse<T> => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [url])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

// Specialized hooks for our API
export const useRecords = (filters: {
  category?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): ApiResponse<GetRecordsResponse> => {
  const params = new URLSearchParams()

  if (filters.category) params.append('category', filters.category)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  return useApi<GetRecordsResponse>(`/api/records?${params.toString()}`)
}

export const useRecord = (id: string): ApiResponse<MedicalRecord> => {
  return useApi<MedicalRecord>(`/api/records/${id}`)
}

export const useUploadFile = (
  file: File,
  category: string,
  onProgress?: (progress: number) => void
): ApiResponse<any> => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async () => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    refetch: upload
  }
}