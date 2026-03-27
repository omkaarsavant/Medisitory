// === frontend/src/pages/Records.tsx ===

import React, { useState, useEffect } from 'react'
import { 
  Card, Badge, Button, Pagination, LoadingSpinner, ErrorMessage, TimelineView 
} from '../components'
import { 
  ArrowLeft, ArrowRight, Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, List, Layout, FileText, Stethoscope, X, SlidersHorizontal, Share2, CheckSquare, Square, Copy, Check, Shield, UserX, Clock, Users
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useRecordStore } from '../store/recordStore'
import { deleteRecord } from '../services/api'
import { createShareToken, DoctorAccess, getActiveShares, updateShareRecords } from '../services/doctorAccessService'

const Records: React.FC = () => {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [showFilters, setShowFilters] = useState(false)
  
  // Sharing feature state
  const [isSharingMode, setIsSharingMode] = useState(false)
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([])
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareExpirationDays, setShareExpirationDays] = useState(1)
  const [shareResult, setShareResult] = useState<DoctorAccess | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // New Connection Flow State
  const [shares, setShares] = useState<DoctorAccess[]>([])
  const [isSelectDoctorModalOpen, setIsSelectDoctorModalOpen] = useState(false)
  const [isScopeControlModalOpen, setIsScopeControlModalOpen] = useState(false)
  const [editingShare, setEditingShare] = useState<DoctorAccess | null>(null)
  const [fetchingShares, setFetchingShares] = useState(false)
  const [isNoDoctorModalOpen, setIsNoDoctorModalOpen] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [isUpdatingScope, setIsUpdatingScope] = useState(false)
  const [scopeSearchTerm, setScopeSearchTerm] = useState('')
  
  const { 
    records, 
    allRecords, 
    fetchRecords, 
    fetchAllRecords, 
    setFilters, 
    filters, 
    loading, 
    error, 
    totalPages 
  } = useRecordStore()

  const categories = [
    'All', 'Blood Sugar', 'Blood Pressure', 'OPD', 'Cholesterol', 'Thyroid', 'Custom'
  ]

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        const response = await deleteRecord(id)
        if (response.success) {
          await fetchRecords()
        }
      } catch (err) {
        console.error('Error deleting record:', err)
        alert('Failed to delete record')
      }
    }
  }

  useEffect(() => {
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

    setFilters({
      category: selectedCategory === 'All' ? '' : getBackendCategory(selectedCategory),
      startDate,
      endDate,
      page: currentPage,
      limit: 20
    })
    
    if (viewMode === 'timeline') {
      fetchAllRecords()
    } else {
      fetchRecords()
    }
  }, [selectedCategory, startDate, endDate, currentPage, viewMode])

  const filteredRecords = (viewMode === 'timeline' ? allRecords : records).filter(record => {
    const matchesSearch = searchTerm === '' ||
      (record.doctorName || record.doctor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.hospitalName || record.hospital || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleFiltersClear = () => {
    setSelectedCategory('')
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const toggleShareSelection = (id: string, e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation()
    if (selectedShareIds.includes(id)) {
      setSelectedShareIds(prev => prev.filter(i => i !== id))
    } else {
      setSelectedShareIds(prev => [...prev, id])
    }
  }

  const handleGenerateShareLink = async () => {
    if (selectedShareIds.length === 0) return
    setIsSharing(true)
    try {
      const result = await createShareToken(selectedShareIds, shareExpirationDays)
      setShareResult(result)
    } catch (err) {
      alert('Failed to generate share link')
      console.error(err)
    } finally {
      setIsSharing(false)
    }
  }

  const copyToClipboard = () => {
    if (shareResult) {
      navigator.clipboard.writeText(shareResult.shareToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const fetchActiveConnections = async () => {
    try {
      setFetchingShares(true)
      const data = await getActiveShares()
      setShares(data)
      return data
    } catch (err) {
      console.error('Error fetching shares:', err)
      return []
    } finally {
      setFetchingShares(false)
    }
  }

  const handleShareButtonClick = async () => {
    if (allRecords.length === 0) {
      await fetchAllRecords()
    }
    const activeShares = await fetchActiveConnections()
    if (activeShares.length === 0) {
      setIsNoDoctorModalOpen(true)
    } else {
      setIsSelectDoctorModalOpen(true)
    }
  }

  const openScopeControl = (share: DoctorAccess) => {
    setEditingShare(share)
    setTempSelectedIds([...share.recordIds])
    setScopeSearchTerm('')
    setIsSelectDoctorModalOpen(false)
    setIsScopeControlModalOpen(true)
  }

  const toggleScopeRecord = (id: string) => {
    setTempSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleUpdateScope = async () => {
    if (!editingShare) return
    setIsUpdatingScope(true)
    try {
      const updated = await updateShareRecords(editingShare.shareToken, tempSelectedIds)
      setShares(prev => prev.map(s => s.shareToken === editingShare.shareToken ? updated : s))
      setIsScopeControlModalOpen(false)
    } catch (err) {
      alert('Failed to update scope')
    } finally {
      setIsUpdatingScope(false)
    }
  }
   return (
    <div className="flex min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Your Records</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-widest hidden sm:block">Medical History Archive</p>
              <span className="hidden sm:block text-gray-200">|</span>
              <button 
                onClick={() => navigate('/manage-shares')}
                className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                Manage Shared Sessions
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm flex-1 sm:flex-none">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>Timeline</span>
              </button>
            </div>
            
            {viewMode === 'list' && (
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className={`sm:hidden p-3 rounded-xl border-gray-200 ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            )}

            <Button 
              onClick={handleShareButtonClick}
              variant="outline"
              className="rounded-xl px-4 flex items-center gap-2 bg-white border-gray-200 hover:bg-gray-50 transition-all font-bold text-gray-700"
              loading={fetchingShares}
            >
              <Share2 className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Share Records</span>
            </Button>
          </div>
        </div>

        {/* Doctor Notes Notifications */}
        {filteredRecords.some(r => r.hasNewDoctorNote) && (
          <Card 
            className="mb-8 p-4 bg-indigo-600 text-white border-none shadow-lg animate-in slide-in-from-top-4 duration-500 cursor-pointer hover:bg-indigo-700 transition-all flex items-center justify-between group"
            onClick={() => {
              const firstWithNote = filteredRecords.find(r => r.hasNewDoctorNote)
              if (firstWithNote) navigate(`/records/${firstWithNote._id || firstWithNote.id}`)
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-80">Physician Action Required</p>
                <h4 className="text-sm font-bold">New professional observations have been added to your reports.</h4>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Review Notes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        )}
        {isSharingMode && (
          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <p className="text-indigo-800 font-bold text-sm">
              {selectedShareIds.length} records selected to share
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                className="flex-1 sm:flex-none bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={() => setSelectedShareIds(filteredRecords.map(r => r._id || r.id))}
              >
                Select All
              </Button>
              <Button 
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 border-none shadow-md"
                disabled={selectedShareIds.length === 0}
                onClick={() => setIsShareModalOpen(true)}
              >
                Generate Link
              </Button>
            </div>
          </div>
        )}

        {/* Global Filter Bar - Mobile Collapsible */}
        {viewMode === 'list' && (
          <div className={`${showFilters ? 'block' : 'hidden sm:block'} mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
            <Card className="p-4 sm:p-6 shadow-xl border-none ring-1 ring-black/[0.03]">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-500" />
                  <span>Filters</span>
                </h3>
                <button onClick={handleFiltersClear} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Date Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-gray-50 border-none rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-gray-50 border-none rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>
                </div>

                {/* Search Filter */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Quick Search</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Doctor, hospital..."
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {loading && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 mb-8 animate-in fade-in duration-500">
            <LoadingSpinner className="mx-auto mb-4 w-12 h-12 text-blue-600" />
            <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-[0.2em] italic">Compiling Medical History</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4">
            <ErrorMessage message={error} onRetry={() => viewMode === 'timeline' ? fetchAllRecords() : fetchRecords()} />
          </div>
        )}

        {!loading && !error && filteredRecords.length === 0 && (
          <Card className="text-center py-20 text-gray-400 mb-8 border-2 border-dashed border-gray-100 bg-white/50 backdrop-blur-sm rounded-[2rem]">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
              <Search className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No matching records found</p>
          </Card>
        )}

        {/* Records Display */}
        {!loading && !error && filteredRecords.length > 0 && (
          <div className="sm:pb-8">
            {viewMode === 'list' ? (
              <>
                <div className="grid grid-cols-1 gap-4 mb-8">
                  {filteredRecords.map((record) => (
                    <Card 
                      key={record._id || record.id} 
                      className={`p-4 sm:p-6 hover:shadow-2xl transition-all duration-500 cursor-pointer border-none shadow-lg group relative overflow-hidden active:scale-[0.98] ${
                        isSharingMode && selectedShareIds.includes(record._id || record.id) 
                          ? 'ring-2 ring-indigo-500 bg-indigo-50/10' 
                          : 'ring-1 ring-black/[0.03]'
                      }`} 
                      onClick={() => {
                        if (isSharingMode) {
                          toggleShareSelection(record._id || record.id)
                        } else {
                          navigate(`/records/${record._id || record.id}`)
                        }
                      }}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-6 min-w-0 flex-1">
                          
                          {/* Selection Checkbox for Sharing Mode */}
                          {isSharingMode && (
                            <div 
                              className="text-indigo-500 cursor-pointer p-2 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
                              onClick={(e) => toggleShareSelection(record._id || record.id, e)}
                            >
                              {selectedShareIds.includes(record._id || record.id) ? (
                                <CheckSquare className="w-6 h-6" />
                              ) : (
                                <Square className="w-6 h-6 text-gray-300" />
                              )}
                            </div>
                          )}

                          <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors shadow-inner border border-gray-100/50">
                            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-blue-500 transition-all duration-500" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="text-sm sm:text-lg font-black text-gray-900 uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">
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
                                </h4>
                                <Badge color={['completed', 'active', 'processed'].includes((record.status || '').toLowerCase()) ? "green" : (record.status || '').toLowerCase() === "pending" ? "yellow" : "red"} className="font-black italic px-2 py-0 sm:px-3 sm:py-0.5 text-[8px] sm:text-[10px]">
                                  {record.status || 'Active'}
                                </Badge>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest gap-2 sm:gap-4">
                              <span className="flex items-center gap-1.5 truncate">
                                <Stethoscope className="w-3 h-3 text-blue-400/60" />
                                <span className="truncate">{record.doctorName || record.doctor || 'General Consultation'}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-blue-400/60" />
                                <span>{(() => {
                                  const raw = new Date(record.visitDate || record.uploadDate || record.date || record.createdAt || Date.now())
                                  const local = new Date(raw.getTime() + raw.getTimezoneOffset() * 60000)
                                  return local.toLocaleDateString('en-GB')
                                })()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                          {!isSharingMode && (
                            <button 
                              className="p-2 text-gray-200 hover:text-red-500 transition-all rounded-full hover:bg-red-50 active:scale-90 z-10 relative"
                              onClick={(e) => handleDelete(e, record._id || record.id)}
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                          <div className="p-1 sm:p-2">
                            <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-200 transition-all duration-300 ${isSharingMode ? 'opacity-0' : 'group-hover:text-blue-500 group-hover:translate-x-1'}`} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Decorative Gradient Line */}
                      <div className="absolute left-0 bottom-0 h-1 w-0 bg-blue-500 group-hover:w-full transition-all duration-500" />
                    </Card>
                  ))}
                </div>
                
                <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl">
                <TimelineView records={filteredRecords} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-indigo-500" />
                <span>Share Records</span>
              </h2>
              <button 
                onClick={() => {
                  setIsShareModalOpen(false)
                  setShareResult(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!shareResult ? (
              <div className="space-y-6">
                <p className="text-gray-600 text-sm font-medium">
                  You are sharing <span className="font-bold text-indigo-600">{selectedShareIds.length}</span> record(s).
                  Generate an access code and QR for your doctor. 
                </p>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Link Expiration</label>
                  <select
                    value={shareExpirationDays}
                    onChange={(e) => setShareExpirationDays(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value={1}>1 Day (24 Hours)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>

                <Button 
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md text-sm font-black uppercase tracking-widest"
                  onClick={handleGenerateShareLink}
                  disabled={isSharing}
                >
                  {isSharing ? 'Generating...' : 'Generate Access Token'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 flex flex-col items-center animate-in slide-in-from-right-4 duration-300">
                <div className="bg-indigo-50 rounded-2xl p-6 w-full flex flex-col items-center shadow-inner">
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Scan QR to Access</p>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                    <QRCode
                      value={shareResult.shareToken}
                      size={180}
                      level="Q"
                      className="mx-auto"
                    />
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 text-center">Or enter code manually</p>
                  <div className="flex gap-2 relative">
                    <div className="w-full text-center text-3xl font-black text-gray-800 tracking-[0.2em] bg-gray-100 py-3 rounded-xl border border-gray-200">
                      {shareResult.shareToken}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={copyToClipboard}
                  variant={copied ? "primary" : "outline"}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${copied ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                >
                  {copied ? <><Check className="w-4 h-4"/> Copied!</> : <><Copy className="w-4 h-4"/> Copy Code</>}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
      {/* No Doctor Connected Modal */}
      {isNoDoctorModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-lg bg-white rounded-[3rem] p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-none">
            <div className="p-10 bg-indigo-600 text-white relative">
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 shadow-lg">
                  <UserX className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none mb-2">No Clinician Link</h2>
                <p className="text-indigo-100 font-medium text-sm">You haven't connected with any doctors yet</p>
              </div>
              <Shield className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-black/5" />
            </div>

            <div className="p-10 text-center space-y-8">
              <p className="text-gray-500 font-medium leading-relaxed px-4">
                To share your records securely, you first need to add a doctor to your network using their Unique ID or QR Code.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => navigate('/manage-shares')}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100"
                >
                  Manage Connections
                </Button>
                <button 
                  onClick={() => setIsNoDoctorModalOpen(false)}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors py-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Select Doctor Modal */}
      {isSelectDoctorModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-lg bg-white rounded-[3rem] p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-none">
            <div className="p-10 bg-gray-900 text-white relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none mb-2 text-indigo-400">Select Doctor</h2>
                <p className="text-gray-400 font-medium text-sm">Choose a clinician to manage access scope</p>
              </div>
              <button 
                onClick={() => setIsSelectDoctorModalOpen(false)} 
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors text-white z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <Users className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-white/5" />
            </div>

            <div className="p-10 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {shares.map(share => (
                <div 
                  key={share.shareToken}
                  onClick={() => openScopeControl(share)}
                  className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all text-gray-400">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 uppercase tracking-tight italic">{share.doctorName || 'Doctor'}</p>
                      <div className="flex items-center gap-2">
                        <Badge color="blue" className="px-1.5 py-0 text-[8px] font-black uppercase">{share.recordIds.length} Records Shared</Badge>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
            
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-center">
               <button 
                 onClick={() => navigate('/manage-shares')}
                 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline flex items-center gap-2"
               >
                 <Plus className="w-3.5 h-3.5" />
                 Connect with New Doctor
               </button>
            </div>
          </Card>
        </div>
      )}

      {/* Scope Control (Manage Access) Modal */}
      {isScopeControlModalOpen && editingShare && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white rounded-[3rem] p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-none flex flex-col max-h-[90vh]">
            <div className="p-10 bg-indigo-600 text-white relative flex-shrink-0">
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                  <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none mb-1">Manage Access</h2>
                  <p className="text-indigo-100 font-medium text-sm">Controlling visibility for <span className="text-white font-black">{editingShare.doctorName}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsScopeControlModalOpen(false)} 
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors text-white z-10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 flex-1 flex flex-col overflow-hidden">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  type="text"
                  placeholder="SEARCH RECORDS TO SHARE..."
                  value={scopeSearchTerm}
                  onChange={e => setScopeSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-gray-900 text-sm tracking-widest placeholder:text-gray-300"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {allRecords
                  .filter(r => {
                    const cat = r.category || 'custom'
                    return cat.toLowerCase().includes(scopeSearchTerm.toLowerCase()) || 
                           (r.doctorName || '').toLowerCase().includes(scopeSearchTerm.toLowerCase())
                  })
                  .map(record => {
                    const id = record._id || record.id || ''
                    const isSelected = tempSelectedIds.includes(id)

                    return (
                      <div 
                        key={id}
                        onClick={() => toggleScopeRecord(id)}
                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100/50' 
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-300'}`}>
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-gray-900 uppercase tracking-tight italic">{record.category || 'Record'}</p>
                              <Badge color="blue" className="px-1 py-0 text-[7px] font-black uppercase">
                                {new Date(record.visitDate || record.date).toLocaleDateString('en-GB')}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[200px]">
                              {record.doctorName || 'General Consultation'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <span>{tempSelectedIds.length} Selected</span>
                  </div>
                  <button 
                    onClick={() => setTempSelectedIds([])}
                    className="hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                        setIsScopeControlModalOpen(false)
                        setIsSelectDoctorModalOpen(true)
                    }}
                    className="rounded-2xl border-gray-200 text-gray-400 font-black uppercase tracking-widest text-[11px] h-14 px-8 hover:bg-white"
                  >
                    Back
                  </Button>
                  <Button 
                    variant="primary"
                    loading={isUpdatingScope}
                    onClick={handleUpdateScope}
                    className="rounded-2xl bg-emerald-600 border-none text-white font-black uppercase tracking-widest text-[11px] h-14 px-10 shadow-xl shadow-emerald-100 hover:bg-emerald-700"
                  >
                    Update Access
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Records