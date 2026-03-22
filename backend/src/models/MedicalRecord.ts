// === backend/src/models/MedicalRecord.ts ===

import mongoose, { Document, Schema, Types } from 'mongoose'
import { MEDICAL_CATEGORIES, STATUS_VALUES } from '../utils/constants'
import { getFieldInfo, parseNumericValue } from '../utils/metrics'
import { validateMedicalRecord } from '../utils/validators'

// Define the MedicalRecord interface
export interface IMedicalRecord extends Document {
  category: string
  uploadDate: Date
  imagePath?: string
  publicId?: string
  fileName?: string
  fileSize?: number
  extractedData: {
    fields: Record<string, any>
    confidence: number
    extractedAt: Date
    method: string
  }
  manualData: Record<string, any>
  displayData: Record<string, any>
  notes: string
  aiFindings: string
  aiNotes: string
  doctorName: string
  hospitalName: string
  visitDate: Date
  status: string
  isShared: string[]
  createdAt: Date
  updatedAt: Date
  validateData(): boolean
  extractMetrics(): Promise<any[]>
  syncMetrics(): Promise<void>
  updateDisplayData(newData: Record<string, any>): Promise<IMedicalRecord>
  shareWithDoctor(doctorEmail: string, categories?: string[], expirationDays?: number): Promise<string>
}

