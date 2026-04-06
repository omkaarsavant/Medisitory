import React, { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
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
  ExternalLink,
  Bell,
  Home,
  Brain,
  X,
  Shield,
  Sparkles,
  UserPlus,
  CheckSquare,
  Square,
  Save,
  Loader2,
  Stethoscope,
  Check,
  Users,
  ArrowRight,
  ChevronRight,
  Plus
} from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getRecord, MedicalRecord, deleteRecord } from '../services/api'
import { clearNoteNotification, getActiveShares, updateShareRecords, DoctorAccess } from '../services/doctorAccessService'
import { useRecordStore } from '../store/recordStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { IAppointment } from '../services/appointmentService'

const RecordDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isPDF = record?.fileName?.toLowerCase().endsWith('.pdf') || record?.imagePath?.toLowerCase().includes('.pdf');
  const [downloading, setDownloading] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shares, setShares] = useState<DoctorAccess[]>([])
  const [fetchingShares, setFetchingShares] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Alignment State (Shared flow & Notifications)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([])
  const [isSelectDoctorModalOpen, setIsSelectDoctorModalOpen] = useState(false)

  // Stores
  const { allRecords, fetchAllRecords, records: storeRecords } = useRecordStore()
  const { appointments, fetchAppointments } = useAppointmentStore()

  const fetchShares = async () => {
    try {
      setFetchingShares(true)
      const data = await getActiveShares()
      setShares(data)
    } finally {
      setFetchingShares(false)
    }
  }


  const toggleShare = async (share: DoctorAccess) => {
    if (!record) return
    const recordId = record._id || record.id
    if (!recordId) return

    setTogglingId(share.shareToken)
    try {
      let newRecordIds = [...share.recordIds]
      if (newRecordIds.includes(recordId)) {
        newRecordIds = newRecordIds.filter(id => id !== recordId)
      } else {
        newRecordIds.push(recordId)
      }

      const updated = await updateShareRecords(share.shareToken, newRecordIds)
      setShares(prev => prev.map(s => s.shareToken === share.shareToken ? updated : s))
    } catch (err) {
      alert('Failed to update share')
    } finally {
      setTogglingId(null)
    }
  }

  const handleShareClick = () => {
    if (record && (record._id || record.id)) {
      setSelectedShareIds([record._id || record.id || ''])
    }
    handleGenerateShareLink()
  }

  const handleGenerateShareLink = () => {
    setIsSelectDoctorModalOpen(true)
    fetchShares()
  }

  const handleDownloadPDF = async () => {
    if (!record) return
    setDownloading(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 15
      let y = margin

      // ── Header ──
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const catMap: Record<string, string> = { blood_sugar: 'Blood Sugar', bp: 'Blood Pressure', thyroid: 'Thyroid', cholesterol: 'Cholesterol', opd: 'OPD', imaging: 'Imaging', lab: 'Lab' }
      const catLabel = catMap[(record.category || 'custom').toLowerCase()] || (record.category || 'Medical').replace(/_/g, ' ')
      doc.text(`${catLabel} Report`, margin, 18)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('MedVault — Generated ' + new Date().toLocaleString('en-GB'), margin, 24)
      y = 38

      // ── Record Info ──
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Record Information', margin, y)
      y += 6
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const infoRows = [
        ['Category', catLabel],
        ['Visit Date', (() => { const d = new Date(record.visitDate || record.uploadDate || record.createdAt); return d.toLocaleDateString('en-GB') })()],
        ['Doctor', record.doctorName || record.doctor || '—'],
        ['Hospital', record.hospitalName || record.hospital || '—'],
        ['Status', record.status || '—'],
        ['Uploaded', new Date(record.uploadDate || record.createdAt).toLocaleString('en-GB')],
      ]
      infoRows.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold'); doc.text(label + ':', margin, y)
        doc.setFont('helvetica', 'normal'); doc.text(String(val), margin + 42, y)
        y += 6
      })
      y += 4

      // ── Extracted Values ──
      const displayFieldsArr = record.manualData || record.extractedData || {}
      const fieldsArr = (record as any).displayData || {}
      const allFieldsArr = Object.keys(fieldsArr).length ? fieldsArr : displayFieldsArr
      if (Object.keys(allFieldsArr).length > 0) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('Extracted Values', margin, y); y += 6
        doc.line(margin, y, pageW - margin, y); y += 5
        doc.setFontSize(10)
        Object.entries(allFieldsArr).forEach(([key, val]) => {
          if (y > 265) { doc.addPage(); y = margin }
          doc.setFont('helvetica', 'bold'); doc.text(key.replace(/_/g, ' ') + ':', margin, y)
          doc.setFont('helvetica', 'normal'); doc.text(String(val), margin + 60, y)
          y += 6
        })
        y += 4
      }

      // ── AI Insights ──
      if (record.aiFindings || record.aiNotes) {
        if (y > 240) { doc.addPage(); y = margin }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('AI Insights', margin, y); y += 6
        doc.line(margin, y, pageW - margin, y); y += 5
        doc.setFontSize(10)
        if (record.aiFindings) {
          doc.setFont('helvetica', 'bold'); doc.text('Primary Findings:', margin, y); y += 5
          doc.setFont('helvetica', 'normal')
          const findingLines = doc.splitTextToSize(record.aiFindings, pageW - margin * 2)
          findingLines.forEach((line: string) => { if (y > 270) { doc.addPage(); y = margin }; doc.text(line, margin, y); y += 5 })
          y += 3
        }
        if (record.aiNotes) {
          if (y > 240) { doc.addPage(); y = margin }
          doc.setFont('helvetica', 'bold'); doc.text('Recommended Steps:', margin, y); y += 5
          doc.setFont('helvetica', 'normal')
          const noteLines = doc.splitTextToSize(record.aiNotes, pageW - margin * 2)
          noteLines.forEach((line: string) => { if (y > 270) { doc.addPage(); y = margin }; doc.text(line, margin, y); y += 5 })
          y += 3
        }
        // Disclaimer
        doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        doc.text('* AI-generated insights are for informational purposes only. Consult a qualified medical professional.', margin, y)
        doc.setTextColor(30, 30, 30)
        y += 8
      }

      // ── Source Document (image only) ──
      if (record.imagePath && !isPDF) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject()
            img.src = record.imagePath!
          })
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
          canvas.getContext('2d')!.drawImage(img, 0, 0)
          const imgData = canvas.toDataURL('image/jpeg', 0.85)
          const maxW = pageW - margin * 2
          const ratio = img.naturalHeight / img.naturalWidth
          const imgH = Math.min(maxW * ratio, 120)
          if (y + imgH + 10 > 280) { doc.addPage(); y = margin }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
          doc.text('Source Document', margin, y); y += 6
          doc.line(margin, y, pageW - margin, y); y += 5
          doc.addImage(imgData, 'JPEG', margin, y, maxW, imgH)
        } catch { /* skip if image fails to load */ }
      }

      const safeName = (catLabel + '_report').replace(/\s+/g, '_').toLowerCase()
      doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

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
          // If there's a new note, clear the notification flag when the user views it
          if (response.data.record.hasNewDoctorNote) {
            await clearNoteNotification(id)
          }
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
    fetchAllRecords()
    fetchAppointments()
  }, [id, fetchAllRecords, fetchAppointments])

  const getStatusColor = (status?: string): 'green' | 'gray' | 'yellow' | 'red' => {
    if (!status) return 'red'
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed': return 'green'
      case 'archived': return 'gray'
      case 'pending': return 'yellow'
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
    <div className="min-h-screen bg-gray-50">
      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:block pb-12">
        <div className="container mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/records')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {(() => {
                    const cat = (record.category || 'custom').toLowerCase();
                    const mapping: Record<string, string> = {
                      'blood_sugar': 'Blood Sugar',
                      'bp': 'Blood Pressure',
                      'thyroid': 'Thyroid',
                      'cholesterol': 'Cholesterol',
                      'opd': 'OPD',
                      'imaging': 'Imaging',
                      'lab': 'Lab'
                    };
                    return mapping[cat] || cat.replace(/_/g, ' ');
                  })()}
                </h1>
                <p className="text-gray-600">
                  Uploaded: {(() => {
                    const raw = new Date(record.uploadDate || record.createdAt)
                    return raw.toLocaleString('en-GB')
                  })()}
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
              <Button
                variant="primary"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleShareClick}
                className="bg-indigo-600 hover:bg-indigo-700 border-none shadow-lg shadow-indigo-100"
              >
                Share Report
              </Button>
              <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF} loading={downloading}>
                {downloading ? 'Generating…' : 'Download PDF'}
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
                  <span className="text-sm font-medium">
                    {(() => {
                      const cat = (record.category || 'custom').toLowerCase();
                      const mapping: Record<string, string> = {
                        'blood_sugar': 'Blood Sugar',
                        'bp': 'Blood Pressure',
                        'thyroid': 'Thyroid',
                        'cholesterol': 'Cholesterol',
                        'opd': 'OPD',
                        'imaging': 'Imaging',
                        'lab': 'Lab'
                      };
                      return mapping[cat] || cat.replace(/_/g, ' ');
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Visit Date</span>
                  </div>
                  <span className="text-sm font-medium">
                    {(() => {
                      const date = new Date(record.visitDate || record.uploadDate || record.createdAt)
                      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Visit Time</span>
                  </div>
                  <span className="text-sm font-medium">
                    {(() => {
                      const date = new Date(record.visitDate || record.uploadDate || record.createdAt)
                      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    })()}
                  </span>
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

          {/* Source Documents Preview */}
          <div className={`grid grid-cols-1 ${record.prescriptionImageUrl ? 'xl:grid-cols-2' : ''} gap-6`}>
            <Card className="p-8 h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Eye className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Source Document</h3>
                </div>
                {record.imagePath && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(record.imagePath || '', '_blank')}
                      className="text-xs h-8"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Full
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = record.imagePath || '';
                        link.download = record.fileName || 'medical-record';
                        link.click();
                      }}
                      className="text-xs h-8"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>

              <div className={`bg-gray-100 rounded-xl overflow-hidden border border-gray-200 min-h-[400px] flex items-center justify-center ${!record.imagePath ? 'bg-white' : ''}`}>
                {record.imagePath ? (
                  isPDF ? (
                    <iframe
                      src={`${record.imagePath}#toolbar=0`}
                      className="w-full h-[600px] border-none"
                      title="Medical record PDF preview"
                    />
                  ) : (
                    <div className="relative group cursor-zoom-in w-full h-full">
                      <img
                        src={record.imagePath}
                        alt="Medical Record"
                        className="w-full h-full object-contain max-h-[800px] mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                    </div>
                  )
                ) : (
                  <div className="text-center space-y-4 max-w-sm p-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 shadow-sm border border-blue-100">
                      <Info className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">No Document Attached</h4>
                      <p className="text-sm font-bold text-gray-400 mt-2">This record was added manually without an accompanying source document (PDF/Image).</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {record.prescriptionImageUrl && (
              <Card className="p-8 h-full border-2 border-blue-50 bg-gradient-to-br from-white to-blue-50/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Attached Prescription</h3>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(record.prescriptionImageUrl || '', '_blank')}
                      className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Full
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = record.prescriptionImageUrl || '';
                        link.download = `prescription-${record.fileName || 'document'}`;
                        link.click();
                      }}
                      className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 min-h-[400px] flex items-center justify-center">
                  <div className="relative group cursor-zoom-in w-full h-full">
                    <img
                      src={record.prescriptionImageUrl}
                      alt="Prescription"
                      className="w-full h-full object-contain max-h-[800px] mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                  </div>
                </div>
              </Card>
            )}
          </div>

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

                  {/* Doctor's Recommendation Section */}
                  {record.doctorNotes && (
                    <div className="mt-8">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Physician's Recommendation</h3>
                      </div>
                      <Card className="p-6 bg-indigo-50/30 border-indigo-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Shield className="w-20 h-20 text-indigo-600" />
                        </div>
                        <p className="text-gray-800 font-medium leading-relaxed italic">
                          "{record.doctorNotes}"
                        </p>
                      </Card>
                    </div>
                  )}

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

      {/* ================= MOBILE VIEW (Exact matching recorde.html) ================= */}
      <div className="md:hidden pb-32 text-on-surface antialiased bg-[#f8f9fa] min-h-screen">
        {/* Top Navigation Bar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-[0_20px_40px_rgba(25,28,29,0.06)]">
          <div className="flex items-center justify-between px-6 h-16 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/records')}
                className="active:scale-95 duration-200 hover:bg-slate-100/50 p-2 rounded-full flex items-center justify-center outline-none"
              >
                <span className="material-symbols-outlined text-[#0055c9] text-2xl">arrow_back</span>
              </button>
              <h1 className="font-bold text-lg text-slate-900 truncate max-w-[200px]" style={{ fontFamily: 'Manrope' }}>
                {(() => {
                  const cat = (record.category || 'custom').toLowerCase();
                  const mapping: Record<string, string> = { 'blood_sugar': 'Blood Sugar', 'bp': 'Blood Pressure', 'thyroid': 'Thyroid', 'cholesterol': 'Cholesterol', 'opd': 'OPD', 'imaging': 'Imaging', 'lab': 'Lab' };
                  return mapping[cat] || cat.replace(/_/g, ' ');
                })()}
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative active:scale-95 duration-200 hover:bg-slate-100/50 p-2 rounded-full flex items-center justify-center outline-none"
              >
                <span className="material-symbols-outlined text-slate-500">notifications</span>
                {(storeRecords.some(r => r.hasNewDoctorNote) || appointments.some(a => new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0)))) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Notification Overlay (maintained for functionality) */}
        {showNotifications && (
          <div className="fixed inset-0 z-[200] bg-white animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length === 0 && storeRecords.filter(r => r.hasNewDoctorNote).length === 0 && (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-slate-200 text-5xl mb-4">notifications_off</span>
                  <p className="text-slate-400 font-medium italic">No new notifications</p>
                </div>
              )}
              {/* Appointments */}
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0055c9]">Upcoming Appointments</h3>
                  {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0))).map(appt => (
                    <div key={appt._id} onClick={() => navigate('/calendar')} className="p-4 bg-[#f3f4f5] rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#0055c9] shadow-sm">
                          <span className="material-symbols-outlined">calendar_today</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Dr. {appt.doctorName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(appt.date).toLocaleDateString()} • {appt.time}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Doctor Notes */}
              {storeRecords.filter(r => r.hasNewDoctorNote).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#006c4f]">New Observations</h3>
                  {storeRecords.filter(r => r.hasNewDoctorNote).map(r => (
                    <div key={r._id || r.id} onClick={() => navigate(`/records/${r._id || r.id}`)} className="p-4 bg-[#67fcc6]/10 rounded-2xl border border-[#67fcc6]/20 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#006c4f] shadow-sm">
                          <span className="material-symbols-outlined">clinical_notes</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 capitalize">{r.category.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">View Observations</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#006c4f]/30">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="absolute bottom-10 left-0 w-full px-6">
              <button onClick={() => setShowNotifications(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">
                Close
              </button>
            </div>
          </div>
        )}

        <main className="mt-20 px-4 max-w-2xl mx-auto space-y-6">
          {/* Header Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="font-extrabold text-3xl tracking-tight text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>
                  {(() => {
                    const cat = (record.category || 'custom').toLowerCase();
                    const mapping: Record<string, string> = { 'blood_sugar': 'Blood Sugar', 'bp': 'Blood Pressure', 'thyroid': 'Thyroid', 'cholesterol': 'Cholesterol', 'opd': 'OPD', 'imaging': 'Imaging', 'lab': 'Lab' };
                    return mapping[cat] || cat.replace(/_/g, ' ');
                  })()}
                </h2>
                <p className="text-[#414754] text-sm flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  Uploaded {new Date(record.uploadDate || record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(record.uploadDate || record.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-4 py-1 bg-[#67fcc6] text-[#007354] text-xs font-bold rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {record.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Action Quick Bar */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleShareClick}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] active:scale-95 transition-all outline-none border border-white"
              >
                <span className="material-symbols-outlined text-[#0055c9] mb-1">share</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#414754]">Share</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] active:scale-95 transition-all outline-none border border-white"
              >
                {downloading ? <Loader2 className="w-5 h-5 mb-1 animate-spin text-[#0055c9]" /> : <span className="material-symbols-outlined text-[#0055c9] mb-1">picture_as_pdf</span>}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#414754]">{downloading ? 'WAIT' : 'PDF'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] active:scale-95 transition-all outline-none border border-white"
              >
                <span className="material-symbols-outlined text-[#0055c9] mb-1">print</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#414754]">Print</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex flex-col items-center justify-center p-3 bg-[#ffdad6]/20 rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] active:scale-95 transition-all outline-none border border-transparent"
              >
                <span className="material-symbols-outlined text-[#ba1a1a] mb-1">delete</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba1a1a]">Delete</span>
              </button>
            </div>
          </section>

          {/* Record Information Section */}
          <section className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-6 bg-white rounded-lg shadow-[0_20px_40px_rgba(25,28,29,0.06)] border border-white">
              <h3 className="text-[10px] font-black text-[#414754] uppercase tracking-[0.2em] mb-4">Record Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Category</p>
                  <p className="font-bold text-sm text-[#191c1d] truncate" style={{ fontFamily: 'Manrope' }}>
                    {(() => {
                      const cat = (record.category || 'custom').toLowerCase();
                      const mapping: Record<string, string> = { 'blood_sugar': 'Blood Sugar', 'bp': 'Blood Pressure', 'thyroid': 'Thyroid', 'cholesterol': 'Cholesterol', 'opd': 'OPD', 'imaging': 'Imaging', 'lab': 'Lab' };
                      return mapping[cat] || cat.replace(/_/g, ' ');
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Visit Date</p>
                  <p className="font-bold text-sm text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>
                    {new Date(record.visitDate || record.uploadDate || record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Visit Time</p>
                  <p className="font-bold text-sm text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>
                    {new Date(record.visitDate || record.uploadDate || record.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Extracted Values (Hero Metrics) */}
          <section className="bg-white rounded-lg shadow-[0_20px_40px_rgba(25,28,29,0.06)] overflow-hidden border border-white">
            <div className="p-6 border-b border-slate-100/50">
              <h3 className="text-[10px] font-black text-[#414754] uppercase tracking-[0.2em]">Extracted Values</h3>
            </div>
            <div className="p-6 flex justify-between items-center bg-gradient-to-br from-white to-slate-50">
              {Object.entries(fields).length > 0 ? (
                Object.entries(fields).slice(0, 3).map(([key, value], idx, arr) => (
                  <React.Fragment key={key}>
                    <div className="text-center flex-1 min-w-0">
                      <p className={`font-extrabold text-4xl sm:text-5xl truncate ${key.toLowerCase().includes('systol') || key.toLowerCase().includes('diastol') ? 'text-[#ba1a1a]' : 'text-[#0055c9]'}`} style={{ fontFamily: 'Manrope' }}>
                        {String(value)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate px-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {idx < arr.length - 1 && <div className="w-px h-12 bg-slate-100 mx-2"></div>}
                  </React.Fragment>
                ))
              ) : (
                <div className="w-full text-center py-4">
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No Metrics Extracted</p>
                </div>
              )}
            </div>
          </section>

          {/* Smart Insights (AI Powered) */}
          {(record.aiFindings || record.aiNotes) && (
            <section className="p-6 bg-blue-50/40 rounded-2xl border border-blue-100/50 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0055c9]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h3 className="font-bold text-[#0055c9]" style={{ fontFamily: 'Manrope' }}>Smart Insights</h3>
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 bg-blue-100/50 text-[#0055c9] rounded-full uppercase tracking-widest border border-blue-100">AI Powered</span>
              </div>
              <div className="space-y-4">
                {record.aiFindings && (
                  <div className="bg-red-50/50 p-4 rounded-xl border-l-[4px] border-[#ba1a1a]">
                    <p className="text-[10px] font-black text-[#ba1a1a] uppercase mb-1 tracking-widest">Primary Findings</p>
                    <p className="text-sm text-[#191c1d] leading-relaxed font-medium">
                      {record.aiFindings}
                    </p>
                  </div>
                )}
                {record.aiNotes && (
                  <div className="bg-white/80 p-4 rounded-xl border border-blue-100/50 shadow-sm">
                    <p className="text-[10px] font-black text-[#0055c9] uppercase mb-1 tracking-widest">Recommended Steps</p>
                    <p className="text-sm text-[#414754] leading-relaxed font-medium italic">
                      {record.aiNotes}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Source Document */}
          <section className="p-6 bg-[#edeeef]/40 rounded-2xl border border-slate-200/50">
            <h3 className="text-[10px] font-black text-[#414754] uppercase tracking-[0.2em] mb-4">Source Document</h3>
            <div className="aspect-video bg-white/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
              {record.imagePath ? (
                <img
                  src={record.imagePath}
                  alt="Source Document"
                  className="w-full h-full object-cover"
                  onClick={() => window.open(record.imagePath, '_blank')}
                />
              ) : (
                <>
                  <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">description</span>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">No Document Attached</p>
                </>
              )}
            </div>
          </section>

          {/* Prescription */}
          <section className="p-6 bg-[#edeeef]/40 rounded-2xl border border-slate-200/50">
            <h3 className="text-[10px] font-black text-[#414754] uppercase tracking-[0.2em] mb-4">Prescription</h3>
            <div className="aspect-video bg-white/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
              {record.prescriptionImageUrl ? (
                <img
                  src={record.prescriptionImageUrl}
                  alt="Prescription"
                  className="w-full h-full object-cover"
                  onClick={() => window.open(record.prescriptionImageUrl, '_blank')}
                />
              ) : (
                <>
                  <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">description</span>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">No Prescription Attached</p>
                </>
              )}
            </div>
          </section>
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl rounded-t-[2.5rem] z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] border-t border-slate-100">
            <div onClick={() => navigate('/records')} className="flex flex-col items-center justify-center bg-[#0055c9]/10 text-[#0055c9] rounded-full px-5 py-2 active:scale-90 duration-200 cursor-pointer">
                <FileText className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Records</span>
            </div>
            <div onClick={() => navigate('/manage-shares')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Shield className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Doctors</span>
            </div>
            <div onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Home className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Home</span>
            </div>
            <div onClick={() => navigate('/analytics')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Activity className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Analytics</span>
            </div>
            <div onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Calendar className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Calendar</span>
            </div>
        </nav>
      </div>


    </div>
  )
}

export default RecordDetails