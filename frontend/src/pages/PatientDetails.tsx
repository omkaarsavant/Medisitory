// === frontend/src/pages/PatientDetails.tsx ===

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, FileText, Calendar, MapPin, Phone, Mail, Edit } from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'

interface Patient {
  id: number
  name: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  condition: string
  lastVisit: string
  status: 'Active' | 'Inactive' | 'Pending'
  address: string
  phone: string
  email: string
  emergencyContact: string
  medicalHistory: string[]
  allergies: string[]
  medications: string[]
}

const PatientDetails: React.FC = () => {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mock data - replace with API calls
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300))

        const mockData: Patient = {
          id: 1,
          name: 'John Doe',
          age: 45,
          gender: 'Male',
          condition: 'Diabetes',
          lastVisit: '2023-03-15',
          status: 'Active',
          address: '123 Main St, Springfield, IL 62701',
          phone: '+1 (555) 123-4567',
          email: 'john.doe@example.com',
          emergencyContact: 'Jane Doe (Spouse) - +1 (555) 987-6543',
          medicalHistory: ['Type 2 Diabetes (2015)', 'Hypertension (2018)', 'High Cholesterol (2020)'],
          allergies: ['Penicillin', 'Shellfish'],
          medications: ['Metformin 500mg', 'Lisinopril 10mg', 'Atorvastatin 20mg']
        }

        setPatient(mockData)
      } catch (err) {
        setError('Failed to load patient details')
        console.error('Error fetching patient:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Inactive': return 'gray'
      case 'Pending': return 'yellow'
      default: return 'gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Active': return 'Currently under care'
      case 'Inactive': return 'Not currently active'
      case 'Pending': return 'Awaiting confirmation'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <ErrorMessage message={error || 'Patient not found'} onRetry={() => window.location.reload()} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-600">
              {patient.age} y/o, {patient.gender} - {patient.condition}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge color={getStatusColor(patient.status)}>
            {patient.status}
          </Badge>
          <Button variant="outline" icon={<Edit className="w-4 h-4" />}>
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Patient Summary */}
      <Card className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Basic Information</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>Patient ID: #{patient.id}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Last Visit: {patient.lastVisit}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{patient.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{patient.email}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Emergency Contact</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{patient.emergencyContact}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Status</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 bg-${getStatusColor(patient.status)}-500 rounded-full`} />
              <span className="text-sm font-medium text-gray-900">
                {getStatusText(patient.status)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {patient.medicalHistory.length} conditions recorded
            </p>
          </div>
        </div>
      </Card>

      {/* Medical History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Medical History</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {patient.medicalHistory.map((history, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{history}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{index + 1} year ago</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Allergies and Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergies</h3>
          <div className="space-y-2">
            {patient.allergies.map((allergy, index) => (
              <Badge key={index} color="red" className="text-sm">
                {allergy}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Medications</h3>
          <div className="space-y-2">
            {patient.medications.map((medication, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{medication}</span>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <Button variant="primary" icon={<FileText className="w-4 h-4" />}>
          View Medical Records
        </Button>
        <Button variant="outline" icon={<Calendar className="w-4 h-4" />}>
          Schedule Appointment
        </Button>
        <Button variant="outline" icon={<MapPin className="w-4 h-4" />}>
          View Location
        </Button>
      </div>
    </div>
  )
}

export default PatientDetails