// Define the MedicalRecord schema
const medicalRecordSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      enum: MEDICAL_CATEGORIES,
      default: 'custom'
    },
    uploadDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    imagePath: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    publicId: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    fileName: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    fileSize: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    extractedData: {
      type: {
        fields: {
          type: Object,
          default: {}
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
          default: 0
        },
        extractedAt: {
          type: Date,
          default: Date.now
        },
        method: {
          type: String,
          enum: ['tesseract', 'google_vision', 'ocr', 'ai'],
          default: 'ocr'
        }
      },
      default: {}
    },
    manualData: {
      type: Object,
      default: {}
    },
    displayData: {
      type: Object,
      default: {}
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    aiFindings: {
      type: String,
      trim: true,
      default: ''
    },
    aiNotes: {
      type: String,
      trim: true,
      default: ''
    },
    doctorName: {
      type: String,
      trim: true,
      default: ''
    },
    hospitalName: {
      type: String,
      trim: true,
      default: ''
    },
    visitDate: {
      type: Date,
      validate: {
        validator: (value: Date) => value <= new Date(Date.now() + 24 * 60 * 60 * 1000),
        message: 'Visit date must be in the past'
      }
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'Active'
    },
    isShared: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

// Create indexes
medicalRecordSchema.index({ category: 1 })
medicalRecordSchema.index({ uploadDate: -1 })
medicalRecordSchema.index({ status: 1 })
medicalRecordSchema.index({ createdAt: -1 })

// Static methods
medicalRecordSchema.statics.findByCategory = async function(
  category: string,
  options: { limit?: number; skip?: number } = {}
): Promise<IMedicalRecord[]> {
  const { limit = 20, skip = 0 } = options

  const query: any = { category }

  return this.find(query)
    .sort({ uploadDate: -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

medicalRecordSchema.statics.search = async function(
  query: string,
  options: { limit?: number; skip?: number } = {}
): Promise<IMedicalRecord[]> {
  const { limit = 20, skip = 0 } = options

  const searchQuery = new RegExp(query, 'i')
  return this.find({
    $or: [
      { doctorName: searchQuery },
      { hospitalName: searchQuery },
      { notes: searchQuery }
    ]
  })
  .sort({ date: -1 })
  .skip(skip)
  .limit(limit)
  .exec()
}

// Instance methods
medicalRecordSchema.methods.extractMetrics = async function(this: IMedicalRecord): Promise<any[]> {
  const metrics: any[] = []

  // Iterate over all fields in displayData
  for (const [key, value] of Object.entries(this.displayData || {})) {
    const numericValue = parseNumericValue(value)
    if (numericValue === null) continue

    const field = key.toLowerCase().replace(/ /g, '_')
    let metricName = field
    let category = this.category

    if (field.includes('fasting')) metricName = 'fasting'
    else if (field.includes('post') && field.includes('meal')) metricName = 'post_meal'
    else if (field.includes('random')) metricName = 'random'
    else if (field.includes('hba1c')) metricName = 'hba1c'

    if (['fasting', 'post_meal', 'random', 'hba1c'].includes(metricName) || 
        field.includes('sugar') || field.includes('glucose')) {
      category = 'blood_sugar'
    }

    const fieldInfo = getFieldInfo(category, metricName, numericValue)
    
    if (fieldInfo && fieldInfo.unit) {
      metrics.push({
        category: category,
        metricName: metricName,
        value: numericValue,
        unit: fieldInfo.unit
      })
    }
  }

  return metrics
}

/**
 * Synchronize metrics for this record with the ExtractedMetric collection
 */
medicalRecordSchema.methods.syncMetrics = async function(this: IMedicalRecord): Promise<void> {
  try {
    const ExtractedMetric = mongoose.model('ExtractedMetric')
    
    // Only sync if status is Completed
    if (this.status !== 'Completed') {
      await ExtractedMetric.deleteMany({ recordId: this._id.toString() }).exec()
      return
    }

    // Extract raw metrics from displayData
    const rawMetrics = await this.extractMetrics()
    
    // Enrich with metadata and required fields
    const formattedMetrics = rawMetrics.map((m: any) => {
      const fieldInfo = getFieldInfo(m.category, m.metricName, m.value)
      return {
        ...m,
        recordId: this._id.toString(),
        unit: fieldInfo.unit || m.unit,
        normalMin: fieldInfo.normalMin,
        normalMax: fieldInfo.normalMax,
        status: fieldInfo.status,
        measuredDate: this.visitDate || this.uploadDate || new Date()
      }
    })

    // Update database (delete old, insert new)
    await ExtractedMetric.deleteMany({ recordId: this._id.toString() }).exec()
    
    if (formattedMetrics.length > 0) {
      await ExtractedMetric.insertMany(formattedMetrics)
    }
    
    console.log(`[Sync] Metrics synchronized for record: ${this._id} (${formattedMetrics.length} metrics)`)
  } catch (error) {
    console.error(`[Sync] Failed to synchronize metrics for record: ${this._id}`, error)
  }
}

medicalRecordSchema.methods.validateData = function(this: IMedicalRecord): boolean {
  const validation = validateMedicalRecord(this.category, this.displayData)
  if (!validation.valid) {
    console.warn('Medical record validation failed:', validation.errors)
  }
  return validation.valid
}

medicalRecordSchema.methods.updateDisplayData = async function(
  newData: Record<string, any>
): Promise<IMedicalRecord> {
  // Merge new data with existing data
  this.displayData = { ...this.displayData, ...newData }

  // Validate the new data
  if (!this.validateData()) {
    throw new Error('Invalid medical record data')
  }

  return this.save()
}

medicalRecordSchema.methods.shareWithDoctor = async function(
  doctorEmail: string,
  categories: string[] = [],
  expirationDays: number = 30
): Promise<string> {
  const DoctorAccess = require('./DoctorAccess').default

  // Create a new doctor access record
  const doctorAccess = new DoctorAccess({
    doctorEmail,
    doctorName: '', // Will be filled in later
    shareToken: Math.random().toString(36).substring(7),
    categories: categories.length > 0 ? categories : [this.category],
    recordIds: [this._id.toString()],
    expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
    accessType: 'view_only',
    notes: ''
  })

  await doctorAccess.save()

  // Add to isShared array
  if (!this.isShared.includes(doctorAccess._id.toString())) {
    this.isShared.push(doctorAccess._id.toString())
    await this.save()
  }

  return doctorAccess.shareToken
}

// Pre-save hook to validate data
medicalRecordSchema.pre<IMedicalRecord>('save', function(next) {
  // If status is Pending, we might not have all data yet (e.g., initial upload)
  if (this.status === 'Pending') {
    return next()
  }
  
  // Validate the display data for all other statuses
  if (typeof this.validateData === 'function' && !this.validateData()) {
    const err = new Error('Invalid medical record data')
    return next(err)
  }
  next()
})

// Post-save hook to trigger metric synchronization
medicalRecordSchema.post<IMedicalRecord>('save', async function(doc) {
  await doc.syncMetrics()
})

// Post-remove/deleteOne hooks to cleanup metrics
const cleanupMetrics = async function(this: any, doc: any) {
  let id: any = null
  
  if (doc && doc._id) {
    id = doc._id
  } else if (this && typeof this.getFilter === 'function') {
    const filter = this.getFilter()
    id = filter._id || filter.id
  } else if (this && this._id) {
    id = this._id
  }

  if (id) {
    try {
      const ExtractedMetric = mongoose.model('ExtractedMetric')
      const result = await ExtractedMetric.deleteMany({ recordId: id.toString() }).exec()
      console.log(`[Sync] Cleanup: Deleted ${result.deletedCount} metrics for record: ${id}`)
    } catch (error) {
      console.error(`[Sync] Cleanup failed for record: ${id}`, error)
    }
  } else {
    console.warn('[Sync] Cleanup: No record ID found in hook context', { doc, filter: this?.getFilter?.() })
  }
}

medicalRecordSchema.post<IMedicalRecord>('deleteOne', { document: true, query: true }, cleanupMetrics)
medicalRecordSchema.post<IMedicalRecord>('findOneAndDelete', cleanupMetrics)

// Export the model
export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema)
export default MedicalRecord