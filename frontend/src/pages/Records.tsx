import React, { useState, useEffect } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Pagination from '../components/Pagination'
import { ArrowLeft, Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRecordStore } from '../store/recordStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { deleteRecord } from '../services/api'

const Records: React.FC = () => {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { records, fetchRecords, setFilters, filters, loading, error, totalPages } = useRecordStore()

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
    setFilters({
      category: selectedCategory === 'All' ? '' : selectedCategory.toLowerCase().replace(/ /g, '_'),
      startDate,
      endDate,
      page: currentPage,
      limit: 5
    })
    fetchRecords()
  }, [selectedCategory, startDate, endDate, currentPage])

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === '' ||
      (record.doctor?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.hospital?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
    <div className="flex h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Medical Records</h1>

        {/* Filters */}
        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Category filter"
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
                  placeholder="Start date"
                  aria-label="Start date filter"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End date"
                  aria-label="End date filter"
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
                aria-label="Search filter"
              />
            </div>

            {/* Clear Button */}
            <div className="flex items-end">
              <Button onClick={handleFiltersClear} variant="outline" className="w-full">
                Clear
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <LoadingSpinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading records...</p>
            </div>
          )}

          {error && (
            <ErrorMessage message={error} onRetry={() => {}} />
          )}

          {!loading && !error && filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">No records found matching your filters</p>
            </div>
          )}
        </Card>

        {/* Records List */}
        {filteredRecords.length > 0 && (
          <div className="space-y-4 mb-8">
            {filteredRecords.map((record) => (
              <Card 
                key={record._id || record.id} 
                className="p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer" 
                onClick={() => navigate(`/records/${record._id || record.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {record.category} - {record.patientName || 'Unknown'}
                        </h4>
                        <Badge color={['completed', 'active', 'processed'].includes(record.status.toLowerCase()) ? "green" : record.status.toLowerCase() === "pending" ? "yellow" : "red"}>
                          {record.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{record.date}</p>
                      <p className="text-sm font-medium text-gray-900">{record.doctor}</p>
                      <p className="text-xs text-gray-500">{record.hospital}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <button 
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 mb-2"
                      onClick={(e) => handleDelete(e, record._id || record.id)}
                      title="Delete Record"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/records/${record._id || record.id}`);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>
    </div>
  )
}

export default Records