// === backend/src/models/Patient.ts ===

import mongoose, { Document, Schema, Types } from 'mongoose'
import { isValidEmail, isValidName, isValidPhone, isValidAddress } from '../utils/validators'

// Define the Patient interface
export interface IPatient extends Document {
  email: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  profileImage: string
  createdAt: Date
  updatedAt: Date
  preferences: {
    normalRanges: Record<string, any>
  }
}

// Define the Patient schema
const patientSchema: Schema<IPatient> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: isValidEmail,
        message: 'Invalid email address'
      }
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidName,
        message: 'First name must be between 2 and 100 characters'
      }
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidName,
        message: 'Last name must be between 2 and 100 characters'
      }
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: (value: Date) => value < new Date(),
        message: 'Date of birth must be in the past'
      }
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidPhone,
        message: 'Invalid phone number'
      }
    },
    address: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidAddress,
        message: 'Invalid address'
      }
    },
    city: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => value.length >= 2 && value.length <= 100,
        message: 'City must be between 2 and 100 characters'
      }
    },
    state: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => value.length >= 2 && value.length <= 100,
        message: 'State must be between 2 and 100 characters'
      }
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => /^×{6}$/.test(value),
        message: 'Pincode must be 6 digits'
      }
    },
    profileImage: {
      type: String,
      trim: true,
      default: ''
    },
    preferences: {
      type: {
        normalRanges: {
          type: Object,
          default: {}
        }
      },
      default: {}
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

// Create indexes
patientSchema.index({ email: 1 }, { unique: true })
patientSchema.index({ lastName: 1, firstName: 1 })
patientSchema.index({ createdAt: -1 })

// Virtual properties
patientSchema.virtual('fullName').get(function(this: IPatient) {
  return `${this.firstName} ${this.lastName}`
})

patientSchema.virtual('age').get(function(this: IPatient) {
  const today = new Date()
  const birthDate = new Date(this.dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
})

// Static methods
patientSchema.statics.findByEmail = async function(email: string): Promise<IPatient | null> {
  return this.findOne({ email }).exec()
}

patientSchema.statics.search = async function(
  query: string,
  options: { limit?: number; skip?: number } = {}
): Promise<IPatient[]> {
  const { limit = 20, skip = 0 } = options

  const searchQuery = new RegExp(query, 'i')
  return this.find({
    $or: [
      { firstName: searchQuery },
      { lastName: searchQuery },
      { email: searchQuery }
    ]
  })
  .sort({ lastName: 1, firstName: 1 })
  .skip(skip)
  .limit(limit)
  .exec()
}

// Instance methods
patientSchema.methods.getMedicalHistory = async function(this: IPatient): Promise<any[]> {
  const MedicalRecord = require('./MedicalRecord').default
  return MedicalRecord.find({ patientId: this._id })
    .sort({ date: -1 })
    .exec()
}

patientSchema.methods.getMetrics = async function(this: IPatient): Promise<any[]> {
  const ExtractedMetric = require('./ExtractedMetric').default
  return ExtractedMetric.find({ patientId: this._id })
    .sort({ measuredDate: -1 })
    .exec()
}

patientSchema.methods.updatePreferences = async function(
  preferences: Record<string, any>
): Promise<IPatient> {
  this.preferences = { ...this.preferences, ...preferences }
  return this.save()
}

// Export the model
export const Patient = mongoose.model<IPatient>('Patient', patientSchema)
export default Patient