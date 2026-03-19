// === backend/src/services/ocrService.ts ===

import Tesseract from 'tesseract.js'
import axios from 'axios'
import { logger } from '../utils/logger'

/**
 * OCR Service
 *
 * This service handles Optical Character Recognition (OCR) for medical
 * documents using Tesseract.js. It provides text extraction from images
 * with timeout handling and error recovery.
 */

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(
  imageUrl: string,
  timeout: number = 60000
): Promise<{
  text: string
  confidence: number
  language: string
  rawText: string
  processedText: string
  error?: string
}> {
  try {
    logger.info(`Starting OCR extraction for: ${imageUrl}`)

    // Set timeout for the entire operation
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Download image as buffer
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: timeout,
        signal: controller.signal,
        headers: {
          'Accept': 'image/*'
        }
      })

      // Create worker for OCR
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${m.progress * 100}%`)
          }
        }
      })

      // Perform OCR
      const { data } = await worker.recognize(response.data)

      // Clean up
      await worker.terminate()

      // Calculate confidence
      const confidence = data.confidence || 0

      // Process text
      const rawText = data.text.trim()
      const processedText = cleanOCRText(rawText)

      logger.info(`OCR extraction successful: ${confidence.toFixed(2)} confidence`)

      return {
        text: processedText,
        confidence: confidence / 100, // Convert to 0-1 range
        language: 'eng',
        rawText,
        processedText
      }

    } catch (error: any) {
      if (error && error.name === 'AbortError') {
        logger.warn('OCR extraction timed out')
        return {
          text: '',
          confidence: 0,
          language: 'eng',
          rawText: '',
          processedText: '',
          error: 'Extraction timed out'
        }
      }

      logger.error('OCR extraction failed:', error)
      return {
        text: '',
        confidence: 0,
        language: 'eng',
        rawText: '',
        processedText: '',
        error: error.message || 'Unknown OCR error'
      }
    } finally {
      clearTimeout(timeoutId)
    }

  } catch (error) {
    logger.error('Unexpected error in OCR service:', error)
    throw new Error('OCR extraction failed')
  }
}

/**
 * Extract text from PDF using OCR
 */
export async function extractTextFromPDF(
  imageUrl: string,
  timeout: number = 120000
): Promise<{
  text: string
  confidence: number
  language: string
  rawText: string
  processedText: string
  error?: string
}> {
  return {
    text: '',
    confidence: 0,
    language: 'eng',
    rawText: '',
    processedText: '',
    error: 'PDF OCR not supported in Node.js environment yet'
  }
}

/**
 * Clean OCR text
 */
export function cleanOCRText(text: string): string {
  let cleaned = text
    .replace(/\n\n+/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\f/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()

  // Fix common OCR errors in numbers
  cleaned = cleaned
    .replace(/o/g, '0')
    .replace(/O/g, '0')
    .replace(/l/g, '1')
    .replace(/I/g, '1')

  // Fix common OCR errors in medical terms
  cleaned = cleaned
    .replace(/fasing/i, 'fasting')
    .replace(/fastin/i, 'fasting')
    .replace(/postmeal/i, 'post meal')
    .replace(/post-meal/i, 'post meal')
    .replace(/hba1c/i, 'HbA1c')
    .replace(/hdl/i, 'HDL')
    .replace(/ldl/i, 'LDL')
    .replace(/tsh/i, 'TSH')
    .replace(/t3/i, 'T3')
    .replace(/t4/i, 'T4')

  return cleaned
}

/**
 * Detect if URL is a PDF
 */
export function isPDF(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf')
}

/**
 * Extract text from image or PDF
 */
export async function extractTextFromMedicalFile(
  imageUrl: string,
  timeout: number = 60000
): Promise<{
  text: string
  confidence: number
  language: string
  rawText: string
  processedText: string
  error?: string
}> {
  try {
    if (isPDF(imageUrl)) {
      return await extractTextFromPDF(imageUrl, timeout)
    } else {
      return await extractTextFromImage(imageUrl, timeout)
    }
  } catch (error) {
    logger.error('Error in extractTextFromMedicalFile:', error)
    throw new Error('File processing failed')
  }
}

/**
 * Get file type from URL
 */
export function getFileType(url: string): 'image' | 'pdf' {
  if (isPDF(url)) {
    return 'pdf'
  }
  return 'image'
}