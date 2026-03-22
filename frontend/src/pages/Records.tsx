import React, { useState, useEffect } from 'react'
import { 
  Card, Badge, Button, Pagination, LoadingSpinner, ErrorMessage, TimelineView 
} from '../components'
import { 
  ArrowLeft, Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, List, Layout, FileText, Stethoscope
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
    <div className="flex min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'timeline' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Timeline View</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar - Only in List View */}
        {viewMode === 'list' && (
          <Card className="mb-8 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Doctor name, hospital..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clear Button */}
              <div className="flex items-end">
                <Button onClick={handleFiltersClear} variant="outline" className="w-full">
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 mb-8 animate-in fade-in duration-500">
            <LoadingSpinner className="mx-auto mb-4 w-12 h-12 text-blue-600" />
            <p className="text-gray-600 font-black uppercase tracking-tighter italic">Compiling Medical History...</p>
          </div>
        )}

        {error && (
          <div className="mb-8">
            <ErrorMessage message={error} onRetry={() => viewMode === 'timeline' ? fetchAllRecords() : fetchRecords()} />
          </div>
        )}

        {!loading && !error && filteredRecords.length === 0 && (
          <Card className="text-center py-20 text-gray-400 mb-8 border-2 border-dashed border-gray-100 italic">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-sm font-black uppercase tracking-widest">No records discovered for these filters</p>
          </Card>
        )}

        {/* Records Display based on view mode */}
        {!loading && !error && filteredRecords.length > 0 && (
          <>
            {viewMode === 'list' ? (
              <>
                <div className="space-y-4 mb-8 animate-in slide-in-from-bottom-4 duration-500">
                  {filteredRecords.map((record) => (
                    <Card 
                      key={record._id || record.id} 
                      className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer border-transparent hover:border-blue-100 group" 
                      onClick={() => navigate(`/records/${record._id || record.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors shadow-inner">
                            <FileText className="w-8 h-8 text-gray-300 group-hover:text-blue-500" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
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
                              <Badge color={['completed', 'active', 'processed'].includes((record.status || '').toLowerCase()) ? "green" : (record.status || '').toLowerCase() === "pending" ? "yellow" : "red"} className="font-black italic px-3 py-0.5 text-[10px]">
                                {record.status || 'Active'}
                              </Badge>
                            </div>
                            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest space-x-4">
                              <span className="flex items-center space-x-1">
                                <Stethoscope className="w-3 h-3" />
                                <span>{record.doctorName || record.doctor || 'Unknown Doctor'}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{(() => {
                                  const raw = new Date(record.visitDate || record.uploadDate || record.date || record.createdAt || Date.now())
                                  const local = new Date(raw.getTime() + raw.getTimezoneOffset() * 60000)
                                  return local.toLocaleDateString('en-GB')
                                })()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-4">
                          <button 
                            className="p-2 text-gray-300 hover:text-red-500 transition-all rounded-full hover:bg-red-50"
                            onClick={(e) => handleDelete(e, record._id || record.id)}
                            title="Delete Record"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </>
            ) : (
              <TimelineView records={filteredRecords} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Records