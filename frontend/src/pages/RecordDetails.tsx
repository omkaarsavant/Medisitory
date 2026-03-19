import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  ArrowLeft, 
  Download, 
  Share2, 
  Trash2, 
  TrendingUp, 
  Search, 
  Info, 
  AlertCircle,
  Printer,
  Clock,
  Activity,
  Eye,
  ExternalLink
} from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getRecord, MedicalRecord, deleteRecord } from '../services/api'

const RecordDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isPDF = record?.fileName?.toLowerCase().endsWith('.pdf') || record?.imagePath?.toLowerCase().includes('.pdf');

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
              <h1 className="text-2xl font-bold text-gray-900 capitalize">
                {record.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} {new Date(record.uploadDate || record.date || record.createdAt).toLocaleDateString('en-GB')}
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

        {/* Source Document Preview */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Eye className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Source Document</h3>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(record.imagePath, '_blank')}
                className="text-xs h-8"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Full
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = record.imagePath;
                  link.download = record.fileName || 'medical-record';
                  link.click();
                }}
                className="text-xs h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 min-h-[400px] flex items-center justify-center">
            {isPDF ? (
              <iframe 
                src={`${record.imagePath}#toolbar=0`} 
                className="w-full h-[600px] border-none"
                title="Medical record PDF preview"
              />
            ) : (
              <div className="relative group cursor-zoom-in w-full">
                <img 
                  src={record.imagePath} 
                  alt="Medical Record" 
                  className="w-full h-auto object-contain max-h-[800px] mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
              </div>
            )}
          </div>
        </Card>

        {/* Record Details */}
        <Card className="p-8">
          <div className="space-y-8">
           {/* Smart Insights Section */}
          {(record.aiFindings || record.aiNotes) && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Smart Insights</h3>
                </div>
                <Badge color="blue" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 italic">
                  Powered by AI
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Findings Card */}
                {record.aiFindings && (
                  <Card className="p-6 bg-gradient-to-br from-white to-blue-50/30 border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Search className="w-20 h-20 text-blue-600" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Primary Findings</p>
                      <p className="text-gray-800 font-medium leading-relaxed">
                        {record.aiFindings}
                      </p>
                    </div>
                  </Card>
                )}

                {/* Notes/Advice Card */}
                {record.aiNotes && (
                  <Card className="p-6 bg-gradient-to-br from-white to-purple-50/30 border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Info className="w-20 h-20 text-purple-600" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Recommended Steps</p>
                      <p className="text-gray-800 font-medium leading-relaxed">
                        {record.aiNotes}
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Disclaimer */}
              <div className="mt-4 flex items-start space-x-2 text-[10px] text-gray-400 italic px-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <p>
                  Important: These automated findings are generated by AI for informational purposes only. They do not constitute a medical diagnosis or treatment advice. Always consult with a qualified medical professional for the interpretation of your laboratory results.
                </p>
              </div>
            </div>
          )}


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