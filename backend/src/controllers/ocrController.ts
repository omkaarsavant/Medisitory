// === backend/src/controllers/ocrController.ts ===

import { Request, Response } from 'express'
import { extractTextFromMedicalFile } from '../services/ocrService'
import { extractMedicalData, generatePreview, validateExtractedData } from '../services/dataExtractionService'
import { extractMedicalDataWithAI, generateMedicalInsights } from '../services/aiService'
import MedicalRecord from '../models/MedicalRecord'
import ExtractedMetric from '../models/ExtractedMetric'
import { logger } from '../utils/logger'
import { RequestValidationError } from '../errors/requestValidationError'
import { isValidObjectId } from 'mongoose'

/**
 * OCR Controller
 *
 * This controller handles OCR processing and data extraction for
 * medical records, including text extraction, medical data parsing,
 * and metric creation.
 */

/**
 * Extract data from medical record
 *
 * This endpoint performs OCR on a medical record and extracts
 * medical data for user review and confirmation.
 *
 * @param req Express request object
 * @param res Express response object
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
          const aiResult = await extractMedicalDataWithAI(ocrResult.processedText, medicalRecord.category)
          extractionResult = {
            ...aiResult,
            detectedCategory: medicalRecord.category,
            category: medicalRecord.category,
            missingFields: [], // AI handled this
            rawMatches: [] // AI doesn't use regex matches
          }
          logger.info(`AI-powered extraction successful: ${aiResult.confidence.toFixed(2)} confidence`)
        } catch (aiErr) {
          logger.warn('AI extraction failed, falling back to regex:', aiErr)
          extractionResult = extractMedicalData(ocrResult.processedText, medicalRecord.category)
        }
      } else {
        logger.info('Using regex-based extraction (AI not configured)')
        extractionResult = extractMedicalData(ocrResult.processedText, medicalRecord.category)
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
      // Use the confirmed data directly (save time by not re-running OCR)
      const finalFields = manualCorrections || {}
      
      // Update patient name if it's in the corrections (usually from the input field)
      // We no longer save patientName to the MedicalRecord model as per user request
      if (finalFields.patientName) {
        delete finalFields.patientName // Remove from medical metrics
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

      // Create display data
      medicalRecord.displayData = finalFields

      // Create metrics for each field
      const metricsToCreate: any[] = []

      for (const [field, value] of Object.entries(finalFields)) {
        if (value !== null && value !== undefined) {
          const fieldInfo = getFieldInfo(medicalRecord.category, field, Number(value))
          if (fieldInfo) {
            metricsToCreate.push({
              recordId: medicalRecord._id,
              category: medicalRecord.category,
              metricName: field,
              value,
              unit: fieldInfo.unit,
              normalMin: fieldInfo.normalMin,
              normalMax: fieldInfo.normalMax,
              status: fieldInfo.status,
              measuredDate: medicalRecord.uploadDate || new Date()
            })
          }
        }
      }

      // Save metrics
      if (metricsToCreate.length > 0) {
        await ExtractedMetric.insertMany(metricsToCreate)
      }

      // Update status
      medicalRecord.status = 'Completed'

      // Generate AI Insights (Notes and Findings)
      try {
        const insights = await generateMedicalInsights(medicalRecord.category, finalFields)
        medicalRecord.aiFindings = insights.findings
        medicalRecord.aiNotes = insights.notes
        logger.info(`AI insights generated for record: ${uploadId}`)
      } catch (insightErr) {
        logger.error('Failed to generate AI insights, proceeding without them:', insightErr)
      }

      // Save medical record
      const updatedRecord = await medicalRecord.save()

      logger.info(`Extraction confirmed: ${uploadId}`)

      res.json({
        success: true,
        data: {
          recordId: updatedRecord._id,
          extractedData: updatedRecord.extractedData,
          displayData: updatedRecord.displayData,
          metrics: metricsToCreate,
          status: updatedRecord.status
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

  } catch (error) {
    logger.error('Unexpected error in confirmExtraction:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Get field information
 */
function getFieldInfo(category: string, field: string, value: number): any {
  const ranges = {
    'blood_sugar': {
      'fasting': { unit: 'mg/dL', normalMin: 70, normalMax: 100, status: value >= 70 && value <= 100 ? 'normal' : value < 70 ? 'low' : 'high' },
      'post_meal': { unit: 'mg/dL', normalMin: 100, normalMax: 140, status: value >= 100 && value <= 140 ? 'normal' : value < 100 ? 'low' : 'high' },
      'random': { unit: 'mg/dL', normalMin: 70, normalMax: 140, status: value >= 70 && value <= 140 ? 'normal' : value < 70 ? 'low' : 'high' },
      'hba1c': { unit: '%', normalMin: 4, normalMax: 6, status: value >= 4 && value <= 6 ? 'normal' : value < 4 ? 'low' : 'high' }
    },
    'bp': {
      'systolic': { unit: 'mmHg', normalMin: 90, normalMax: 120, status: value >= 90 && value <= 120 ? 'normal' : value < 90 ? 'low' : 'high' },
      'diastolic': { unit: 'mmHg', normalMin: 60, normalMax: 80, status: value >= 60 && value <= 80 ? 'normal' : value < 60 ? 'low' : 'high' },
      'pulse': { unit: 'bpm', normalMin: 60, normalMax: 100, status: value >= 60 && value <= 100 ? 'normal' : value < 60 ? 'low' : 'high' }
    },
    'cholesterol': {
      'total': { unit: 'mg/dL', normalMin: 125, normalMax: 200, status: value >= 125 && value <= 200 ? 'normal' : value < 125 ? 'low' : 'high' },
      'ldl': { unit: 'mg/dL', normalMin: 50, normalMax: 130, status: value >= 50 && value <= 130 ? 'normal' : value < 50 ? 'low' : 'high' },
      'hdl': { unit: 'mg/dL', normalMin: 40, normalMax: 100, status: value >= 40 && value <= 100 ? 'normal' : value < 40 ? 'low' : 'high' },
      'triglycerides': { unit: 'mg/dL', normalMin: 50, normalMax: 150, status: value >= 50 && value <= 150 ? 'normal' : value < 50 ? 'low' : 'high' }
    },
    'thyroid': {
      'tsh': { unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, status: value >= 0.4 && value <= 4.0 ? 'normal' : value < 0.4 ? 'low' : 'high' },
      't3': { unit: 'ng/dL', normalMin: 60, normalMax: 200, status: value >= 60 && value <= 200 ? 'normal' : value < 60 ? 'low' : 'high' },
      't4': { unit: 'mcg/dL', normalMin: 4.5, normalMax: 12.5, status: value >= 4.5 && value <= 12.5 ? 'normal' : value < 4.5 ? 'low' : 'high' }
    }
  }

  return (ranges as any)[category]?.[field]
}