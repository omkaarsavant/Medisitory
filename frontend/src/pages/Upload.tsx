import React, { useState, useRef } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { useRecordStore } from '../store/recordStore'
import { uploadFileWithProgress, extractData, confirmExtraction, MedicalRecord } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [uploadStatus, setUploadStatus] = useState<string>('ready')
  const [progress, setProgress] = useState<number>(0)
  const [extractedData, setExtractedData] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addRecord } = useRecordStore()

  const categories = [
    { id: 1, name: 'Blood Sugar', color: 'bg-blue-600' },
    { id: 2, name: 'Blood Pressure', color: 'bg-green-600' },
    { id: 3, name: 'OPD', color: 'bg-purple-600' },
    { id: 4, name: 'Cholesterol', color: 'bg-orange-600' },
    { id: 5, name: 'Thyroid', color: 'bg-pink-600' },
    { id: 6, name: 'Custom', color: 'bg-gray-600' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      console.log('File selected:', file.name, file.size)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      console.log('File dropped:', file.name, file.size)
    }
  }

  const handleCategorySelect = (cat: string) => {
    setCategory(cat)
    console.log('Category selected:', cat)
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const [showRawText, setShowRawText] = useState<boolean>(false)

  const [uploadId, setUploadId] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      setError('Please select a file and category')
      return
    }

    setLoading(true)
    setError(null)
    setUploadStatus('uploading')
    setProgress(0)

    try {
      const response = await uploadFileWithProgress(selectedFile, category, (p) => {
        setProgress(p)
      })
      
      const newUploadId = response.data.uploadId
      setUploadId(newUploadId)

      setProgress(100)
      setUploadStatus('processing')

      // Simulate extraction delay
      setTimeout(async () => {
        try {
          const extractResponse = await extractData(newUploadId)
          const fields = extractResponse.data.fields
          setExtractedData({
            category: category,
            extractedValues: fields,
            rawText: extractResponse.data.rawText // Include raw text
          })
          setUploadStatus('processed')
        } catch (error) {
          setError('Failed to extract data')
          setUploadStatus('error')
        }
      }, 2000)

    } catch (error) {
      setError('Failed to upload file')
      setUploadStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!extractedData || !uploadId) return

    setLoading(true)
    setError(null)

    try {
      await confirmExtraction(uploadId, { 
        ...extractedData.extractedValues
      })

      const record: MedicalRecord = {
        id: uploadId,
        category: extractedData.category,
        date: new Date().toISOString().split('T')[0],
        extractedData: extractedData.extractedValues,
        status: 'processed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      addRecord(record)

      setUploadStatus('confirmed')
      setProgress(0)
      setSelectedFile(null)
      setCategory('')
      setExtractedData(null)
      setUploadId(null)

    } catch (error) {
      setError('Failed to confirm extraction')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setUploadStatus('ready')
    setProgress(0)
    setSelectedFile(null)
    setCategory('')
    setExtractedData(null)
    setError(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Medical Records</h1>

        <Card className="mb-8 p-8">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition-colors duration-200"
            aria-label="Drag and drop area for medical documents"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Drag & Drop Files Here</h3>
            <p className="text-gray-600 mb-4">or</p>
            <Button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleBrowseClick(); }}>
              Browse Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select file to upload"
            />
            <p className="text-xs text-gray-500 mt-4">PDF, JPG, PNG up to 20MB</p>
          </div>

          {selectedFile && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{Math.round(selectedFile.size / 1024)} KB</p>
                  </div>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
              </div>
            </div>
          )}
        </Card>

        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.name)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  category === cat.name
                    ? `${cat.color} text-white`
                    : `bg-gray-100 text-gray-700 hover:bg-gray-200`
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Status</h3>
          {loading && (
            <div className="flex flex-col items-center">
              <LoadingSpinner className="mx-auto" />
              {uploadStatus === 'processed' && <p className="mt-2 text-sm text-blue-600 font-medium animate-pulse">Saving record...</p>}
            </div>
          )}
          {error && <ErrorMessage message={error} onRetry={handleCancel} />}
          {!loading && !error && uploadStatus === 'ready' && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0" />
              </svg>
              <p className="text-gray-600 mb-4">Ready to upload</p>
              <Button onClick={handleUpload} disabled={!selectedFile || !category || loading}>Upload Document</Button>
            </div>
          )}
          {uploadStatus === 'uploading' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Uploading...</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          {uploadStatus === 'processing' && (
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto mb-4" />
              <p className="text-gray-600">Extracting data...</p>
            </div>
          )}
          {uploadStatus === 'processed' && extractedData && (
            <div className="space-y-6">
              <div className="border-b pb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Extracted Data</h4>
                <div className="space-y-3">
                  {/* Medical Data Table */}
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase">Extracted Results</span>
                      <button 
                        onClick={() => setShowRawText(!showRawText)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {showRawText ? 'Hide Raw Text' : 'View Raw OCR Text'}
                      </button>
                    </div>
                    
                    {showRawText && (
                      <div className="p-4 bg-gray-900 text-green-400 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto mb-2 border-b">
                        {extractedData.rawText || 'No raw text extracted'}
                      </div>
                    )}

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {category === 'Blood Sugar' ? (
                          // Specific rows for Blood Sugar as requested
                          [
                            { key: 'fasting', label: 'Fasting Blood Sugar' },
                            { key: 'post_meal', label: 'Postprandial Blood Sugar' },
                            { key: 'random', label: 'Random Blood Sugar' },
                            { key: 'hba1c', label: 'HbA1c' }
                          ].filter(item => item.key in extractedData.extractedValues).map((item) => {
                            const value = extractedData.extractedValues[item.key] || ''
                            return (
                              <tr key={item.key}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.label}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => {
                                      const newValues = { ...extractedData.extractedValues, [item.key]: e.target.value }
                                      setExtractedData({ ...extractedData, extractedValues: newValues })
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{item.key === 'hba1c' ? '%' : 'mg/dL'}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => {
                                      const newValues = { ...extractedData.extractedValues }
                                      delete newValues[item.key]
                                      setExtractedData({ ...extractedData, extractedValues: newValues })
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          // General rows for other categories
                          Object.entries(extractedData.extractedValues).map(([key, value]: [string, any]) => (
                            <tr key={key}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{key.replace('_', ' ')}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={String(value)}
                                  onChange={(e) => {
                                    const newValues = { ...extractedData.extractedValues, [key]: e.target.value }
                                    setExtractedData({ ...extractedData, extractedValues: newValues })
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">-</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => {
                                    const newValues = { ...extractedData.extractedValues }
                                    delete newValues[key]
                                    setExtractedData({ ...extractedData, extractedValues: newValues })
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700">Confirm & Save</Button>
                <Button onClick={handleCancel} variant="outline" className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
          {uploadStatus === 'confirmed' && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Success!</h4>
              <Button onClick={() => setUploadStatus('ready')}>Upload Another</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default Upload