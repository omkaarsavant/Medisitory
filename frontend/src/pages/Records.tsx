// === frontend/src/pages/Records.tsx ===

import React, { useState, useEffect } from 'react'
import { 
  Card, Badge, Button, Pagination, LoadingSpinner, ErrorMessage, TimelineView 
} from '../components'
import { 
  ArrowLeft, ArrowRight, Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, List, Layout, FileText, Stethoscope, X, SlidersHorizontal, Share2, CheckSquare, Square, Copy, Check, Shield, UserX, Clock, Users, Bell, Activity, Home, Brain
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useRecordStore } from '../store/recordStore'
import { useAppointmentStore } from '../store/appointmentStore'
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
  const [showNotifications, setShowNotifications] = useState(false)
  
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

  const { appointments } = useAppointmentStore()

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

  const getMobileCategoryStyle = (category: string) => {
      const cat = (category || 'custom').toLowerCase()
      if (cat.includes('blood') || cat.includes('sugar')) return { bg: 'bg-[#ffdad6]/30', text: 'text-[#ba1a1a]', icon: <Activity className="w-6 h-6" /> }
      if (cat.includes('vaccine') || cat.includes('immun')) return { bg: 'bg-[#67fcc6]/20', text: 'text-[#006c4f]', icon: <Shield className="w-6 h-6" /> }
      if (cat.includes('x-ray') || cat.includes('imag') || cat.includes('scan') || cat.includes('radiology')) return { bg: 'bg-[#c5c7c8]/20', text: 'text-[#414754]', icon: <Search className="w-6 h-6" /> }
      return { bg: 'bg-[#036cfb]/10', text: 'text-[#0055c9]', icon: <FileText className="w-6 h-6" /> }
  }

   return (
    <>
    {/* ================= DESKTOP VIEW ================= */}
    <div className="hidden md:flex min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Your Records</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-widest hidden sm:block">Medical History Archive</p>
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
    </div> {/* End of DESKTOP VIEW wrapper */}

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
        <>
        {/* ================= DESKTOP VIEW ================= */}
        <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
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

        {/* ================= MOBILE VIEW (selectd.html mapped) ================= */}
        <div className="md:hidden fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#191c1d]/5 backdrop-blur-sm z-0" onClick={() => setIsSelectDoctorModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-[0_20px_40px_rgba(25,28,29,0.06)] border border-white/20 animate-in zoom-in-95 fade-in duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-[#edeeef]">
                <h1 className="font-extrabold text-lg tracking-tight text-[#191c1d] uppercase" style={{ fontFamily: 'Manrope' }}>SELECT DOCTOR</h1>
                <button
                    onClick={() => setIsSelectDoctorModalOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#edeeef] transition-colors active:scale-90 duration-200">
                    <X className="w-6 h-6 text-[#414754]" />
                </button>
            </header>
            {/* Search Bar */}
            <div className="px-6 pt-6 pb-2">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-[#717786]" />
                    </div>
                    <input
                        className="w-full bg-[#f3f4f5] border-none rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-[#0055c9]/20 placeholder:text-[#717786] transition-all"
                        placeholder="Search by name or specialty..." type="text" />
                </div>
            </div>
            {/* Content Area: Doctor List */}
            <div className="px-6 py-4 space-y-4 max-h-[530px] overflow-y-auto">
                {shares.length > 0 ? shares.map(share => (
                    <div
                        key={share.shareToken}
                        onClick={() => openScopeControl(share)}
                        className="group relative flex items-center gap-4 p-5 rounded-lg bg-[#f3f4f5] hover:bg-white transition-all duration-300 border border-transparent hover:border-[#0055c9]/10 hover:shadow-lg cursor-pointer">
                        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-[#dae2ff] flex-shrink-0 flex items-center justify-center text-[#0055c9]">
                            {/* Assuming doctor has a default generic stethoscope icon or image */}
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-[#191c1d] text-base" style={{ fontFamily: 'Manrope' }}>{share.doctorName || 'DOCTOR'}</h3>
                                <ChevronRight className="text-[#0055c9] w-5 h-5 opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <FileText className="text-[#0055c9] w-4 h-4" />
                                <p className="text-[#414754] text-xs font-semibold tracking-wide uppercase">{share.recordIds.length} RECORDS SHARED</p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-[#717786] font-medium text-sm">
                        No connected doctors found. Connect with a new doctor to share records.
                    </div>
                )}
            </div>
            {/* Action Footer */}
            <footer className="p-6 bg-[#f3f4f5]/50 backdrop-blur-md border-t border-white/20">
                <button
                    onClick={() => navigate('/manage-shares')}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-[#0055c9] text-white rounded-xl font-bold text-sm tracking-wide shadow-[0_8px_20px_rgba(0,85,201,0.25)] hover:shadow-none hover:bg-[#036cfb] transition-all active:scale-[0.98] duration-200" style={{ fontFamily: 'Manrope' }}>
                    <Plus className="w-5 h-5" />
                    <span className="uppercase">CONNECT WITH NEW DOCTOR</span>
                </button>
            </footer>
          </div>
        </div>
        </>
      )}

      {/* Scope Control (Manage Access) Modal */}
      {isScopeControlModalOpen && editingShare && (
        <>
        {/* ================= DESKTOP VIEW ================= */}
        <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
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

        {/* ================= MOBILE VIEW (access.html mapped) ================= */}
        <div className="md:hidden fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#191c1d]/5 backdrop-blur-sm z-0" onClick={() => setIsScopeControlModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] sm:max-h-[751px] bg-white/75 backdrop-blur-[25px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-white/60 animate-in zoom-in-95 fade-in duration-300">
            {/* Header Section */}
            <div className="px-6 pt-10 pb-4 flex flex-col items-center text-center relative">
                <button onClick={() => setIsScopeControlModalOpen(false)} className="absolute right-6 top-6 p-2 rounded-full hover:bg-black/5 transition-colors">
                    <X className="w-6 h-6 text-[#44474e]" />
                </button>
                <div className="w-16 h-16 bg-[#0055c9] rounded-full flex items-center justify-center shadow-lg shadow-[#0055c9]/20 mb-4">
                    <Shield className="text-white w-8 h-8" />
                </div>
                <h1 className="font-extrabold text-2xl tracking-tight text-[#191c1d] uppercase" style={{ fontFamily: 'Manrope' }}>MANAGE ACCESS</h1>
                <p className="text-[#44474e] font-medium text-sm mt-1">Controlling visibility for {editingShare.doctorName}</p>
            </div>
            {/* Search Bar */}
            <div className="px-6 py-4">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-[#74777f]" />
                    <input
                        value={scopeSearchTerm}
                        onChange={e => setScopeSearchTerm(e.target.value)}
                        className="w-full bg-[#e7e8e9]/50 border-none rounded-full py-4 pl-12 pr-6 text-sm font-semibold tracking-wider placeholder:text-[#74777f] focus:ring-2 focus:ring-[#0055c9]/20 transition-all text-[#191c1d]"
                        placeholder="SEARCH RECORDS TO SHARE..." type="text" />
                </div>
            </div>
            {/* Record List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
                <div className="space-y-4 pb-4">
                    {allRecords
                      .filter(r => {
                          const cat = r.category || 'custom'
                          return cat.toLowerCase().includes(scopeSearchTerm.toLowerCase()) || 
                                 (r.doctorName || '').toLowerCase().includes(scopeSearchTerm.toLowerCase())
                      })
                      .map(record => {
                          const id = record._id || record.id || ''
                          const isSelected = tempSelectedIds.includes(id)
                          const style = getMobileCategoryStyle(record.category)

                          return (
                            <div key={id} onClick={() => toggleScopeRecord(id)} className={`${isSelected ? 'bg-white border-2 border-[#0055c9] shadow-xl shadow-[#0055c9]/10' : 'bg-white/60 backdrop-blur-[10px] border border-white/50 hover:bg-white/80'} rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 ${style.bg} ${style.text} rounded-full flex items-center justify-center`}>
                                        {style.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#191c1d] uppercase" style={{ fontFamily: 'Manrope' }}>{record.category ? record.category.toUpperCase().replace(/_/g, ' ') : 'GENERAL CONSULTATION'}</h3>
                                        <p className="text-[#44474e] text-sm font-medium">{new Date(record.visitDate || record.date).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'border-2 border-[#0055c9] bg-[#0055c9]' : 'border-2 border-[#c1c6d7]'}`}>
                                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                </div>
                            </div>
                          )
                      })}
                </div>
            </div>
            {/* Selection Summary */}
            <div className="px-6 py-4 flex justify-between items-center border-t border-[#c1c6d7]/30">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0055c9] animate-pulse"></span>
                    <span className="font-extrabold text-[#191c1d] text-sm tracking-widest" style={{ fontFamily: 'Manrope' }}>{tempSelectedIds.length} SELECTED</span>
                </div>
                <button onClick={() => setTempSelectedIds([])} className="text-[#0055c9] font-bold text-sm hover:underline">Clear All</button>
            </div>
            {/* Actions Footer */}
            <div className="px-6 pb-8 pt-2 grid grid-cols-2 gap-4">
                <button
                    onClick={() => {
                        setIsScopeControlModalOpen(false)
                        setIsSelectDoctorModalOpen(true)
                    }}
                    className="h-14 rounded-full bg-[#e7e8e9]/80 text-[#191c1d] font-bold text-sm tracking-widest active:scale-95 transition-transform uppercase">
                    BACK
                </button>
                <button
                    onClick={handleUpdateScope}
                    disabled={isUpdatingScope}
                    className="h-14 rounded-full bg-[#0055c9] text-white font-bold text-sm tracking-widest shadow-lg shadow-[#0055c9]/30 active:scale-95 transition-transform uppercase flex items-center justify-center">
                    {isUpdatingScope ? 'UPDATING...' : 'UPDATE ACCESS'}
                </button>
            </div>
          </div>
        </div>
        </>
      )}

    {/* ================= MOBILE VIEW (EXACT AS record.html) ================= */}
    <div className="md:hidden mobile-body">
        {/* TopAppBar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center neon-glow-primary overflow-hidden">
                    <img alt="JD" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4" />
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Manrope' }}>MedVault</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer"
                     onClick={() => navigate('/know-your-report')}
                >
                    <Brain className="text-[#0055c9] w-6 h-6" />
                </div>
                <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer"
                     onClick={() => setShowNotifications(true)}
                >
                    <Bell className="text-[#0055c9] w-6 h-6" />
                    {filteredRecords.some(r => r.hasNewDoctorNote) && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
                    )}
                </div>
            </div>
        </header>

        {/* Mobile Notification Overlay */}
        {showNotifications && (
          <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && records.filter(r => r.hasNewDoctorNote).length === 0 && (
                <div className="text-center py-20">
                  <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium italic">No new notifications</p>
                </div>
              )}
              
              {/* Appointments in Overlay */}
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Upcoming Appointments</h3>
                  {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).map(appt => (
                    <div key={appt._id} onClick={() => navigate('/calendar')} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Dr. {appt.doctorName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(appt.date).toLocaleDateString()} • {appt.time}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* Records with Notes in Overlay */}
              {records.filter(r => r.hasNewDoctorNote).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">New Reports Shared</h3>
                  {records.filter(r => r.hasNewDoctorNote).map(record => (
                    <div key={record._id || record.id} onClick={() => navigate(`/records/${record._id || record.id}`)} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 capitalize">{record.category.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">View Physician Observations</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-300" />
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

        <main className="pt-10 px-5 space-y-5 pb-[80px] max-w-lg mx-auto">
            {/* Hero Header Section */}
            <section className="mb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[#0055c9] uppercase" style={{ fontFamily: 'Manrope' }}>MEDICAL HISTORY ARCHIVE</span>
                    <h1 className="text-3xl font-extrabold text-[#191c1d] leading-tight" style={{ fontFamily: 'Manrope' }}>Your Records</h1>
                </div>
                <div className="mt-6 flex flex-col gap-4">
                    {isSharingMode && (
                        <div className="bg-[#0055c9]/10 rounded-lg p-3 flex justify-between items-center border border-[#0055c9]/20">
                            <span className="text-xs font-bold text-[#0055c9]">{selectedShareIds.length} Selected</span>
                            <div className="flex gap-2">
                                <button className="text-[10px] font-bold text-[#0055c9] px-3 py-1 bg-white rounded-full shadow-sm" onClick={() => setIsSharingMode(false)}>Cancel</button>
                                <button className="text-[10px] font-bold text-white px-3 py-1 bg-[#0055c9] rounded-full shadow-sm" onClick={() => setIsShareModalOpen(true)}>Generate Link</button>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleShareButtonClick}
                        className="w-full bg-gradient-to-r from-[#0055c9] to-[#036cfb] text-white py-4 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                        <Share2 className="w-5 h-5" />
                        Share Records
                    </button>
                    <div className="flex bg-[#edeeef] p-1 rounded-full">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#0055c9]' : 'font-semibold text-[#414754] hover:text-[#191c1d]'}`}>List</button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-[#0055c9]' : 'font-semibold text-[#414754] hover:text-[#191c1d]'}`}>Timeline</button>
                    </div>
                </div>
            </section>
            
            {/* Filters Section */}
            {viewMode === 'list' && (
              <section className="mb-8 space-y-4">
                  <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717786]" />
                      <input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#0055c9]/20 text-sm font-medium transition-all placeholder:text-[#717786]"
                          placeholder="Quick Search" type="text" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                          <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full pl-4 pr-10 py-3 bg-white/50 backdrop-blur-sm border-none rounded-lg text-sm font-semibold appearance-none focus:ring-2 focus:ring-[#0055c9]/20 relative z-10 w-full overflow-hidden text-ellipsis">
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717786] pointer-events-none z-20 rotate-90" />
                      </div>
                      <div className="relative">
                          <input 
                              type="date" 
                              value={startDate} 
                              onChange={(e) => setStartDate(e.target.value)} 
                              className="w-full pl-4 pr-2 py-3 bg-white/50 backdrop-blur-sm border-none rounded-lg text-[11px] font-semibold focus:ring-2 focus:ring-[#0055c9]/20 text-[#414754]" 
                          />
                      </div>
                  </div>
              </section>
            )}

            {/* Records List or Timeline */}
            {viewMode === 'list' ? (
              <section className="space-y-4">
                  {filteredRecords.map((record) => {
                      const style = getMobileCategoryStyle(record.category)
                      const isPending = (record.status || '').toLowerCase() === 'pending'
                      
                      return (
                          <div
                              key={record._id || record.id}
                              onClick={() => {
                                if (isSharingMode) toggleShareSelection(record._id || record.id)
                                else navigate(`/records/${record._id || record.id}`)
                              }}
                              className={`bg-white/70 backdrop-blur-md border border-white/30 p-5 rounded-lg flex items-start gap-4 relative shadow-sm group hover:shadow-md transition-shadow cursor-pointer ${isSharingMode && selectedShareIds.includes(record._id || record.id) ? 'ring-2 ring-[#0055c9] bg-[#0055c9]/5' : ''}`}>
                              
                              <div className={`w-12 h-12 rounded-full ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
                                  {isSharingMode && selectedShareIds.includes(record._id || record.id) ? (
                                     <CheckSquare className="w-6 h-6 text-[#0055c9]" />
                                  ) : style.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                      <h3 className="font-bold text-[#191c1d] truncate pr-12">{record.category ? record.category.toUpperCase().replace(/_/g, ' ') : 'CUSTOM'}</h3>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPending ? 'bg-[#e1e3e4] text-[#414754]' : 'bg-[#67fcc6]/50 text-[#007354]'}`}>
                                          {isPending ? 'Pending' : 'Completed'}
                                      </span>
                                  </div>
                                  <p className="text-sm text-[#414754] font-medium truncate">{record.doctorName || 'General Consultation'}</p>
                                  <p className="text-xs text-[#717786] mt-1 flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {new Date(record.visitDate || record.date || Date.now()).toLocaleDateString('en-GB')}
                                  </p>
                              </div>
                              <div className="flex items-center gap-3 absolute right-5 top-1/2 -translate-y-1/2">
                                  {!isSharingMode && (
                                      <button 
                                          onClick={(e) => handleDelete(e, record._id || record.id)}
                                          className="text-[#717786] hover:text-[#ba1a1a] transition-colors z-10 p-1">
                                          <Trash2 className="w-5 h-5" />
                                      </button>
                                  )}
                                  <ChevronRight className="w-5 h-5 text-[#717786]" />
                              </div>
                          </div>
                      )
                  })}
                  {loading && <div className="text-center py-10"><LoadingSpinner className="mx-auto w-8 h-8 text-[#0055c9]" /></div>}
                  {!loading && filteredRecords.length === 0 && (
                      <div className="text-center py-10 text-[#717786]">
                          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="font-medium text-sm">No records found</p>
                      </div>
                  )}
              </section>
            ) : (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30">
                  <TimelineView records={filteredRecords} />
              </div>
            )}
        </main>
        
        {/* BottomNavBar */}
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

        {/* Floating Action Button */}
        <button
            onClick={() => navigate('/upload')}
            className="fixed bottom-32 right-5 w-14 h-14 rounded-full bg-[#036cfb] text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40">
            <Plus className="w-8 h-8 font-bold" />
        </button>
    </div>
    </>
  )
}

export default Records