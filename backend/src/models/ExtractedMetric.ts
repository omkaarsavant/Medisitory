// === backend/src/models/ExtractedMetric.ts ===

import mongoose, { Document, Schema, Types } from 'mongoose'
import { isValidBloodSugar, isValidCholesterol, isValidThyroid } from '../utils/validators'

// Define the ExtractedMetric interface
export interface IExtractedMetric extends Document {
  recordId: string
  category: string
  metricName: string
  value: number
  unit: string
  normalMin: number
  normalMax: number
  status: string
  measuredDate: Date
  createdAt: Date
  isNormal(): boolean
  getStatus(): string
  getAlertLevel(): string
}

// Define the ExtractedMetric schema
const extractedMetricSchema: Schema<IExtractedMetric> = new Schema(
  {
    recordId: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => /^[0-9a-fA-F]{24}$/.test(value),
        message: 'Invalid record ID'
      }
    },
    category: {
      type: String,
      required: true,
      enum: ['blood_sugar', 'bp', 'cholesterol', 'thyroid', 'lab', 'imaging', 'custom']
    },
    metricName: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    normalMin: {
      type: Number,
      required: true,
      min: 0
    },
    normalMax: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['normal', 'high', 'low', 'abnormal'],
      default: 'normal'
    },
    measuredDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

// Create indexes
extractedMetricSchema.index({ category: 1 })
extractedMetricSchema.index({ metricName: 1 })
extractedMetricSchema.index({ measuredDate: -1 })
extractedMetricSchema.index({ value: 1 })

// Static methods
extractedMetricSchema.statics.findByCategory = async function(
  category: string,
  options: { limit?: number; skip?: number } = {}
): Promise<IExtractedMetric[]> {
  const { limit = 20, skip = 0 } = options

  const query: any = { category }

  return this.find(query)
    .sort({ measuredDate: -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

extractedMetricSchema.statics.getTrend = async function(
  metricName: string,
  dateRange: { start: Date; end: Date }
): Promise<IExtractedMetric[]> {
  return this.find({
    metricName,
    measuredDate: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  })
  .sort({ measuredDate: 1 })
  .exec()
}

extractedMetricSchema.statics.getSummary = async function(
  dateRange: { start: Date; end: Date }
): Promise<any> {
  const pipeline = [
    {
      $match: {
        measuredDate: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        average: { $avg: '$value' },
        min: { $min: '$value' },
        max: { $max: '$value' },
        latest: { $last: '$$ROOT' }
      }
    },
    {
      $lookup: {
        from: 'medicalRecords',
        localField: 'latest.recordId',
        foreignField: '_id',
        as: 'latestRecord'
      }
    },
    {
      $addFields: {
        latestRecord: { $arrayElemAt: ['$latestRecord', 0] }
      }
    }
  ]

  return this.aggregate(pipeline).exec()
}

// Instance methods
extractedMetricSchema.methods.getRecordInfo = async function(this: IExtractedMetric): Promise<any> {
  const MedicalRecord = require('./MedicalRecord').default
  return MedicalRecord.findById(this.recordId).exec()
}

extractedMetricSchema.methods.isNormal = function(this: IExtractedMetric): boolean {
  if (this.value >= this.normalMin && this.value <= this.normalMax) {
    return true
  }
  return false
}

extractedMetricSchema.methods.getStatus = function(this: IExtractedMetric): string {
  if (this.value >= this.normalMin && this.value <= this.normalMax) {
    return 'normal'
  } else if (this.value < this.normalMin) {
    return 'low'
  } else {
    return 'high'
  }
}

extractedMetricSchema.methods.getAlertLevel = function(this: IExtractedMetric): string {
  const deviation = Math.abs(this.value - (this.normalMin + this.normalMax) / 2)
  const range = this.normalMax - this.normalMin
  const percentageDeviation = deviation / range

  if (percentageDeviation > 0.5) {
    return 'critical'
  } else if (percentageDeviation > 0.25) {
    return 'warning'
  } else {
    return 'info'
  }
}

// Pre-save hook to validate data
extractedMetricSchema.pre('save', function(next) {
  // Validate based on category
  switch (this.category) {
    case 'blood_sugar':
      if (!isValidBloodSugar(this.value)) {
        const err = new Error('Invalid blood sugar value')
        return next(err)
      }
      break

    case 'bp':
      // For BP metrics, we validate in the context of systolic/diastolic pairs
      // This is handled when creating the metrics
      break

    case 'cholesterol':
      if (!isValidCholesterol(this.value)) {
        const err = new Error('Invalid cholesterol value')
        return next(err)
      }
      break

    case 'thyroid':
      if (!isValidThyroid(this.value)) {
        const err = new Error('Invalid thyroid value')
        return next(err)
      }
      break
  }

  // Set status
  this.status = this.getStatus()

  next()
})

// Export the model
export const ExtractedMetric = mongoose.model<IExtractedMetric>('ExtractedMetric', extractedMetricSchema)
export default ExtractedMetric