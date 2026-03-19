// === backend/src/types/models.ts ===

/**
 * TypeScript interfaces for MedVault medical record system
 *
 * This file exports all TypeScript interfaces for the medical record system
 * models, providing type safety and consistency across the application.
 */

// Import necessary types
import { Types } from 'mongoose'

/**
 * Patient interface
 *
 * Defines the structure of a patient document in MongoDB
 */
export interface IPatient {
  // Basic patient information
  email: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string

  // Medical record information
  profileImage?: string // Cloudinary URL
  preferences: {
    normalRanges: {
      bloodSugar?: {
        fasting?: { min: number; max: number }
        postMeal?: { min: number; max: number }
      }
      bloodPressure?: {
        systolic?: { min: number; max: number }
        diastolic?: { min: number; max: number }
      }
      cholesterol?: {
        ldl?: { min: number; max: number }
        hdl?: { min: number; max: number }
        triglycerides?: { min: number; max: number }
      }
    }
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Methods
  getFullName(): string
  getAge(): number
  getProfileImage(): string
  isMinor(): boolean
  getAgeGroup(): string
}

/**
 * MedicalRecord interface
 *
 * Defines the structure of a medical record document in MongoDB
 */
export interface IMedicalRecord {
  // Core medical record information
  patientId: Types.ObjectId
  category: 'blood_sugar' | 'bp' | 'opd' | 'cholesterol' | 'thyroid' | 'custom'
  uploadDate: Date
  imagePath: string
  publicId: string
  fileName: string
  fileSize: number

  // Extracted data from document
  extractedData: {
    fields: Record<string, any>
    confidence: number
    extractedAt: Date
    method: 'ocr' | 'manual' | 'api'
  }

  // Manual data entry
  manualData: Record<string, any>

  // Display data for UI
  displayData: Record<string, any>

  // Additional information
  notes?: string
  doctorName?: string
  hospitalName?: string
  visitDate?: Date
  status: 'pending' | 'completed' | 'flagged'
  isShared: Types.ObjectId[]

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Methods
  getFullImagePath(): string
  isSharedWith(patientId: Types.ObjectId): boolean
  getAgeAtVisit(): number
  getDisplayData(): Record<string, any>
  hasMetric(metricName: string): boolean
  getMetric(metricName: string): any | null
  updateStatus(newStatus: 'pending' | 'completed' | 'flagged', notes?: string): Promise<IMedicalRecord>
  shareWith(patientId: Types.ObjectId): Promise<IMedicalRecord>
  unshareFrom(patientId: Types.ObjectId): Promise<IMedicalRecord>
}

/**
 * ExtractedMetric interface
 *
 * Defines the structure of an extracted metric document in MongoDB
 */
export interface IExtractedMetric {
  // Core metric information
  patientId: Types.ObjectId
  recordId: Types.ObjectId
  category: string
  metricName: string
  value: number
  unit: string
  normalMin: number
  normalMax: number
  status: 'normal' | 'high' | 'low'
  measuredDate: Date

  // Timestamps
  createdAt: Date

  // Methods
  getFormattedValue(): string
  getStatusDisplay(): string
  isWithinNormalRange(): boolean
  getSeverityLevel(): number
  getTrend(historicalValues: number[]): string
  getHealthAdvice(): string
}

/**
 * DoctorAccess interface
 *
 * Defines the structure of a doctor access document in MongoDB
 */
export interface IDoctorAccess {
  // Core access information
  patientId: Types.ObjectId
  doctorEmail: string
  doctorName: string
  shareToken: string
  categories: string[]
  recordIds: Types.ObjectId[]
  expiresAt: Date
  accessType: 'view_only' | 'view_with_notes'

  // Additional information
  notes?: string
  accessLog: Array<{
    timestamp: Date
    action: string
    ipAddress: string
    userAgent?: string
  }>
  revokedAt?: Date

  // Timestamps
  createdAt: Date

  // Methods
  isExpired(): boolean
  isRevoked(): boolean
  isActive(): boolean
  revokeAccess(): Promise<IDoctorAccess>
  logAccess(action: string, ipAddress: string, userAgent?: string): Promise<IDoctorAccess>
  canAccessRecord(recordId: Types.ObjectId): boolean
  getRemainingTime(): number
  getExpirationStatus(): string
  getAccessSummary(): {
    status: string
    remainingTime: number
    canAccessAll: boolean
    categories: string[]
    records: number
  }
}

/**
 * Utility types
 *
 * Additional types used throughout the medical record system
 */

// Blood sugar metrics
export interface IBloodSugarMetrics {
  fasting?: number
  postMeal?: number
  random?: number
  hba1c?: number
}

// Blood pressure metrics
export interface IBloodPressureMetrics {
  systolic?: number
  diastolic?: number
  pulse?: number
}

// Cholesterol metrics
export interface ICholesterolMetrics {
  total?: number
  ldl?: number
  hdl?: number
  triglycerides?: number
}

// Thyroid metrics
export interface IThyroidMetrics {
  tsh?: number
  t3?: number
  t4?: number
}

// Medical record statistics
export interface IMedicalRecordStats {
  totalRecords: number
  recordsByCategory: Record<string, number>
  recentRecords: IMedicalRecord[]
  averageConfidence: number
}

// Patient statistics
export interface IPatientStats {
  totalMetrics: number
  metricsByCategory: Record<string, number>
  recentMetrics: IExtractedMetric[]
  averageValueByCategory: Record<string, number>
}

// Share statistics
export interface IShareStats {
  totalShares: number
  activeShares: number
  expiredShares: number
  revokedShares: number
  sharesByCategory: Record<string, number>
}

// Access summary
export interface IAccessSummary {
  status: string
  remainingTime: number
  canAccessAll: boolean
  categories: string[]
  records: number
}

// Trend analysis
export interface ITrendAnalysis {
  trendingUp: IExtractedMetric[]
  trendingDown: IExtractedMetric[]
  stable: IExtractedMetric[]
}

// Display data for UI components
export interface IDisplayData {
  categoryName: string
  statusName: string
  confidencePercent: number
  visitDateFormatted?: string
  uploadDateFormatted?: string
  [key: string]: any
}

// Health advice
export interface IHealthAdvice {
  advice: string
  severity: 'info' | 'warning' | 'critical'
  recommendations: string[]
}

// Search results
export interface ISearchResult {
  patient?: IPatient
  records: IMedicalRecord[]
  metrics: IExtractedMetric[]
  access: IDoctorAccess[]
}

// Export all interfaces
export {
  IPatient,
  IMedicalRecord,
  IExtractedMetric,
  IDoctorAccess,
  IBloodSugarMetrics,
  IBloodPressureMetrics,
  ICholesterolMetrics,
  IThyroidMetrics,
  IMedicalRecordStats,
  IPatientStats,
  IShareStats,
  IAccessSummary,
  ITrendAnalysis,
  IDisplayData,
  IHealthAdvice,
  ISearchResult
}