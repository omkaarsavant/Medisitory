// === backend/src/utils/constants.ts ===

// Application constants and configuration

// Medical categories
export const MEDICAL_CATEGORIES = [
  'blood_sugar',
  'bp',
  'opd',
  'cholesterol',
  'thyroid',
  'lab',
  'imaging',
  'custom'
] as const

export type MedicalCategory = typeof MEDICAL_CATEGORIES[number]

// Medical record types
export const RECORD_TYPES = [
  'Consultation',
  'Diagnosis',
  'Prescription',
  'Lab Results',
  'Imaging'
] as const

export type RecordType = typeof RECORD_TYPES[number]

// Status values
export const STATUS_VALUES = [
  'Active',
  'Archived',
  'Pending',
  'Completed',
  'Flagged'
] as const

export type StatusValue = typeof STATUS_VALUES[number]

// Gender values
export const GENDER_VALUES = [
  'Male',
  'Female',
  'Other'
] as const

export type GenderValue = typeof GENDER_VALUES[number]

// Blood sugar units
export const BLOOD_SUGAR_UNITS = [
  'mg/dL',
  'mmol/L'
] as const

export type BloodSugarUnit = typeof BLOOD_SUGAR_UNITS[number]

// Blood pressure units
export const BLOOD_PRESSURE_UNITS = [
  'mmHg'
] as const

export type BloodPressureUnit = typeof BLOOD_PRESSURE_UNITS[number]

// Cholesterol units
export const CHOLESTEROL_UNITS = [
  'mg/dL',
  'mmol/L'
] as const

export type CholesterolUnit = typeof CHOLESTEROL_UNITS[number]

// Normal ranges for medical metrics
export const NORMAL_RANGES = {
  blood_sugar: {
    fasting: { min: 70, max: 100 },
    post_meal: { min: 70, max: 140 },
    random: { min: 70, max: 140 },
    hba1c: { min: 4, max: 5.6 }
  },
  bp: {
    systolic: { min: 90, max: 120 },
    diastolic: { min: 60, max: 80 },
    pulse: { min: 60, max: 100 }
  },
  cholesterol: {
    total: { min: 125, max: 200 },
    ldl: { min: 50, max: 130 },
    hdl: { min: 40, max: 100 },
    triglycerides: { min: 50, max: 150 }
  },
  thyroid: {
    tsh: { min: 0.4, max: 4.0 },
    t3: { min: 60, max: 200 },
    t4: { min: 4.5, max: 12.5 }
  }
} as const

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
}

// OCR configuration
export const OCR_CONFIG = {
  tesseract: {
    languages: ['eng', 'hin'], // English, Hindi
    timeout: 30000, // 30 seconds
    quality: 'high'
  },
  googleVision: {
    maxResults: 10,
    feature: 'DOCUMENT_TEXT_DETECTION' as const
  }
}

// Email configuration
export const EMAIL_CONFIG = {
  from: 'noreply@medvault.com',
  subjectPrefix: '[MedVault] ',
  maxRetries: 3,
  retryDelay: 30000 // 30 seconds
}

// API rate limiting
export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}

// Cache configuration
export const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  maxItems: 1000,
  cleanupInterval: 60000 // 1 minute
}

// Security configuration
export const SECURITY_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  bcryptSaltRounds: 12,
  maxLoginAttempts: 5,
  lockTime: 15 * 60 * 1000 // 15 minutes
}

// Database configuration
export const DATABASE_CONFIG = {
  connectionTimeout: 30000, // 30 seconds
  poolSize: 10,
  retryAttempts: 3,
  retryDelay: 5000 // 5 seconds
}

// Logging configuration
export const LOGGING_CONFIG = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  json: process.env.NODE_ENV === 'production'
}

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  timeout: 5000, // 5 seconds
  interval: 30000, // 30 seconds
  healthyThreshold: 2,
  unhealthyThreshold: 3
}

// File processing configuration
export const FILE_PROCESSING_CONFIG = {
  compressionQuality: 80,
  thumbnailSize: { width: 300, height: 300 },
  maxThumbnailSize: 100 * 1024, // 100KB
  tempDirectory: '/tmp/medvault',
  cleanupInterval: 3600000 // 1 hour
}

// Data retention policies
export const DATA_RETENTION_CONFIG = {
  records: {
    active: 365 * 24 * 60 * 60 * 1000, // 1 year
    archived: 5 * 365 * 24 * 60 * 60 * 1000 // 5 years
  },
  logs: {
    access: 90 * 24 * 60 * 60 * 1000, // 90 days
    error: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  tempFiles: {
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}

// Internationalization
export const I18N_CONFIG = {
  defaultLocale: 'en',
  supportedLocales: ['en', 'hi'],
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12-hour',
  currency: 'USD',
  temperatureUnit: 'F'
}

// Analytics configuration
export const ANALYTICS_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  samplingRate: 0.1, // 10% of requests
  maxBatchSize: 100,
  flushInterval: 60000 // 1 minute
}

// Error reporting
export const ERROR_REPORTING_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  maxReportsPerMinute: 60,
  ignoreNetworkErrors: true,
  includeRequestBody: false
}

// Performance monitoring
export const PERFORMANCE_CONFIG = {
  sampleRate: 0.05, // 5% of requests
  threshold: 2000, // 2 seconds
  metrics: ['responseTime', 'memoryUsage', 'cpuUsage']
}

// Feature flags
export const FEATURE_FLAGS = {
  authentication: false, // Phase 2
  realTimeUpdates: false,
  advancedAnalytics: false,
  mobileApp: false,
  telemedicine: false,
  prescriptionManagement: false
} as const

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    mongoUrl: 'mongodb://localhost:27017/medvault',
    port: 5000,
    frontendUrl: 'http://localhost:5173',
    logLevel: 'debug',
    cacheEnabled: false,
    rateLimitEnabled: false
  },
  production: {
    mongoUrl: process.env.MONGODB_URI || '',
    port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
    frontendUrl: process.env.FRONTEND_URL || '',
    logLevel: 'info',
    cacheEnabled: true,
    rateLimitEnabled: true
  }
}