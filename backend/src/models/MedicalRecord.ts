// === backend/src/models/MedicalRecord.ts ===

import mongoose, { Document, Schema, Types } from 'mongoose'
import { MEDICAL_CATEGORIES, STATUS_VALUES } from '../utils/constants'
import { validateMedicalRecord } from '../utils/validators'

// Define the MedicalRecord interface
export interface IMedicalRecord extends Document {
  patientId: string
  patientName: string
  category: string
  uploadDate: Date
  imagePath: string
  publicId: string
  fileName: string
  fileSize: number
  extractedData: {
    fields: Record<string, any>
    confidence: number
    extractedAt: Date
    method: string
  }
  manualData: Record<string, any>
  displayData: Record<string, any>
  notes: string
  doctorName: string
  hospitalName: string
  visitDate: Date
  status: string
  isShared: string[]
  createdAt: Date
  updatedAt: Date
  validateData(): boolean
  updateDisplayData(newData: Record<string, any>): Promise<IMedicalRecord>
  shareWithDoctor(doctorEmail: string, categories?: string[], expirationDays?: number): Promise<string>
}

// Define the MedicalRecord schema
const medicalRecordSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => /^[0-9a-fA-F]{24}$/.test(value),
        message: 'Invalid patient ID'
      }
    },
    patientName: {
      type: String,
      trim: true,
      default: ''
    },
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
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      required: true,
      trim: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0
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
        validator: (value: Date) => value <= new Date(),
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
medicalRecordSchema.index({ patientId: 1 })
medicalRecordSchema.index({ category: 1 })
medicalRecordSchema.index({ date: -1 })
medicalRecordSchema.index({ status: 1 })
medicalRecordSchema.index({ createdAt: -1 })

// Virtual properties
medicalRecordSchema.virtual('patient', {
  ref: 'Patient',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true
})

// Static methods
medicalRecordSchema.statics.findByPatient = async function(
  patientId: string,
  options: { limit?: number; skip?: number; status?: string } = {}
): Promise<IMedicalRecord[]> {
  const { limit = 20, skip = 0, status } = options

  const query: any = { patientId }
  if (status) query.status = status

  return this.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

medicalRecordSchema.statics.findByCategory = async function(
  category: string,
  options: { limit?: number; skip?: number; patientId?: string } = {}
): Promise<IMedicalRecord[]> {
  const { limit = 20, skip = 0, patientId } = options

  const query: any = { category }
  if (patientId) query.patientId = patientId

  return this.find(query)
    .sort({ date: -1 })
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
medicalRecordSchema.methods.getPatientInfo = async function(this: IMedicalRecord): Promise<any> {
  const Patient = require('./Patient').default
  return Patient.findById(this.patientId).exec()
}

medicalRecordSchema.methods.extractMetrics = async function(this: IMedicalRecord): Promise<any[]> {
  const ExtractedMetric = require('./ExtractedMetric').default

  // Extract metrics based on category
  const metrics: any[] = []

  switch (this.category) {
    case 'blood_sugar':
      if (this.displayData.fasting) {
        metrics.push({
          category: 'blood_sugar',
          metricName: 'fasting_sugar',
          value: this.displayData.fasting,
          unit: 'mg/dL',
          normalMin: 70,
          normalMax: 100,
          status: this.displayData.fasting >= 70 && this.displayData.fasting <= 100 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.post_meal) {
        metrics.push({
          category: 'blood_sugar',
          metricName: 'post_meal_sugar',
          value: this.displayData.post_meal,
          unit: 'mg/dL',
          normalMin: 70,
          normalMax: 140,
          status: this.displayData.post_meal >= 70 && this.displayData.post_meal <= 140 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.random) {
        metrics.push({
          category: 'blood_sugar',
          metricName: 'random_sugar',
          value: this.displayData.random,
          unit: 'mg/dL',
          normalMin: 70,
          normalMax: 140,
          status: this.displayData.random >= 70 && this.displayData.random <= 140 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.hba1c) {
        metrics.push({
          category: 'blood_sugar',
          metricName: 'hba1c',
          value: this.displayData.hba1c,
          unit: '%',
          normalMin: 4,
          normalMax: 5.6,
          status: this.displayData.hba1c >= 4 && this.displayData.hba1c <= 5.6 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      break

    case 'bp':
      if (this.displayData.systolic && this.displayData.diastolic) {
        metrics.push({
          category: 'bp',
          metricName: 'systolic_bp',
          value: this.displayData.systolic,
          unit: 'mmHg',
          normalMin: 90,
          normalMax: 120,
          status: this.displayData.systolic >= 90 && this.displayData.systolic <= 120 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
        metrics.push({
          category: 'bp',
          metricName: 'diastolic_bp',
          value: this.displayData.diastolic,
          unit: 'mmHg',
          normalMin: 60,
          normalMax: 80,
          status: this.displayData.diastolic >= 60 && this.displayData.diastolic <= 80 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.pulse) {
        metrics.push({
          category: 'bp',
          metricName: 'pulse',
          value: this.displayData.pulse,
          unit: 'bpm',
          normalMin: 60,
          normalMax: 100,
          status: this.displayData.pulse >= 60 && this.displayData.pulse <= 100 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      break

    case 'cholesterol':
      if (this.displayData.total) {
        metrics.push({
          category: 'cholesterol',
          metricName: 'total_cholesterol',
          value: this.displayData.total,
          unit: 'mg/dL',
          normalMin: 125,
          normalMax: 200,
          status: this.displayData.total >= 125 && this.displayData.total <= 200 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.ldl) {
        metrics.push({
          category: 'cholesterol',
          metricName: 'ldl',
          value: this.displayData.ldl,
          unit: 'mg/dL',
          normalMin: 50,
          normalMax: 130,
          status: this.displayData.ldl >= 50 && this.displayData.ldl <= 130 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.hdl) {
        metrics.push({
          category: 'cholesterol',
          metricName: 'hdl',
          value: this.displayData.hdl,
          unit: 'mg/dL',
          normalMin: 40,
          normalMax: 100,
          status: this.displayData.hdl >= 40 && this.displayData.hdl <= 100 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.triglycerides) {
        metrics.push({
          category: 'cholesterol',
          metricName: 'triglycerides',
          value: this.displayData.triglycerides,
          unit: 'mg/dL',
          normalMin: 50,
          normalMax: 150,
          status: this.displayData.triglycerides >= 50 && this.displayData.triglycerides <= 150 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      break

    case 'thyroid':
      if (this.displayData.tsh) {
        metrics.push({
          category: 'thyroid',
          metricName: 'tsh',
          value: this.displayData.tsh,
          unit: 'mIU/L',
          normalMin: 0.4,
          normalMax: 4.0,
          status: this.displayData.tsh >= 0.4 && this.displayData.tsh <= 4.0 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.t3) {
        metrics.push({
          category: 'thyroid',
          metricName: 't3',
          value: this.displayData.t3,
          unit: 'ng/dL',
          normalMin: 60,
          normalMax: 200,
          status: this.displayData.t3 >= 60 && this.displayData.t3 <= 200 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      if (this.displayData.t4) {
        metrics.push({
          category: 'thyroid',
          metricName: 't4',
          value: this.displayData.t4,
          unit: 'mcg/dL',
          normalMin: 4.5,
          normalMax: 12.5,
          status: this.displayData.t4 >= 4.5 && this.displayData.t4 <= 12.5 ? 'normal' : 'abnormal',
          measuredDate: this.visitDate || this.uploadDate
        })
      }
      break
  }

  return metrics
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
    patientId: this.patientId,
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

// Export the model
export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema)
export default MedicalRecord