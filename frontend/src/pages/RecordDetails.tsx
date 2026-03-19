import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Clock, User, Download, Printer, Share, Activity, Trash2 } from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getRecord, MedicalRecord, deleteRecord } from '../services/api'

const RecordDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!id) return
    if (window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      try {
        setLoading(true)
        const response = await deleteRecord(id)
        if (response.success) {
          navigate('/records')
        } else {
          setError('Failed to delete record')
        }
      } catch (err) {
        console.error('Error deleting record:', err)
        alert('Failed to delete record')
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const fetchRecordData = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        const response = await getRecord(id)
        if (response.success) {
          setRecord(response.data.record)
        } else {
          setError('Record not found')
        }
      } catch (err) {
        setError('Failed to load medical record')
        console.error('Error fetching record:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecordData()
  }, [id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Completed': return 'green'
      case 'Archived': return 'gray'
      case 'Pending': return 'yellow'
      default: return 'red'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <ErrorMessage message={error || 'Record not found'} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  // Display data fields helper
  const displayFields = record.manualData || record.extractedData || {}
  const fields = (record as any).displayData || {}

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/records')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {record.category} - {record.patientName || 'Unknown'}
              </h1>
              <p className="text-gray-600">
                Result Date: {record.date || new Date(record.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Delete
            </Button>
            <Badge color={getStatusColor(record.status)}>
              {record.status}
            </Badge>
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>
              Download
            </Button>
            <Button variant="outline" icon={<Printer className="w-4 h-4" />}>
              Print
            </Button>
          </div>
        </div>

        {/* Record Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Record Information</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Category</span>
                </div>
                <span className="text-sm font-medium">{record.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-500">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Patient</span>
                </div>
                <span className="text-sm font-medium">{record.patientName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                </div>
                <span className="text-sm font-medium">{new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Extracted Values</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(fields).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">{key.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-bold text-blue-600">{String(value)}</p>
                </div>
              ))}
              {Object.keys(fields).length === 0 && (
                <p className="text-sm text-gray-400 col-span-full italic">No specific metrics extracted.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Record Details */}
        <Card className="p-8">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                Notes & Findings
              </h3>
              <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm italic text-gray-700">
                {record.notes || "No additional notes provided for this record."}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3">
              <Button onClick={() => window.print()} variant="primary">
                Print Report
              </Button>
              <Button onClick={() => navigate('/records')} variant="outline">
                Back to Records
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default RecordDetails