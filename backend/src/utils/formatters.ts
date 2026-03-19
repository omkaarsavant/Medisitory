// === backend/src/utils/formatters.ts ===

// Formatting utilities for medical data

// Format blood sugar values
export const formatBloodSugar = (value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): string => {
  if (unit === 'mmol/L') {
    const mmolValue = value / 18
    return `${mmolValue.toFixed(1)} mmol/L`
  }
  return `${value} mg/dL`
}

// Format blood pressure values
export const formatBloodPressure = (systolic: number, diastolic: number): string => {
  return `${systolic}/${diastolic} mmHg`
}

// Format cholesterol values
export const formatCholesterol = (value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): string => {
  if (unit === 'mmol/L') {
    const mmolValue = value / 38.67
    return `${mmolValue.toFixed(2)} mmol/L`
  }
  return `${value} mg/dL`
}

// Format thyroid values
export const formatThyroid = (value: number, type: 'TSH' | 'T3' | 'T4'): string => {
  switch (type) {
    case 'TSH':
      return `${value.toFixed(2)} mIU/L`
    case 'T3':
      return `${value.toFixed(1)} ng/dL`
    case 'T4':
      return `${value.toFixed(1)} mcg/dL`
    default:
      return `${value}`
  }
}

// Format dates for display
export const formatDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date

  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } else {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }
}

// Format timestamps
export const formatTimestamp = (timestamp: Date | string): string => {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format durations
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Format file sizes
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// Format medical categories for display
export const formatCategory = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'blood_sugar': 'Blood Sugar',
    'bp': 'Blood Pressure',
    'opd': 'OPD Visit',
    'cholesterol': 'Cholesterol',
    'thyroid': 'Thyroid',
    'lab': 'Lab Results',
    'imaging': 'Imaging',
    'custom': 'Custom Category'
  }

  return categoryMap[category] || category
}

// Format medical record type for display
export const formatRecordType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Consultation': 'Consultation',
    'Diagnosis': 'Diagnosis',
    'Prescription': 'Prescription',
    'Lab Results': 'Lab Results',
    'Imaging': 'Imaging'
  }

  return typeMap[type] || type
}

// Format status for display
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Active': 'Active',
    'Archived': 'Archived',
    'Pending': 'Pending',
    'Completed': 'Completed',
    'Flagged': 'Flagged'
  }

  return statusMap[status] || status
}

// Format medical conditions for display
export const formatMedicalCondition = (condition: string): string => {
  return condition.charAt(0).toUpperCase() + condition.slice(1).toLowerCase()
}

// Format patient names
export const formatPatientName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim()
}

// Format doctor names
export const formatDoctorName = (firstName: string, lastName: string): string => {
  return `Dr. ${firstName} ${lastName}`.trim()
}

// Format address
export const formatAddress = (address: string, city: string, state: string, pincode: string): string => {
  return [address, city, state, pincode].filter(Boolean).join(', ')
}

// Format phone numbers
export const formatPhone = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    // Format as +1 (XXX) XXX-XXXX
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return phone
}

// Format age
export const formatAge = (age: number): string => {
  return `${age} year${age !== 1 ? 's' : ''}`
}

// Format gender
export const formatGender = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'Male': 'Male',
    'Female': 'Female',
    'Other': 'Other'
  }

  return genderMap[gender] || gender
}

// Format medical notes for display
export const formatMedicalNotes = (notes: string): string => {
  if (!notes) return 'No notes available'

  // Replace newlines with HTML line breaks for display
  return notes.replace(/\n/g, '<br>')
}

// Format confidence scores
export const formatConfidence = (confidence: number): string => {
  if (confidence >= 0.95) return 'High'
  if (confidence >= 0.75) return 'Medium'
  if (confidence >= 0.50) return 'Low'
  return 'Very Low'
}

// Format percentages
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

// Format trends
export const formatTrend = (change: number): string => {
  if (change > 0.05) return 'Increasing'
  if (change < -0.05) return 'Decreasing'
  return 'Stable'
}

// Format medical alerts
export const formatAlert = (alert: string): string => {
  const alertMap: Record<string, string> = {
    'high_blood_sugar': 'High blood sugar detected',
    'low_blood_sugar': 'Low blood sugar detected',
    'high_blood_pressure': 'High blood pressure detected',
    'abnormal_lab': 'Abnormal lab results',
    'medication_reminder': 'Medication reminder',
    'upcoming_appointment': 'Upcoming appointment'
  }

  return alertMap[alert] || alert
}

// Format time since
export const formatTimeSince = (date: Date | string): string => {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - then.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years} year${years !== 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  return 'Just now'
}