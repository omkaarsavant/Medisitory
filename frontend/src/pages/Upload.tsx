import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import DatePicker from '../components/DatePicker'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { useRecordStore } from '../store/recordStore'
import {
  uploadFile,
  uploadFileWithProgress,
  extractData,
  confirmExtraction,
  manualAddRecord,
  MedicalRecord
} from '../services/api'
import {
  Upload as UploadIcon,
  PlusCircle,
  FileText,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Stethoscope,
  Search,
  Droplet,
  Activity,
  PieChart,
  Thermometer,
  Layout as LayoutIcon,
  Trash2,
  Clock,
  Camera,
  Zap,
  Paperclip,
  Home,
  Shield,
  Bell,
  Brain
} from 'lucide-react'

interface UploadProps {
  embedded?: boolean
  onSuccess?: () => void
  onCancel?: () => void
  prefilledDoctor?: string
}

const Upload: React.FC<UploadProps> = ({ embedded = false, onSuccess, onCancel, prefilledDoctor = '' }) => {
  const navigate = useNavigate()
  const { addRecord } = useRecordStore()

  // View State
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')
  const [uploadStatus, setUploadStatus] = useState<'ready' | 'uploading' | 'processing' | 'processed' | 'confirmed' | 'error'>('ready')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('Auto-Detect')
  const [progress, setProgress] = useState<number>(0)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any | null>(null)
  const [showRawText, setShowRawText] = useState<boolean>(false)
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [manualPrescriptionFile, setManualPrescriptionFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prescriptionInputRef = useRef<HTMLInputElement>(null)

  // Manual State
  const [manualData, setManualData] = useState({
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
    isTimeModified: false,
    doctor: prefilledDoctor || '',
    hospital: '',
    metrics: {} as Record<string, any>
  })

  const categories = [

    { name: 'Blood Sugar', icon: <Droplet className="w-4 h-4" /> },
    { name: 'Blood Pressure', icon: <Activity className="w-4 h-4" /> },
    { name: 'Custom', icon: <LayoutIcon className="w-4 h-4" /> },
  ]

  const categoryMetrics: { [key: string]: { key: string, label: string, unit?: string }[] } = {
    'Blood Sugar': [
      { key: 'fasting', label: 'Fasting Blood Sugar (FBS)', unit: 'mg/dL' },
      { key: 'post_meal', label: 'Postprandial Blood Sugar (PPBS)', unit: 'mg/dL' },
      { key: 'random', label: 'Random Blood Sugar (RBS)', unit: 'mg/dL' },
      { key: 'hba1c', label: 'HbA1c', unit: '%' }
    ],
    'Blood Pressure': [
      { key: 'systolic', label: 'Systolic Blood Pressure', unit: 'mmHg' },
      { key: 'diastolic', label: 'Diastolic Blood Pressure', unit: 'mmHg' },
      { key: 'pulse', label: 'Heart Rate', unit: 'bpm' }
    ],
    'Cholesterol': [
      { key: 'total', label: 'Total Cholesterol', unit: 'mg/dL' },
      { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
      { key: 'hdl', label: 'HDL', unit: 'mg/dL' },
      { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL' }
    ],
    'Thyroid': [
      { key: 'tsh', label: 'TSH', unit: 'mIU/L' },
      { key: 't3', label: 'T3', unit: 'ng/dL' },
      { key: 't4', label: 'T4', unit: 'mcg/dL' }
    ]
  }

  const getBackendCategory = (displayCat: string): string => {
    const mapping: Record<string, string> = {
      'Blood Sugar': 'blood_sugar',
      'Blood Pressure': 'bp',
      'OPD': 'opd',
      'Cholesterol': 'cholesterol',
      'Thyroid': 'thyroid',
      'Custom': 'custom'
    }
    return mapping[displayCat] || displayCat.toLowerCase().replace(/ /g, '_')
  }

  // --- Handlers ---

  const handleModeToggle = (newMode: 'upload' | 'manual') => {
    setMode(newMode)
    setUploadStatus('ready')
    setError(null)
    setExtractedData(null)
    setCategory(newMode === 'upload' ? 'Auto-Detect' : '')
  }

  const handleBrowseClick = () => fileInputRef.current?.click()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      setError('Please select a file and category')
      return
    }

    setLoading(true)
    setError(null)
    setUploadStatus('uploading')

    try {
      // 1. Upload file
      const backendCat = category === 'Auto-Detect' ? '' : getBackendCategory(category)
      const uploadResp = await uploadFileWithProgress(selectedFile, backendCat, (p) => setProgress(p), undefined, prescriptionFile || undefined)
      setUploadId(uploadResp.data.uploadId)
      setUploadStatus('processing')

      // 2. Extract data (Backend AI automatically detects if category is empty)
      const extractResp = await extractData(uploadResp.data.uploadId, category === 'Auto-Detect' ? '' : category)

      // Update category if it was auto-detected
      if (category === 'Auto-Detect' && extractResp.data.detectedCategory) {
        const backendCat = extractResp.data.detectedCategory
        const displayMapping: Record<string, string> = {
          'blood_sugar': 'Blood Sugar',
          'bp': 'Blood Pressure',
          'opd': 'OPD',
          'cholesterol': 'Cholesterol',
          'thyroid': 'Thyroid'
        }
        setCategory(displayMapping[backendCat] || 'Custom')
      }

      setExtractedData({
        category: extractResp.data.detectedCategory || category,
        extractedValues: extractResp.data.fields || {},
        rawText: extractResp.data.processedText,
        confidence: extractResp.data.confidence
      })
      setUploadStatus('processed')
    } catch (err: any) {
      console.error('Upload flow error:', err)
      setError(err.message || 'Failed to process report')
      setUploadStatus('ready')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const handleConfirmExtraction = async () => {
    if (!extractedData || !uploadId) return
    setLoading(true)
    setError(null)
    try {
      const backendCategory = getBackendCategory(category)

      const resp = await confirmExtraction(
        uploadId,
        extractedData.extractedValues,
        backendCategory,
        manualData.date,
        manualData.time
      )

      // Update local store if response contains the updated record
      // If confirmExtraction returns { success: true, data: { record: ... } }
      if (resp.success && (resp as any).data) {
        // Map backend _id to id for store consistency if needed
        const newRecord = (resp as any).data
        addRecord({
          ...newRecord,
          id: newRecord._id || newRecord.id,
          date: newRecord.visitDate || newRecord.uploadDate || new Date().toISOString()
        })
      }

      setUploadStatus('confirmed')
    } catch (err) {
      console.error('Confirm error:', err)
      setError('Failed to save record')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!category) {
      setError('Please select a category')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Parse numeric metrics where possible
      const parsedMetrics: Record<string, any> = {}
      Object.entries(manualData.metrics).forEach(([key, val]) => {
        if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
          parsedMetrics[key] = parseFloat(val)
        } else {
          parsedMetrics[key] = val
        }
      })

      // Use current time if user hasn't modified it
      let finalTime = manualData.time
      if (!manualData.isTimeModified) {
        finalTime = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
      }

      // 1. Upload file if exists
      let fileData = {}
      if (manualFile || manualPrescriptionFile) {
        try {
          // Use skipRecord=true to avoid duplicate MedicalRecord creation
          const uploadResp = await uploadFile(manualFile, category, true, manualPrescriptionFile || undefined)
          if (uploadResp.success && uploadResp.data) {
            fileData = {
              imagePath: uploadResp.data.fileUrl,
              publicId: uploadResp.data.publicId,
              fileName: uploadResp.data.fileName,
              fileSize: uploadResp.data.fileSize,
              prescriptionImageUrl: uploadResp.data.prescriptionImageUrl
            }
          }
        } catch (uploadErr) {
          console.error('File upload failed for manual entry:', uploadErr)
          // We can proceed without file if it fails, or block it. 
          // User said "add an option", so maybe it's optional. 
          // But if they selected one, it should probably work.
        }
      }

      const resp = await manualAddRecord({
        category: getBackendCategory(category),
        date: manualData.date,
        time: finalTime,
        doctor: manualData.doctor,
        hospital: manualData.hospital,
        metrics: parsedMetrics,
        ...fileData
      })

      if (resp.success && resp.data.record) {
        const newRecord = resp.data.record
        addRecord({
          ...newRecord,
          id: newRecord._id || newRecord.id,
          date: newRecord.visitDate || newRecord.uploadDate || new Date().toISOString()
        })
      } else if (resp.success && (resp as any).data) { // Fallback for different response structure
        const newRecord = (resp as any).data
        addRecord({
          ...newRecord,
          id: newRecord._id || newRecord.id,
          date: newRecord.visitDate || newRecord.uploadDate || new Date().toISOString()
        })
      }

      setUploadStatus('confirmed')
    } catch (err) {
      console.error('Manual submit error:', err)
      setError('Failed to add record')
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setUploadStatus('ready')
    setSelectedFile(null)
    setPrescriptionFile(null)
    setCategory(mode === 'upload' ? 'Auto-Detect' : '')
    setExtractedData(null)
    setError(null)
    setManualFile(null)
    setManualPrescriptionFile(null)
    setManualData({
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      isTimeModified: false,
      doctor: prefilledDoctor || '',
      hospital: '',
      metrics: {}
    })
  }

  return (
    <>
      {/* ===== MOBILE VIEW (matches addimg.html) ===== */}
      <div className="md:hidden bg-[#f8f9fa] min-h-screen pb-[10px]">
        <main className="pt-10 px-6 max-w-md mx-auto pb-[80px]">
          {/* Hero Header */}
          <section className="mb-10">
            <h1 className="text-3xl font-extrabold text-[#191c1d] tracking-tight mb-2" style={{ fontFamily: 'Manrope' }}>Add Medical Report</h1>
            <p className="text-[#414754] text-sm font-medium">Expand your medical history</p>
          </section>

          {/* Mode Toggle */}
          <div className="flex p-1 bg-[#edeeef] rounded-2xl w-full mb-6">
            <button onClick={() => handleModeToggle('upload')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-[#0055c9]' : 'text-[#414754]'}`}>
              <UploadIcon className="w-4 h-4" /><span>Upload File</span>
            </button>
            <button onClick={() => handleModeToggle('manual')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-white shadow-sm text-[#0055c9]' : 'text-[#414754]'}`}>
              <PlusCircle className="w-4 h-4" /><span>Manual Entry</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* UPLOAD MODE - READY */}
            {mode === 'upload' && uploadStatus === 'ready' && (
              <>
                {/* Category Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#414754] mb-4">Supported Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button key={cat.name} onClick={() => setCategory(cat.name)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold active:scale-95 transition-transform ${category === cat.name ? 'bg-[#0055c9] text-white' : 'bg-[#edeeef] text-[#414754]'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Zone */}
                <div onClick={() => document.getElementById('mobile-upload-input')?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${selectedFile ? 'bg-green-50 border-green-300' : 'bg-[#edeeef] border-[#c1c6d7]/30'}`}>
                  {!selectedFile ? (
                    <>
                      <div className="w-16 h-16 bg-[#036cfb]/10 rounded-full flex items-center justify-center mb-4">
                        <UploadIcon className="w-8 h-8 text-[#0055c9]" />
                      </div>
                      <h3 className="text-[#191c1d] font-bold mb-1">Upload Report</h3>
                      <p className="text-[#414754] text-xs mb-6 px-4">Drag and drop your PDF or medical document here</p>
                      <button className="w-full h-12 bg-white text-[#0055c9] border border-[#0055c9]/20 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Select File
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="font-bold text-[#191c1d] truncate max-w-[250px]">{selectedFile.name}</p>
                      <span className="text-xs text-green-600 font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="text-xs font-bold text-red-500 uppercase tracking-widest">Change File</button>
                    </div>
                  )}
                  <input type="file" id="mobile-upload-input" onChange={handleFileSelect} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                </div>

                {/* Attach Prescription */}
                <div onClick={() => document.getElementById('mobile-prescription-input')?.click()}
                  className="bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#67fcc6]/20 rounded-lg flex items-center justify-center">
                      <Camera className="w-5 h-5 text-[#006c4f]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#191c1d] leading-tight truncate max-w-[180px]">
                        {prescriptionFile ? prescriptionFile.name : 'Attach Prescription Image'}
                      </h4>
                      <p className="text-[10px] text-[#414754] font-medium">(Optional)</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#edeeef] flex items-center justify-center active:scale-90 transition-transform">
                    {prescriptionFile ? <CheckCircle2 className="w-4 h-4 text-[#006c4f]" /> : <PlusCircle className="w-4 h-4 text-[#414754]" />}
                  </div>
                  <input type="file" id="mobile-prescription-input" onChange={(e) => {
                    if (e.target.files?.[0]) setPrescriptionFile(e.target.files[0])
                  }} className="hidden" accept=".png,.jpg,.jpeg" />
                </div>

                {/* Primary Action */}
                <div className="pt-4">
                  <button onClick={handleUpload} disabled={!selectedFile || loading}
                    className="w-full h-14 bg-gradient-to-r from-[#0055c9] to-[#036cfb] text-white rounded-xl font-bold text-lg shadow-[0_10px_25px_-5px_rgba(0,85,201,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <LoadingSpinner /> : (<><Zap className="w-5 h-5" />Extract Data Now</>)}
                  </button>
                  <p className="text-center text-[10px] text-[#414754] mt-4 px-8 leading-relaxed">
                    Our AI will securely parse your document to update your health dashboard automatically.
                  </p>
                </div>
              </>
            )}

            {/* MANUAL MODE - READY */}
            {mode === 'manual' && uploadStatus === 'ready' && (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#414754] mb-4">Select Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(c => c.name !== 'Auto-Detect').map(cat => (
                      <button key={cat.name} onClick={() => setCategory(cat.name)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold active:scale-95 transition-transform ${category === cat.name ? 'bg-[#0055c9] text-white' : 'bg-[#edeeef] text-[#414754]'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                {category && (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#414754] mb-2">Visit Details</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Date</label>
                          <input type="date" value={manualData.date} onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                            className="w-full px-3 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Time</label>
                          <input type="time" value={manualData.time} onChange={(e) => setManualData({ ...manualData, time: e.target.value, isTimeModified: true })}
                            className="w-full px-3 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Doctor Name</label>
                        <input type="text" placeholder="Dr. Smith" value={manualData.doctor} onChange={(e) => setManualData({ ...manualData, doctor: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Hospital/Lab</label>
                        <input type="text" placeholder="City General" value={manualData.hospital} onChange={(e) => setManualData({ ...manualData, hospital: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-3">
                      <div onClick={() => document.getElementById('mobile-manual-file')?.click()} className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#0055c9]/10 rounded-lg flex items-center justify-center"><UploadIcon className="w-5 h-5 text-[#0055c9]" /></div>
                          <div>
                            <h4 className="text-sm font-bold text-[#191c1d] leading-tight truncate max-w-[180px]">{manualFile ? manualFile.name : 'Attach Source Document'}</h4>
                            <p className="text-[10px] text-[#414754] font-medium">(Optional)</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#edeeef] flex items-center justify-center">
                          {manualFile ? <CheckCircle2 className="w-4 h-4 text-[#0055c9]" /> : <PlusCircle className="w-4 h-4 text-[#414754]" />}
                        </div>
                      </div>
                      <input type="file" id="mobile-manual-file" className="hidden" onChange={(e) => setManualFile(e.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg" />
                      <div className="border-t border-[#e1e3e4]" />
                      <div onClick={() => document.getElementById('mobile-manual-prescription')?.click()} className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#67fcc6]/20 rounded-lg flex items-center justify-center"><Camera className="w-5 h-5 text-[#006c4f]" /></div>
                          <div>
                            <h4 className="text-sm font-bold text-[#191c1d] leading-tight truncate max-w-[180px]">{manualPrescriptionFile ? manualPrescriptionFile.name : 'Attach Prescription'}</h4>
                            <p className="text-[10px] text-[#414754] font-medium">(Optional)</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#edeeef] flex items-center justify-center">
                          {manualPrescriptionFile ? <CheckCircle2 className="w-4 h-4 text-[#006c4f]" /> : <PlusCircle className="w-4 h-4 text-[#414754]" />}
                        </div>
                      </div>
                      <input type="file" id="mobile-manual-prescription" className="hidden" onChange={(e) => setManualPrescriptionFile(e.target.files?.[0] || null)} accept=".png,.jpg,.jpeg" />
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#414754] mb-2">Medical Metrics</label>
                      {(categoryMetrics[category] || [{ key: 'notes', label: 'Additional Info' }]).map((metric) => (
                        <div key={metric.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">{metric.label}</label>
                          <div className="relative">
                            <input type="text" placeholder="0.00" value={manualData.metrics[metric.key] || ''}
                              onChange={(e) => setManualData({ ...manualData, metrics: { ...manualData.metrics, [metric.key]: e.target.value } })}
                              className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-lg font-bold text-[#191c1d] pr-16" />
                            {metric.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#717786] uppercase">{metric.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4">
                      <button onClick={handleManualSubmit} disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-[#0055c9] to-[#036cfb] text-white rounded-xl font-bold text-lg shadow-[0_10px_25px_-5px_rgba(0,85,201,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {loading ? <LoadingSpinner /> : 'Save Report Details'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Processing States */}
            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <div className="bg-white p-10 rounded-2xl text-center space-y-6 shadow-sm">
                <div className="w-20 h-20 border-4 border-[#0055c9] border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="text-xl font-extrabold text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>
                  {uploadStatus === 'uploading' ? `Uploading ${progress}%` : 'AI is extracting data...'}
                </h3>
                <p className="text-[#414754] text-xs font-medium">Hold tight, this will only take a moment</p>
              </div>
            )}

            {/* Extraction Result */}
            {uploadStatus === 'processed' && extractedData && (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>Extracted Findings</h3>
                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />{category}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Visit Date</label>
                      <input type="date" value={manualData.date} onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">Visit Time</label>
                      <input type="time" value={manualData.time} onChange={(e) => setManualData({ ...manualData, time: e.target.value, isTimeModified: true })}
                        className="w-full px-3 py-2.5 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-sm font-medium" />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    {Object.entries(extractedData?.extractedValues || {}).map(([key, val]) => {
                      const fieldInfo = categoryMetrics[category]?.find(m => m.key === key)
                      const displayLabel = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ')
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] font-bold text-[#717786] uppercase tracking-widest pl-1">{displayLabel}</label>
                          <div className="relative">
                            <input type="text" value={val as string || ''}
                              onChange={(e) => setExtractedData({ ...extractedData, extractedValues: { ...extractedData.extractedValues, [key]: e.target.value } })}
                              className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl font-bold text-[#191c1d] pr-12" />
                            <button onClick={() => { const nv = { ...extractedData.extractedValues }; delete (nv as any)[key]; setExtractedData({ ...extractedData, extractedValues: nv }); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#717786] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm">
                  <button onClick={() => setShowRawText(!showRawText)} className="w-full text-xs font-bold text-[#0055c9] uppercase tracking-widest">
                    {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
                  </button>
                  {showRawText && (
                    <div className="mt-3 p-4 bg-gray-900 rounded-xl text-[10px] font-mono text-green-400 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{extractedData.rawText}</div>
                  )}
                </div>
                <div className="space-y-3 pt-2">
                  <button onClick={handleConfirmExtraction} disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-[#006c4f] to-[#007354] text-white rounded-xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <LoadingSpinner /> : 'Confirm & Sync'}
                  </button>
                  <button onClick={onCancel || resetAll} className="w-full h-12 bg-[#edeeef] text-[#414754] rounded-xl font-bold text-sm active:scale-[0.98] transition-all">Cancel</button>
                </div>
              </div>
            )}

            {/* Success State */}
            {uploadStatus === 'confirmed' && (
              <div className="bg-white p-10 rounded-2xl text-center space-y-6 shadow-sm">
                <div className="w-24 h-24 bg-green-500 rounded-[1.5rem] flex items-center justify-center mx-auto text-white shadow-xl rotate-3">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>Record Secured</h3>
                <p className="text-[#414754] text-xs font-medium">Successfully added to your medical history</p>
                <div className="space-y-3">
                  <button onClick={() => { if (onSuccess) onSuccess(); else navigate('/records'); }}
                    className="w-full h-14 bg-[#191c1d] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all">
                    {embedded ? 'Return to Patient' : 'View History'}
                  </button>
                  <button onClick={resetAll} className="w-full h-12 bg-[#edeeef] text-[#414754] rounded-xl font-bold text-sm active:scale-[0.98] transition-all">Add Another</button>
                </div>
              </div>
            )}

            {error && <ErrorMessage message={error} onRetry={resetAll} />}
          </div>
        </main>

        {/* Top App Bar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => navigate('/records')}>
              <img alt="JD" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter cursor-pointer" style={{ fontFamily: 'Manrope' }} onClick={() => navigate('/records')}>MedVault</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer" onClick={() => navigate('/know-your-report')}>
              <Brain className="text-[#0055c9] w-6 h-6" />
            </div>
            <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer" onClick={() => navigate('/records')}>
              <Bell className="text-[#0055c9] w-6 h-6" />
            </div>
          </div>
        </header>

        {/* Bottom NavBar */}
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

      {/* ===== DESKTOP VIEW (unchanged) ===== */}
      <div className="hidden md:block max-w-4xl mx-auto px-4 py-12 pb-32 min-h-screen animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 md:mb-12 space-y-6 lg:space-y-0 text-left">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter">Add Medical Report</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest italic mr-2 border-r border-gray-100 pr-3">Expand your medical history</p>
              {['Blood Sugar', 'Blood Pressure', 'Thyroid', 'Cholesterol', 'OPD', 'Imaging'].map(tag => (
                <Badge key={tag} color="blue" className="text-[10px] md:text-[8px] font-black italic bg-blue-50/50 text-blue-600 border-none px-2 py-0.5">{tag}</Badge>
              ))}
            </div>
          </div>
          {/* Mode Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-2xl w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => handleModeToggle('upload')}
              className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 md:px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${mode === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <UploadIcon className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <button
              onClick={() => handleModeToggle('manual')}
              className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 md:px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${mode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Step 1: Category Selection (Manual Only) */}
          {uploadStatus === 'ready' && mode === 'manual' && (
            <Card className="p-8 border-2 border-transparent hover:border-blue-50 transition-all duration-300 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center justify-between mb-6 relative">
                <h3 className="text-xl font-black text-gray-900">Select Report Category</h3>
                <Badge color="blue" className="px-3 py-1 font-black italic">MANUAL ENTRY</Badge>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {categories.filter(c => c.name !== 'Auto-Detect').map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${category === cat.name
                      ? `border-blue-500 bg-blue-50 text-blue-600 shadow-md transform scale-[1.02]`
                      : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:text-gray-600'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors">
                        {cat.icon}
                      </span>
                      <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">{cat.name}</span>
                    </div>
                    {category === cat.name && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </Card>
          )}


          {/* mode: UPLOAD */}
          {mode === 'upload' && uploadStatus === 'ready' && (
            <div className="space-y-4">
              <Card
                className={`p-10 border-4 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all duration-500 ${selectedFile ? 'border-green-400 bg-green-50 shadow-inner' : 'border-gray-100 hover:border-blue-400 bg-white shadow-2xl hover:shadow-blue-100/50'}`}
                onClick={handleBrowseClick}
              >
                {!selectedFile ? (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 group-hover:bg-blue-100 transition-colors">
                      <UploadIcon className="w-10 h-10 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Drop your reports here</h3>
                      <p className="text-sm font-bold text-gray-400 uppercase italic mt-2">PDF, JPG, PNG up to 20MB</p>
                    </div>
                    <Button variant="outline" className="px-8 py-3 rounded-full border-2 border-blue-500 text-blue-600 font-black hover:bg-blue-50">
                      Select File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="w-24 h-24 bg-green-100 rounded-3xl flex items-center justify-center mx-auto text-green-600 shadow-lg">
                      <FileText className="w-12 h-12" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-gray-900 truncate max-w-sm uppercase tracking-tighter">{selectedFile.name}</p>
                      <Badge color="green" className="mt-2 px-4 py-1 font-black italic">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-xs font-black text-red-500 hover:text-red-600 uppercase tracking-widest hover:underline"
                    >
                      Change File
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
              </Card>

              <Card
                className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all duration-300 ${prescriptionFile ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-300 bg-white'}`}
                onClick={() => prescriptionInputRef.current?.click()}
              >
                {!prescriptionFile ? (
                  <div className="flex items-center justify-center space-x-3 text-gray-400 group">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest group-hover:text-blue-500 transition-colors">Attach Prescription Image (Optional)</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center space-x-3 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-sm truncate max-w-[200px] sm:max-w-xs">{prescriptionFile.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPrescriptionFile(null); }}
                      className="text-xs font-black text-red-500 hover:text-red-600 uppercase tracking-widest hover:underline px-4 py-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input type="file" ref={prescriptionInputRef} onChange={(e) => {
                  if (e.target.files?.[0]) setPrescriptionFile(e.target.files[0])
                }} className="hidden" accept=".png,.jpg,.jpeg" />
              </Card>
            </div>
          )}

          {/* mode: MANUAL */}
          {mode === 'manual' && uploadStatus === 'ready' && category && (
            <Card className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-8 border-b border-gray-100">
                <DatePicker
                  label="VISIT DATE"
                  value={manualData.date}
                  onChange={(d) => setManualData({ ...manualData, date: d })}
                  className="font-black"
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VISIT TIME</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="time"
                      value={manualData.time}
                      onChange={(e) => setManualData({ ...manualData, time: e.target.value, isTimeModified: true })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Doctor Name</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Dr. Smith"
                      value={manualData.doctor}
                      onChange={(e) => setManualData({ ...manualData, doctor: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Hospital/Lab</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="City General"
                      value={manualData.hospital}
                      onChange={(e) => setManualData({ ...manualData, hospital: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Source Document (Optional)</label>
                  <div className="relative">
                    <UploadIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <div className="flex items-center">
                      <input
                        type="file"
                        id="manual-file-upload"
                        className="hidden"
                        onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                      <label
                        htmlFor="manual-file-upload"
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 hover:bg-white transition-all text-sm font-bold cursor-pointer flex items-center justify-between ${manualFile ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <span className="truncate">{manualFile ? manualFile.name : 'Choose File'}</span>
                        {manualFile && <Badge color="green" className="text-[8px] px-1 py-0">Selected</Badge>}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Prescription Image (Optional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <div className="flex items-center">
                      <input
                        type="file"
                        id="manual-prescription-upload"
                        className="hidden"
                        onChange={(e) => setManualPrescriptionFile(e.target.files?.[0] || null)}
                        accept=".png,.jpg,.jpeg"
                      />
                      <label
                        htmlFor="manual-prescription-upload"
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 hover:bg-white transition-all text-sm font-bold cursor-pointer flex items-center justify-between ${manualPrescriptionFile ? 'text-blue-600' : 'text-gray-400'}`}
                      >
                        <span className="truncate">{manualPrescriptionFile ? manualPrescriptionFile.name : 'Choose File'}</span>
                        {manualPrescriptionFile && <Badge color="blue" className="text-[8px] px-1 py-0">Attached</Badge>}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Fields */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] italic">Enter Medical Metrics</h4>
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-100 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(categoryMetrics[category] || [{ key: 'notes', label: 'Additional Info' }]).map((metric) => (
                    <div key={metric.key} className="group flex flex-col space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 group-hover:text-blue-500 transition-colors">
                        {metric.label}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0.00"
                          value={manualData.metrics[metric.key] || ''}
                          onChange={(e) => setManualData({
                            ...manualData,
                            metrics: { ...manualData.metrics, [metric.key]: e.target.value }
                          })}
                          className="w-full px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm text-lg font-black text-gray-900 pr-16"
                        />
                        {metric.unit && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black italic text-gray-300 uppercase">
                            {metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleManualSubmit}
                disabled={loading}
                className="w-full py-6 rounded-3xl bg-blue-600 hover:bg-black text-white text-lg font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500"
              >
                {loading ? <LoadingSpinner /> : 'Save Report Details'}
              </Button>
            </Card>
          )}

          {/* Global Action Button for Upload */}
          {mode === 'upload' && uploadStatus === 'ready' && (
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className="px-16 py-6 rounded-full bg-black text-white text-lg font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-600 active:scale-95 transition-all duration-500 transform disabled:opacity-50"
              >
                {loading ? <LoadingSpinner /> : 'Extract Data now'}
              </Button>
            </div>
          )}

          {/* Processing States */}
          {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
            <Card className="p-16 text-center space-y-8 animate-pulse bg-white border shadow-2xl">
              <div className="w-24 h-24 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                  {uploadStatus === 'uploading' ? `Uploading ${progress}%` : 'AI is extracting data...'}
                </h3>
                <p className="mt-4 text-gray-400 font-bold uppercase italic tracking-widest">Hold tight, this will only take a moment</p>
              </div>
            </Card>
          )}

          {/* Extraction Result (Step 2 of Upload) */}
          {uploadStatus === 'processed' && extractedData && (
            <Card className="p-8 space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center space-x-4">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Extracted Findings</h3>
                  <Badge color="green" className="px-3 py-1 font-black italic uppercase tracking-widest text-[9px] flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Categorized: {category}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase italic">AI Confidence:</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(extractedData.confidence || 0) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                      <span className="mr-2">Visit Information</span>
                      <div className="hidden sm:block flex-1 h-[1px] bg-gray-100" />
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker
                      label="VISIT DATE"
                      value={manualData.date}
                      onChange={(d) => setManualData({ ...manualData, date: d })}
                      className="font-black"
                    />
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VISIT TIME</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="time"
                          value={manualData.time}
                          onChange={(e) => setManualData({ ...manualData, time: e.target.value, isTimeModified: true })}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center mt-8">
                    <span className="mr-2">Review & Edit Values</span>
                    <div className="flex-1 h-[1px] bg-gray-100" />
                  </h4>
                  <div className="space-y-4">
                    {Object.entries(extractedData?.extractedValues || {}).map(([key, val]) => {
                      const fieldInfo = categoryMetrics[category]?.find(m => m.key === key)
                      const displayLabel = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ')

                      return (
                        <div key={key} className="flex flex-col space-y-1 relative group/field">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{displayLabel}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={val as string || ''}
                              onChange={(e) => setExtractedData({
                                ...extractedData,
                                extractedValues: { ...extractedData.extractedValues, [key]: e.target.value }
                              })}
                              className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-black text-gray-900 pr-12"
                            />
                            <button
                              onClick={() => {
                                const newValues = { ...extractedData.extractedValues };
                                delete (newValues as any)[key];
                                setExtractedData({ ...extractedData, extractedValues: newValues });
                              }}
                              title="Remove Field"
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover/field:opacity-100 transition-all bg-gray-50 hover:bg-red-50 rounded-xl shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {Object.keys(extractedData?.extractedValues || {}).length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                        <p className="text-xs font-bold text-gray-300 uppercase italic">All fields removed</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Source Context</h4>
                    <button onClick={() => setShowRawText(!showRawText)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                      {showRawText ? 'Hide Raw' : 'Show Raw Text'}
                    </button>
                  </div>
                  {showRawText ? (
                    <div className="p-6 bg-gray-900 rounded-3xl text-[10px] font-mono text-green-400 whitespace-pre-wrap h-[300px] overflow-y-auto leading-relaxed border-4 border-black shadow-inner">
                      {extractedData.rawText}
                    </div>
                  ) : (
                    <div className="h-[300px] bg-gray-50 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                      <FileText className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-xs font-bold text-gray-400 uppercase italic">Preview will be available in full view</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-6">
                <Button onClick={handleConfirmExtraction} className="flex-1 py-4 sm:py-6 rounded-3xl bg-green-600 hover:bg-black text-white font-black uppercase tracking-widest transition-all">
                  Confirm & Sync
                </Button>
                <Button onClick={onCancel || resetAll} variant="outline" className="flex-1 py-4 sm:py-6 rounded-3xl border-gray-200 text-gray-400 font-black uppercase tracking-widest hover:bg-gray-50">
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Final Success State */}
          {uploadStatus === 'confirmed' && (
            <Card className="p-20 text-center space-y-8 animate-in zoom-in-95 duration-700 shadow-2xl border-4 border-green-50">
              <div className="w-32 h-32 bg-green-500 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl shadow-green-200 rotate-3 transform transition-transform hover:rotate-0">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Record Secured</h3>
                <p className="mt-4 text-gray-400 font-bold uppercase italic tracking-widest">Successfully added to your medical history</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button onClick={() => { if (onSuccess) onSuccess(); else navigate('/records'); }} className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest shadow-xl">
                  {embedded ? 'Return to Patient' : 'View History'}
                </Button>
                <Button onClick={resetAll} variant="outline" className="w-full sm:w-auto px-12 py-4 rounded-2xl border-2 border-gray-100 text-gray-500 font-black uppercase tracking-widest">
                  Add Another
                </Button>
              </div>
            </Card>
          )}

          {error && <ErrorMessage message={error} onRetry={resetAll} />}
        </div>
      </div>
    </>
  )
}

export default Upload