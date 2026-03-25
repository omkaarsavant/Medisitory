// === backend/src/controllers/ocrController.ts ===

import { Request, Response } from 'express'
import { extractTextFromMedicalFile, extractTextFromBuffer } from '../services/ocrService'
import { extractMedicalData, generatePreview, validateExtractedData } from '../services/dataExtractionService'
import { extractMedicalDataWithAI, generateMedicalInsights, explainReportWithAI } from '../services/aiService'
import MedicalRecord from '../models/MedicalRecord'
import ExtractedMetric from '../models/ExtractedMetric'
import { logger } from '../utils/logger'
import { RequestValidationError } from '../errors/requestValidationError'
import { isValidObjectId } from 'mongoose'
import { parseNumericValue, getFieldInfo } from '../utils/metrics'

/**
 * OCR Controller
 *
 * This controller handles OCR processing and data extraction for
 * medical records, including text extraction, medical data parsing,
 * and metric creation.
 */

/**
 * Extract data from medical record
 */
export async function extractData(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.params.id || req.body.uploadId
    const { category } = req.body

    logger.info(`Starting OCR extraction for upload: ${uploadId}`)

    // Validate input
    if (!uploadId) {
      const error = new RequestValidationError(
        'Upload ID is required',
        'MISSING_UPLOAD_ID'
      )
      logger.error('Extraction error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Validate ObjectId
    if (!isValidObjectId(uploadId)) {
      const error = new RequestValidationError(
        'Invalid upload ID format',
        'INVALID_ID_FORMAT'
      )
      logger.error('Extraction error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Get medical record
    const medicalRecord = await MedicalRecord.findById(uploadId).exec()

    if (!medicalRecord) {
      logger.warn(`Upload not found: ${uploadId}`)
      res.status(404).json({
        success: false,
        error: 'Upload not found',
        errorCode: 'UPLOAD_NOT_FOUND'
      })
      return
    }

    // Check if image URL exists
    if (!medicalRecord.imagePath) {
      const error = new RequestValidationError(
        'No image URL found for upload',
        'NO_IMAGE_URL'
      )
      logger.error('Extraction error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    try {
      // Extract text from image/PDF
      const ocrResult = await extractTextFromMedicalFile(medicalRecord.imagePath)

      if (ocrResult.error) {
        logger.warn('OCR extraction completed with errors:', ocrResult.error)
      }

      logger.info(`OCR Text Length: ${ocrResult.processedText.length} characters`)
      logger.debug(`OCR Text Preview: ${ocrResult.processedText.substring(0, 200)}...`)

      // Perform medical data extraction (AI or Regex)
      let extractionResult: any
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY
      
      if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key') {
        try {
          const aiResult = await extractMedicalDataWithAI(ocrResult.processedText, medicalRecord.category || 'detect')
          extractionResult = {
            ...aiResult,
            detectedCategory: aiResult.detectedCategory,
            category: aiResult.detectedCategory,
            missingFields: [], // AI handled this
            rawMatches: [] // AI doesn't use regex matches
          }
          logger.info(`AI-powered extraction successful: Detected ${aiResult.detectedCategory} with ${aiResult.confidence.toFixed(2)} confidence`)
        } catch (aiErr) {
          logger.warn('AI extraction failed, falling back to regex:', aiErr)
          extractionResult = extractMedicalData(ocrResult.processedText, medicalRecord.category || 'detect')
        }
      } else {
        logger.info('Using regex-based extraction (AI not configured)')
        extractionResult = extractMedicalData(ocrResult.processedText, medicalRecord.category || 'detect')
      }

      // Generate preview
      const preview = generatePreview(extractionResult)

      // Prepare response
      const responseData = {
        uploadId: medicalRecord._id,
        patientName: extractionResult.patientName || 'Unknown Patient',
        category: extractionResult.category,
        fields: extractionResult.fields,
        confidence: extractionResult.confidence,
        missingFields: extractionResult.missingFields,
        detectedCategory: extractionResult.detectedCategory,
        rawText: ocrResult.rawText,
        processedText: ocrResult.processedText,
        preview,
        ocrConfidence: ocrResult.confidence,
        language: ocrResult.language,
        error: ocrResult.error,
        extractionMethod: extractionResult.analysis ? 'ai' : 'regex'
      }

      logger.info(`Extraction completed: ${extractionResult.confidence.toFixed(2)} confidence (Method: ${responseData.extractionMethod})`)

      res.json({
        success: true,
        data: responseData,
        message: 'Extraction completed successfully'
      })

    } catch (err: any) {
      logger.error('Error during OCR extraction:', err)
      res.status(500).json({
        success: false,
        error: 'OCR extraction failed',
        errorCode: 'OCR_FAILURE',
        details: err.message
      })
    }

  } catch (error) {
    logger.error('Unexpected error in extractData:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Confirm extraction and save data
 */
export async function confirmExtraction(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.params.id || req.body.uploadId
    const { manualCorrections } = req.body

    logger.info(`Confirming extraction for upload: ${uploadId}`)

    // Validate input
    if (!uploadId) {
      const error = new RequestValidationError(
        'Upload ID is required',
        'MISSING_UPLOAD_ID'
      )
      logger.error('Confirmation error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Validate ObjectId
    if (!isValidObjectId(uploadId)) {
      const error = new RequestValidationError(
        'Invalid upload ID format',
        'INVALID_ID_FORMAT'
      )
      logger.error('Confirmation error:', error.message)
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode
      })
      return
    }

    // Get medical record
    const medicalRecord = await MedicalRecord.findById(uploadId).exec()

    if (!medicalRecord) {
      logger.warn(`Upload not found: ${uploadId}`)
      res.status(404).json({
        success: false,
        error: 'Upload not found',
        errorCode: 'UPLOAD_NOT_FOUND'
      })
      return
    }

    // Check if extraction already completed
    if (medicalRecord.extractedData.confidence > 0) {
      logger.warn(`Extraction already completed for: ${uploadId}`)
      res.status(400).json({
        success: false,
        error: 'Extraction already completed',
        errorCode: 'ALREADY_COMPLETED'
      })
      return
    }

    try {
      // Use the confirmed data directly
      const finalFields = manualCorrections || {}
      const { category, date, time } = req.body
      
      // Update category if provided
      if (category) {
        medicalRecord.category = category
      }
      
      // Update visitDate if provided
      if (date) {
        let visitTimestamp = new Date(date)
        if (time) {
          const [hours, minutes] = time.split(':').map(Number)
          visitTimestamp.setHours(hours, minutes, 0, 0)
        }
        medicalRecord.visitDate = visitTimestamp
        logger.info(`Setting visit date to: ${visitTimestamp}`)
      } else if (!medicalRecord.visitDate) {
        // Fallback to current time if no visit date exists
        medicalRecord.visitDate = new Date()
      }
      
      // Update patient name if it's in the corrections (usually from the input field)
      if (finalFields.patientName) {
        delete finalFields.patientName 
      }

      const extractionResult = {
        fields: finalFields,
        confidence: 1.0 // Confirmed by user
      }

      // Validate final data
      const validation = validateExtractedData(medicalRecord.category, finalFields)
      if (!validation.valid) {
        logger.warn('Validation warnings:', validation.warnings)
      }

      // Update medical record
      medicalRecord.extractedData = {
        fields: finalFields,
        confidence: extractionResult.confidence,
        extractedAt: new Date(),
        method: 'ocr'
      }

      medicalRecord.displayData = finalFields
      // Ensure status is updated
      medicalRecord.status = 'Completed'

      // Save medical record (this will trigger the post-save syncMetrics hook)
      await medicalRecord.save()

      // Generate AI Insights (Notes and Findings)
      try {
        const insights = await generateMedicalInsights(medicalRecord.category, finalFields)
        medicalRecord.aiFindings = insights.findings
        medicalRecord.aiNotes = insights.notes
        logger.info(`AI insights generated for record: ${uploadId}`)
      } catch (insightErr) {
        logger.error('Failed to generate AI insights, proceeding without them:', insightErr)
      }

      // Save again with AI insights
      const updatedRecord = await medicalRecord.save()

      logger.info(`Extraction confirmed: ${uploadId}`)

      res.json({
        success: true,
        data: {
          recordId: updatedRecord._id,
          extractedData: updatedRecord.extractedData,
          displayData: updatedRecord.displayData,
          status: updatedRecord.status,
          visitDate: updatedRecord.visitDate
        },
        message: 'Extraction confirmed successfully'
      })

    } catch (err: any) {
      logger.error('Error confirming extraction:', err)
      res.status(500).json({
        success: false,
        error: 'Extraction confirmation failed',
        errorCode: 'CONFIRMATION_FAILURE',
        details: err.message
      })
    }

  } catch (error: any) {
    logger.error('Unexpected error in confirmExtraction:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Create a manual medical record
 */
export async function createManualRecord(req: Request, res: Response): Promise<void> {
  try {
    const { 
      category, date, time, doctor, hospital, metrics,
      imagePath, publicId, fileName, fileSize, prescriptionImageUrl
    } = req.body

    logger.info(`Creating manual medical record for category: ${category}`)

    // Combine date and time for VISIT date
    let visitTimestamp = new Date()
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      visitTimestamp = new Date(year, month - 1, day)
      
      if (time) {
        const [hours, minutes] = time.split(':').map(Number)
        visitTimestamp.setHours(hours, minutes, 0, 0)
      }
    }

    const medicalRecord = new MedicalRecord({
      category: category.toLowerCase().replace(/ /g, '_'),
      uploadDate: new Date(), 
      doctorName: doctor || '',
      hospitalName: hospital || '',
      visitDate: visitTimestamp, 
      displayData: metrics || {},
      status: 'Completed',
      fileName: fileName || 'Manual Entry',
      fileSize: fileSize || 0,
      imagePath: imagePath || '',
      publicId: publicId || '',
      prescriptionImageUrl: prescriptionImageUrl || undefined
    })

    // Save medical record (this will trigger the post-save syncMetrics hook)
    await medicalRecord.save()

    // Generate AI Insights
    try {
      const insights = await generateMedicalInsights(medicalRecord.category, metrics || {})
      medicalRecord.aiFindings = insights.findings
      medicalRecord.aiNotes = insights.notes
      
      // Save again with AI insights
      await medicalRecord.save()
      
      logger.info(`AI insights generated and saved for manual record: ${medicalRecord._id}`)
    } catch (insightErr) {
      logger.error('Failed to generate AI insights for manual record:', insightErr)
    }

    res.json({
      success: true,
      data: { record: medicalRecord },
      message: 'Manual record created successfully'
    })

  } catch (error: any) {
    logger.error('Error creating manual record:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create manual record',
      details: error.message
    })
  }
}

/**
 * Explain medical report in simple terms
 */
export async function explainReport(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file
    
    if (!file) {
      res.status(400).json({ success: false, error: 'No report file provided' })
      return
    }

    logger.info(`Explaining report: ${file.originalname} (${file.size} bytes)`)

    // 1. Extract text from file buffer
    const ocrResult = await extractTextFromBuffer(file.buffer, file.originalname)
    
    if (ocrResult.error) {
      logger.warn(`OCR extraction error: ${ocrResult.error}`)
    }

    if (!ocrResult.processedText || ocrResult.processedText.trim().length === 0) {
      res.status(422).json({
        success: false,
        error: 'No text could be extracted from this report. Please ensure the image is clear.',
        errorCode: 'OCR_EMPTY_RESULT'
      })
      return
    }

    // 2. Use AI to explain in simple terms
    const explanation = await explainReportWithAI(ocrResult.processedText)

    res.json({
      success: true,
      data: explanation
    })

  } catch (error: any) {
    logger.error('Error explaining report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze report',
      details: error.message
    })
  }
}
