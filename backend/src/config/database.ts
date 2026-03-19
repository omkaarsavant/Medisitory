// === backend/src/config/database.ts ===

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { DATABASE_CONFIG } from '../utils/constants'

dotenv.config()

// Database connection and configuration

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    // Create MongoDB connection string
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/medvault'

    // MongoDB connection options
    const options = {
      serverSelectionTimeoutMS: DATABASE_CONFIG.connectionTimeout || 5000,
      maxPoolSize: DATABASE_CONFIG.poolSize || 10,
      retryWrites: true,
      w: 'majority' as const
    }

    // Connect to MongoDB
    const connection = await mongoose.connect(mongoUrl, options)

    console.log('MongoDB connected successfully')
    console.log(`Database: ${connection.connection.db.databaseName}`)
    console.log(`Host: ${connection.connection.host}`)
    console.log(`Port: ${connection.connection.port}`)

    // Handle connection events
    connection.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err)
    })

    connection.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected')
    })

    connection.connection.on('reconnected', () => {
      console.log('MongoDB reconnected')
    })

    return connection
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    throw error
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect()
    console.log('MongoDB disconnected successfully')
  } catch (error) {
    console.error('MongoDB disconnection failed:', error)
    throw error
  }
}

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const adminDb = mongoose.connection.db.admin()
    const status = await adminDb.serverStatus()
    return status.ok === 1
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Database statistics
export const getDatabaseStats = async (): Promise<any> => {
  try {
    const adminDb = mongoose.connection.db.admin()
    return await adminDb.stats()
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return null
  }
}

// Collection statistics
export const getCollectionStats = async (collectionName: string): Promise<any> => {
  try {
    const collection = mongoose.connection.db.collection(collectionName)
    return await collection.stats()
  } catch (error) {
    console.error(`Failed to get stats for collection ${collectionName}:`, error)
    return null
  }
}

// Database utilities
export const createIndexes = async (): Promise<void> => {
  try {
    // Define indexes for collections
    const indexes = [
      {
        collection: 'patients',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { lastName: 1, firstName: 1 } },
          { key: { createdAt: -1 } }
        ]
      },
      {
        collection: 'medicalRecords',
        indexes: [
          { key: { patientId: 1 } },
          { key: { category: 1 } },
          { key: { date: -1 } },
          { key: { status: 1 } },
          { key: { createdAt: -1 } }
        ]
      },
      {
        collection: 'extractedMetrics',
        indexes: [
          { key: { patientId: 1 } },
          { key: { category: 1 } },
          { key: { metricName: 1 } },
          { key: { measuredDate: -1 } },
          { key: { value: 1 } }
        ]
      },
      {
        collection: 'doctorAccess',
        indexes: [
          { key: { patientId: 1 } },
          { key: { doctorEmail: 1 } },
          { key: { expiresAt: 1 } },
          { key: { revokedAt: 1 } },
          { key: { shareToken: 1 }, unique: true }
        ]
      }
    ]

    // Create indexes
    for (const config of indexes) {
      const collection = mongoose.connection.db.collection(config.collection)
      for (const index of config.indexes) {
        try {
          await collection.createIndex(index.key, { unique: index.unique })
          console.log(`Index created for ${config.collection}:`, index.key)
        } catch (error) {
          if (error.code !== 85) { // Index already exists
            console.error(`Failed to create index for ${config.collection}:`, error)
          }
        }
      }
    }

    console.log('Database indexes created successfully')
  } catch (error) {
    console.error('Failed to create database indexes:', error)
  }
}

// Database cleanup
export const cleanupDatabase = async (): Promise<void> => {
  try {
    // Remove old temporary files
    const tempCollection = mongoose.connection.db.collection('tempFiles')
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    const result = await tempCollection.deleteMany({
      createdAt: { $lt: cutoffDate }
    })

    console.log(`Cleaned up ${result.deletedCount} old temporary files`)
  } catch (error) {
    console.error('Database cleanup failed:', error)
  }
}

// Database backup (basic implementation)
export const backupDatabase = async (backupName: string): Promise<string> => {
  try {
    const adminDb = mongoose.connection.db.admin()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `${backupName}-${timestamp}`

    // Create backup
    await adminDb.command({
      backup: 1,
      backupName: backupId
    })

    console.log(`Database backup created: ${backupId}`)
    return backupId
  } catch (error) {
    console.error('Database backup failed:', error)
    throw error
  }
}

// Database restore (basic implementation)
export const restoreDatabase = async (backupId: string): Promise<void> => {
  try {
    const adminDb = mongoose.connection.db.admin()

    // Restore from backup
    await adminDb.command({
      restore: 1,
      backupName: backupId
    })

    console.log(`Database restored from backup: ${backupId}`)
  } catch (error) {
    console.error('Database restore failed:', error)
    throw error
  }
}