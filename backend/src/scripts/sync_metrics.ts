import mongoose from 'mongoose'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { MedicalRecord } from '../models/MedicalRecord'
import { ExtractedMetric } from '../models/ExtractedMetric'
import { connectDatabase } from '../config/database'

async function syncAllMetrics() {
  try {
    console.log('--- Health Metrics Synchronization Script ---')
    await connectDatabase()
    console.log('Connected to database.')

    // 1. Cleanup orphaned metrics
    console.log('\nStep 1: Cleaning up orphaned metrics...')
    const allMetrics = await ExtractedMetric.find({}).lean()
    let orphanedCount = 0

    for (const metric of allMetrics) {
      const recordExists = await MedicalRecord.exists({ _id: metric.recordId })
      if (!recordExists) {
        await ExtractedMetric.deleteOne({ _id: metric._id })
        orphanedCount++
      }
    }
    console.log(`Done. Removed ${orphanedCount} orphaned metric entries.`)

    // 2. Re-sync all completed records
    console.log('\nStep 2: Re-synchronizing all completed records...')
    const completedRecords = await MedicalRecord.find({ status: 'Completed' })
    console.log(`Found ${completedRecords.length} completed records to process.`)

    let syncCount = 0
    for (const record of completedRecords) {
      try {
        await (record as any).syncMetrics()
        syncCount++
        if (syncCount % 10 === 0) console.log(`Processed ${syncCount}/${completedRecords.length} records...`)
      } catch (err) {
        console.error(`Failed to sync record ${record._id}:`, err)
      }
    }

    console.log(`\nSynchronization complete! Successfully synced ${syncCount} records.`)
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

syncAllMetrics()
