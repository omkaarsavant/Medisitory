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
  ExternalLink
} from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getRecord, MedicalRecord, deleteRecord } from '../services/api'
import { clearNoteNotification } from '../services/doctorAccessService'
import { Shield, Sparkles } from 'lucide-react'

const RecordDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isPDF = record?.fileName?.toLowerCase().endsWith('.pdf') || record?.imagePath?.toLowerCase().includes('.pdf');
  const [downloading, setDownloading] = useState(false)

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
      const displayFields = record.manualData || record.extractedData || {}
      const fields = (record as any).displayData || {}
      const allFields = Object.keys(fields).length ? fields : displayFields
      if (Object.keys(allFields).length > 0) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('Extracted Values', margin, y); y += 6
        doc.line(margin, y, pageW - margin, y); y += 5
        doc.setFontSize(10)
        Object.entries(allFields).forEach(([key, val]) => {
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
      doc.save(`${safeName}_${new Date().toISOString().slice(0,10)}.pdf`)
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
  }, [id])

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
  )
}

export default RecordDetails