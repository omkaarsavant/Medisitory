// === backend/src/models/DoctorRequest.ts ===

import mongoose, { Document, Schema } from 'mongoose'

export interface IDoctorRequest extends Document {
  doctorUniqueId: string
  patientId: string
  patientName: string
  status: 'Pending' | 'Accepted' | 'Rejected'
  respondedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const doctorRequestSchema: Schema<IDoctorRequest> = new Schema(
  {
    doctorUniqueId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    patientId: {
      type: String,
      required: true
    },
    patientName: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending'
    },
    respondedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

doctorRequestSchema.index({ doctorUniqueId: 1, status: 1 })
doctorRequestSchema.index({ patientId: 1 })

export default mongoose.model<IDoctorRequest>('DoctorRequest', doctorRequestSchema)
