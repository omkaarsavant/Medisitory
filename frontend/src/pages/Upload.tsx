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
  Clock
} from 'lucide-react'

const Upload: React.FC = () => {
  const navigate = useNavigate()
  const { addRecord } = useRecordStore()
  
  // View State
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')
  const [uploadStatus, setUploadStatus] = useState<'ready' | 'uploading' | 'processing' | 'processed' | 'confirmed' | 'error'>('ready')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('Auto-Detect')
  const [progress, setProgress] = useState<number>(0)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any | null>(null)
  const [showRawText, setShowRawText] = useState<boolean>(false)
  const [manualFile, setManualFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual State
  const [manualData, setManualData] = useState({
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
    isTimeModified: false,
    doctor: '',
    hospital: '',
    metrics: {} as Record<string, any>
  })

  const categories = [
    { name: 'Auto-Detect', icon: <Search className="w-4 h-4" /> },
    { name: 'Blood Sugar', icon: <Droplet className="w-4 h-4" /> },
    { name: 'Blood Pressure', icon: <Activity className="w-4 h-4" /> },
    { name: 'OPD', icon: <FileText className="w-4 h-4" /> },
    { name: 'Cholesterol', icon: <PieChart className="w-4 h-4" /> },
    { name: 'Thyroid', icon: <Thermometer className="w-4 h-4" /> },
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
      const uploadResp = await uploadFileWithProgress(selectedFile, backendCat, (p) => setProgress(p))
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
      if (manualFile) {
        try {
          // Use skipRecord=true to avoid duplicate MedicalRecord creation
          const uploadResp = await uploadFile(manualFile, category, true)
          if (uploadResp.success && uploadResp.data) {
            fileData = {
              imagePath: uploadResp.data.fileUrl,
              publicId: uploadResp.data.publicId,
              fileName: uploadResp.data.fileName,
              fileSize: uploadResp.data.fileSize
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
    setCategory(mode === 'upload' ? 'Auto-Detect' : '')
    setExtractedData(null)
    setError(null)
    setManualData({
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      isTimeModified: false,
      doctor: '',
      hospital: '',
      metrics: {}
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32 min-h-screen animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 space-y-4 md:space-y-0 text-left">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Add Medical Report</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic mr-2 border-r border-gray-100 pr-3">Expand your medical history</p>
            {['Blood Sugar', 'Blood Pressure', 'Thyroid', 'Cholesterol', 'OPD', 'Imaging'].map(tag => (
              <Badge key={tag} color="blue" className="text-[8px] font-black italic bg-blue-50/50 text-blue-600 border-none px-2 py-0.5">{tag}</Badge>
            ))}
          </div>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex p-1 bg-gray-100 rounded-2xl md:w-auto">
          <button 
            onClick={() => handleModeToggle('upload')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <UploadIcon className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button 
            onClick={() => handleModeToggle('manual')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
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
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                    category === cat.name
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
        )}

        {/* mode: MANUAL */}
        {mode === 'manual' && uploadStatus === 'ready' && category && (
          <Card className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-gray-100">
              <DatePicker 
                label="VISIT DATE" 
                value={manualData.date} 
                onChange={(d) => setManualData({...manualData, date: d})}
                className="font-black"
              />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VISIT TIME</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input 
                    type="time" 
                    value={manualData.time}
                    onChange={(e) => setManualData({...manualData, time: e.target.value, isTimeModified: true})}
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
                    onChange={(e) => setManualData({...manualData, doctor: e.target.value})}
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
                    onChange={(e) => setManualData({...manualData, hospital: e.target.value})}
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
            </div>

            {/* Metric Fields */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] italic">Enter Medical Metrics</h4>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-100 to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(categoryMetrics[category] || [{key: 'notes', label: 'Additional Info'}]).map((metric) => (
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
                          metrics: {...manualData.metrics, [metric.key]: e.target.value}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                    <span className="mr-2">Visit Information</span>
                    <div className="flex-1 h-[1px] bg-gray-100" />
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker 
                    label="VISIT DATE" 
                    value={manualData.date} 
                    onChange={(d) => setManualData({...manualData, date: d})}
                    className="font-black"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VISIT TIME</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input 
                        type="time" 
                        value={manualData.time}
                        onChange={(e) => setManualData({...manualData, time: e.target.value, isTimeModified: true})}
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
                            extractedValues: {...extractedData.extractedValues, [key]: e.target.value}
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

            <div className="flex space-x-4 pt-6">
              <Button onClick={handleConfirmExtraction} className="flex-1 py-6 rounded-3xl bg-green-600 hover:bg-black text-white font-black uppercase tracking-widest transition-all">
                Confirm & Sync
              </Button>
              <Button onClick={resetAll} variant="outline" className="flex-1 py-6 rounded-3xl border-gray-200 text-gray-400 font-black uppercase tracking-widest hover:bg-gray-50">
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
              <Button onClick={() => navigate('/records')} className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest shadow-xl">
                View History
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
  )
}

export default Upload