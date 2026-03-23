// === frontend/src/pages/Records.tsx ===

import React, { useState, useEffect } from 'react'
import { 
  Card, Badge, Button, Pagination, LoadingSpinner, ErrorMessage, TimelineView 
} from '../components'
import { 
  ArrowLeft, Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, List, Layout, FileText, Stethoscope, X, SlidersHorizontal
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRecordStore } from '../store/recordStore'
import { deleteRecord } from '../services/api'

const Records: React.FC = () => {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [showFilters, setShowFilters] = useState(false)
  
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

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Your Records</h1>
            <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest hidden sm:block">Medical History Archive</p>
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
          </div>
        </div>

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
                      className="p-4 sm:p-6 hover:shadow-2xl transition-all duration-500 cursor-pointer border-none shadow-lg ring-1 ring-black/[0.03] group relative overflow-hidden active:scale-[0.98]" 
                      onClick={() => navigate(`/records/${record._id || record.id}`)}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-6 min-w-0">
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
                          <button 
                            className="p-2 text-gray-200 hover:text-red-500 transition-all rounded-full hover:bg-red-50 active:scale-90"
                            onClick={(e) => handleDelete(e, record._id || record.id)}
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <div className="p-1 sm:p-2">
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
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
    </div>
  )
}

export default Records