// === backend/src/models/DoctorAccess.ts ===

import mongoose, { Document, Schema, Types } from 'mongoose'

// Define the DoctorAccess interface
export interface IDoctorAccess extends Document {
  patientId: string
  doctorEmail: string
  doctorName: string
  doctorUniqueId?: string
  shareToken: string
  categories: string[]
  recordIds: string[]
  expiresAt: Date
  accessType: string
  notes: string
  accessLog: Array<{
    timestamp: Date
    action: string
    ipAddress: string
  }>
  revokedAt: Date
  createdAt: Date
}

// Define the DoctorAccess schema
const doctorAccessSchema: Schema<IDoctorAccess> = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => value.match(/^[0-9a-fA-F]{24}$/),
        message: 'Invalid patient ID'
      }
    },
    doctorEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true // Allow empty
          return /^\S+@\S+\.\S+$/.test(v)
        },
        message: 'Invalid email address'
      }
    },
    doctorName: {
      type: String,
      trim: true,
      default: ''
    },
    doctorUniqueId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    categories: {
      type: [String],
      default: []
    },
    recordIds: {
      type: [String],
      default: []
    },
    expiresAt: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: any, value: Date) {
          // Only validate on new documents, not existing ones
          if (this.isNew) {
            return value > new Date()
          }
          return true
        },
        message: 'Expiration date must be in the future'
      }
    },
    accessType: {
      type: String,
      enum: ['view_only', 'view_with_notes'],
      default: 'view_only'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    accessLog: [
      {
        timestamp: {
          type: Date,
          default: Date.now
        },
        action: {
          type: String,
          enum: ['view', 'download', 'note', 'share', 'revoke'],
          required: true
        },
        ipAddress: {
          type: String,
          required: true
        }
      }
    ],
    revokedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

// Create indexes
doctorAccessSchema.index({ patientId: 1 })
doctorAccessSchema.index({ doctorEmail: 1 })
doctorAccessSchema.index({ expiresAt: 1 })
doctorAccessSchema.index({ revokedAt: 1 })
doctorAccessSchema.index({ shareToken: 1 }, { unique: true })

// Virtual properties
doctorAccessSchema.virtual('patient', {
  ref: 'Patient',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true
})

// Static methods
doctorAccessSchema.statics.findByToken = async function(
  shareToken: string
): Promise<IDoctorAccess | null> {
  return this.findOne({ shareToken, revokedAt: null, expiresAt: { $gt: new Date() } })
  .exec()
}

doctorAccessSchema.statics.findByPatient = async function(
  patientId: string
): Promise<IDoctorAccess[]> {
  return this.find({ patientId, revokedAt: null })
    .sort({ createdAt: -1 })
    .exec()
}

doctorAccessSchema.statics.findByDoctor = async function(
  doctorEmail: string
): Promise<IDoctorAccess[]> {
  return this.find({ doctorEmail, revokedAt: null })
    .sort({ createdAt: -1 })
    .exec()
}

doctorAccessSchema.statics.getActiveShares = async function(): Promise<IDoctorAccess[]> {
  return this.find({
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .exec()
}

// Instance methods
doctorAccessSchema.methods.isValid = function(this: IDoctorAccess): boolean {
  const now = new Date()
  return !this.revokedAt && this.expiresAt > now
}

doctorAccessSchema.methods.canAccessCategory = function(
  category: string
): boolean {
  if (this.categories.length === 0) return true // No restrictions
  return this.categories.includes(category)
}

doctorAccessSchema.methods.canAccessRecord = function(
  recordId: string
): boolean {
  if (this.recordIds.length === 0) return true // No restrictions
  return this.recordIds.includes(recordId)
}

doctorAccessSchema.methods.logAccess = async function(
  action: string,
  ipAddress: string
): Promise<IDoctorAccess> {
  this.accessLog.push({
    timestamp: new Date(),
    action,
    ipAddress
  })

  // Limit access log to last 100 entries
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100)
  }

  return this.save()
}

doctorAccessSchema.methods.revoke = async function(
  reason: string = ''
): Promise<IDoctorAccess> {
  this.revokedAt = new Date()
  this.notes = `${this.notes || ''} [Revoked: ${reason || 'No reason given'}]`
  return this.save()
}

doctorAccessSchema.methods.extendExpiration = async function(
  days: number
): Promise<IDoctorAccess> {
  const newExpiration = new Date(this.expiresAt.getTime())
  newExpiration.setDate(newExpiration.getDate() + days)
  this.expiresAt = newExpiration
  return this.save()
}

doctorAccessSchema.methods.addNote = async function(
  note: string,
  doctorName: string
): Promise<IDoctorAccess> {
  this.notes = `${this.notes || ''}
${new Date().toISOString()} - ${doctorName}: ${note}`
  await this.logAccess('note', 'internal')
  return this.save()
}

// Pre-save hook to validate token
doctorAccessSchema.pre('save', function(next) {
  if (!this.shareToken) {
    this.shareToken = Math.random().toString(36).substring(7)
  }

  // Ensure categories are valid
  const validCategories = ['blood_sugar', 'bp', 'opd', 'cholesterol', 'thyroid', 'lab', 'imaging', 'custom']
  this.categories = this.categories.filter(category => validCategories.includes(category))

  next()
})

// Export the model
export default mongoose.model<IDoctorAccess>('DoctorAccess', doctorAccessSchema)