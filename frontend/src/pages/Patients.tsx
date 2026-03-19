// === frontend/src/pages/Patients.tsx ===

import React, { useState, useEffect } from 'react'
import { Search, Filter, PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Card, Table, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'

interface Patient {
  id: number
  name: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  condition: string
  lastVisit: string
  status: 'Active' | 'Inactive' | 'Pending'
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])

  // Mock data - replace with API calls
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))

        const mockData: Patient[] = [
          { id: 1, name: 'John Doe', age: 45, gender: 'Male', condition: 'Diabetes', lastVisit: '2023-03-15', status: 'Active' },
          { id: 2, name: 'Sarah Johnson', age: 32, gender: 'Female', condition: 'Hypertension', lastVisit: '2023-03-10', status: 'Active' },
          { id: 3, name: 'Michael Brown', age: 67, gender: 'Male', condition: 'Heart Disease', lastVisit: '2023-03-01', status: 'Active' },
          { id: 4, name: 'Emily Davis', age: 29, gender: 'Female', condition: 'Asthma', lastVisit: '2023-02-25', status: 'Pending' },
          { id: 5, name: 'David Wilson', age: 54, gender: 'Male', condition: 'Arthritis', lastVisit: '2023-02-20', status: 'Active' },
          { id: 6, name: 'Olivia Martinez', age: 38, gender: 'Female', condition: 'Obesity', lastVisit: '2023-02-15', status: 'Inactive' },
          { id: 7, name: 'James Anderson', age: 72, gender: 'Male', condition: 'Alzheimer\'s', lastVisit: '2023-02-10', status: 'Active' },
          { id: 8, name: 'Sophia Taylor', age: 41, gender: 'Female', condition: 'Depression', lastVisit: '2023-02-05', status: 'Active' }
        ]

        setPatients(mockData)
        setFilteredPatients(mockData)
      } catch (err) {
        setError('Failed to load patients')
        console.error('Error fetching patients:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)

    const filtered = patients.filter((patient) =>
      patient.name.toLowerCase().includes(term) ||
      patient.condition.toLowerCase().includes(term) ||
      patient.status.toLowerCase().includes(term)
    )
    setFilteredPatients(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Inactive': return 'gray'
      case 'Pending': return 'yellow'
      default: return 'gray'
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      setPatients(prev => prev.filter(p => p.id !== id))
      setFilteredPatients(prev => prev.filter(p => p.id !== id))
    }
  }

  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      Cell: ({ value, row }: any) => (
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 bg-${getStatusColor(row.original.status)}-500 rounded-full`} />
          <span>{value}</span>
        </div>
      )
    },
    {
      Header: 'Age',
      accessor: 'age'
    },
    {
      Header: 'Gender',
      accessor: 'gender'
    },
    {
      Header: 'Condition',
      accessor: 'condition'
    },
    {
      Header: 'Last Visit',
      accessor: 'lastVisit'
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ value }: any) => (
        <Badge color={getStatusColor(value)}>{value}</Badge>
      )
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => console.log('Edit patient:', row.original.id)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={() => window.location.reload()} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-gray-600">Manage patient records and medical history</p>
        </div>
        <Button
          onClick={() => console.log('Add new patient')}
          variant="primary"
          icon={<PlusCircle className="w-5 h-5" />}
        >
          Add Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" icon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
          <Badge color="blue">{filteredPatients.length} patients</Badge>
        </div>
      </div>

      {/* Patients Table */}
      <Card>
        <Table columns={columns} data={filteredPatients} />
      </Card>
    </div>
  )
}

export default Patients