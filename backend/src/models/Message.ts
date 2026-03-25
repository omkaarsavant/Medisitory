// === backend/src/models/Message.ts ===

import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  shareToken: string
  senderId: string // 'patient' or 'doctor'
  senderName: string
  content: string
  contextRecordId?: string // Optional link to a shared medical record
  timestamp: Date
  readAt?: Date
  createdAt: Date
  updatedAt: Date
}

const messageSchema: Schema<IMessage> = new Schema(
  {
    shareToken: {
      type: String,
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true,
      enum: ['patient', 'doctor', 'system']
    },
    senderName: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    contextRecordId: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IMessage>('Message', messageSchema)
