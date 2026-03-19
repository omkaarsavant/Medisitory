// === backend/src/services/dataExtractionService.ts ===

import { logger } from '../utils/logger'

/**
 * Data Extraction Service
 *
 * This service handles the extraction of medical data from OCR text
 * using regex patterns and confidence scoring. It supports multiple
 * medical categories and provides structured data extraction.
 */

// Normal ranges for medical values
const NORMAL_RANGES = {
  'blood_sugar': {
    'fasting': { min: 70, max: 100 },
    'post_meal': { min: 100, max: 140 },
    'random': { min: 70, max: 140 },
    'hba1c': { min: 4, max: 6 }
  },
  'bp': {
    'systolic': { min: 90, max: 120 },
    'diastolic': { min: 60, max: 80 },
    'pulse': { min: 60, max: 100 }
  },
  'cholesterol': {
    'total': { min: 125, max: 200 },
    'ldl': { min: 50, max: 130 },
    'hdl': { min: 40, max: 100 },
    'triglycerides': { min: 50, max: 150 }
  },
  'thyroid': {
    'tsh': { min: 0.4, max: 4.0 },
    't3': { min: 60, max: 200 },
    't4': { min: 4.5, max: 12.5 }
  }
}

// Regex patterns for each medical category
const PATTERNS = {
  'blood_sugar': {
    'fasting': /(?:\b(?:blood|glucose|sugar|s\.|fbs|f-bs|bg)[\s\W]*){0,3}(?:\bfasting|fastin|fasing|fbs|f-bs|glucose[\s\W]*fasting|bg[\s\W]*\(f\)|s\.[\s\W]*glucose[\s\W]*\(f\)|blood[\s\W]*(?:sugar|glucose)[\s\W]*\(f\))(?:[\s\W]*(?:blood|glucose|sugar|test)){0,3}[\s\W:=-]*(\d+(?:\.\d+)?)[\s\W\d\.-]*(?:mg\/dL|mg\/dl|mgd|mmol\/l)?/i,
    'post_meal': /(?:\b(?:blood|glucose|sugar|s\.|ppbs|pp-bs|bg)[\s\W]*){0,3}(?:\bpost[\s\W]*(?:meal|prandial)|pp|ppbs|pp-bs|p\.p\.|bg[\s\W]*\(pp\)|s\.[\s\W]*glucose[\s\W]*\(pp\)|2[\s\W]*hours?[\s\W]*post|2[\s\W]*hr[\s\W]*pp|blood[\s\W]*(?:sugar|glucose)[\s\W]*\(pp\))(?:[\s\W]*(?:blood|glucose|sugar|test)){0,3}[\s\W:=-]*(\d+(?:\.\d+)?)[\s\W\d\.-]*(?:mg\/dL|mg\/dl|mgd|mmol\/l)?/i,
    'random': /(?:\b(?:blood|glucose|sugar|s\.|bg)[\s\W]*){0,3}(?:\brand|random)(?:[\s\W]*(?:blood|glucose|sugar|test)){0,3}[\s\W:=-]*(\d+(?:\.\d+)?)[\s\W\d\.-]*(?:mg\/dL|mg\/dl|mgd|mmol\/l)?/i,
    'hba1c': /\b(?:hba1c|糖化血红蛋白|a1c|glyco\s*haemoglobin)\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*%)?/i,
    'urine_sugar_fasting': /\b(?:urine|u-)\s*(?:sugar|glucose)\s*(?:fasting|f)\s*[:\s-]*(\w+)/i,
    'urine_sugar_pp': /\b(?:urine|u-)\s*(?:sugar|glucose)\s*(?:post\s*meal|pp|post\s*prandial)\s*[:\s-]*(\w+)/i
  },
  'bp': {
    'systolic_diastolic': /\b(\d{2,3})\s*[\/\s-]\s*(\d{2,3})\b/i,
    'pulse': /\b(?:pulse|heart\s*rate|hr|bpm)\s*[:\s-]*(\d+)(?:\s*bpm)?/i
  },
  'cholesterol': {
    'total': /\b(?:total\s*cholesterol|tc)\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*(?:mg\/dL|mg\/dl|mgd))?/i,
    'ldl': /\bldl(?:\s*cholesterol)?\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*(?:mg\/dL|mg\/dl|mgd))?/i,
    'hdl': /\bhdl(?:\s*cholesterol)?\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*(?:mg\/dL|mg\/dl|mgd))?/i,
    'triglycerides': /\b(?:triglycerides|tg)\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*(?:mg\/dL|mg\/dl|mgd))?/i
  },
  'thyroid': {
    'tsh': /\btsh(?:\s*ultra)?\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*mIU\/L)?/i,
    't3': /\bt3(?:\s*total)?\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*ng\/dL)?/i,
    't4': /\bt4(?:\s*total)?\s*[:\s-]*(\d+(?:\.\d+)?)(?:\s*mcg\/dL)?/i
  },
  'opd': {
    'doctor': /\b(?:doctor|dr\.?)\s*[:\s]*([a-zA-Z\s\.]+)/i,
    'diagnosis': /\b(?:diagnosis|dx)\s*[:\s]*(.+?)(?=\n|$|plan|treatment)/is,
    'medication': /\b(?:medication|rx|treatment|plan)\s*[:\s]*(.+?)(?=\n|$|diagnosis)/is
  }
}

/**
 * Extract medical data from OCR text
 *
 * This function extracts medical data from OCR text using regex patterns
 * and calculates confidence scores based on pattern matches and value
 * validation against normal ranges.
 *
 * @param ocrText - Text extracted from OCR
 * @param category - Medical category (optional)
 * @returns Extracted medical data
 */
export function extractMedicalData(
  ocrText: string,
  category?: string
): {
  fields: Record<string, any>
  confidence: number
  detectedCategory: string
  missingFields: string[]
  rawMatches: Array<{ field: string; value: string; confidence: number; inRange: boolean }>
  category: string
} {
  logger.info(`Starting medical data extraction for category: ${category || 'detect'}`)

  const result = {
    fields: {} as Record<string, any>,
    confidence: 0,
    detectedCategory: '',
    missingFields: [] as string[],
    rawMatches: [] as any[],
    category: category || 'custom'
  }

  // Clean text for better pattern matching
  const cleanedText = ocrText.toLowerCase()

  // If category is provided, extract data for that specific category
  if (category && (PATTERNS as any)[category]) {
    extractCategoryData(cleanedText, category, result)
    return result
  }

  // If category is not provided, try to detect category automatically
  detectCategoryAndExtractData(cleanedText, result)

  return result
}

/**
 * Extract data for specific category
 *
 * @param text - Cleaned OCR text
 * @param category - Medical category
 * @param result - Result object to populate
 */
function extractCategoryData(text: string, category: string, result: any): void {
  const patterns = (PATTERNS as any)[category]
  if (!patterns) return

  let categoryConfidence = 0
  let patternCount = 0

  // Extract fields for this category
  for (const [field, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern as RegExp)
    if (matches) {
      const value = parseValue(matches[1], field)
      const inRange = isInNormalRange(category, field, value)
      const fieldConfidence = calculateFieldConfidence(value, inRange)

      logger.info(`Pattern matched: ${field} = ${value} (from "${matches[0]}")`)

      result.fields[field] = value
      result.rawMatches.push({
        field,
        value: matches[1],
        confidence: fieldConfidence,
        inRange
      })

      categoryConfidence += fieldConfidence
      patternCount++
    }
  }

  // Calculate category confidence
  result.confidence = patternCount > 0 ? categoryConfidence / patternCount : 0
  result.detectedCategory = category
  
  if (patternCount > 0) {
    logger.info(`Extraction result for ${category}: ${result.confidence.toFixed(2)} confidence`)
  }
}

/**
 * Detect category and extract data
 *
 * @param text - Cleaned OCR text
 * @param result - Result object to populate
 */
function detectCategoryAndExtractData(text: string, result: any): void {
  let bestCategory = ''
  let bestConfidence = 0
  let bestFields: Record<string, any> = {}
  let bestMatches: any[] = []

  // Try each category and find the best match
  for (const category of Object.keys(PATTERNS)) {
    const patterns = (PATTERNS as any)[category]
    let categoryConfidence = 0
    let patternCount = 0
    const categoryFields: Record<string, any> = {}
    const categoryMatches: any[] = []

    for (const [field, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern as RegExp)
      if (matches) {
        const value = parseValue(matches[1], field)
        const inRange = isInNormalRange(category, field, value)
        const fieldConfidence = calculateFieldConfidence(value, inRange)

        categoryFields[field] = value
        categoryMatches.push({
          field,
          value: matches[1],
          confidence: fieldConfidence,
          inRange
        })

        categoryConfidence += fieldConfidence
        patternCount++
      }
    }

    // Calculate category confidence
    const avgCategoryConfidence = patternCount > 0 ? categoryConfidence / patternCount : 0

    // Track best category
    if (avgCategoryConfidence > bestConfidence) {
      bestConfidence = avgCategoryConfidence
      bestCategory = category
      bestFields = categoryFields
      bestMatches = categoryMatches
    }
  }

  // Set results
  result.fields = bestFields
  result.confidence = bestConfidence
  result.detectedCategory = bestCategory
  result.rawMatches = bestMatches

  // Set category if confidence is high enough
  if (bestConfidence > 0.3) {
    result.category = bestCategory
  }
}

/**
 * Parse value from string
 *
 * @param value - String value to parse
 * @param field - Field name for context
 * @returns Parsed numeric value
 */
function parseValue(value: string, field: string): number | null {
  try {
    // Remove common non-numeric characters
    const cleaned = value.replace(/[^\d.]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  } catch (error) {
    return null
  }
}

/**
 * Check if value is in normal range
 *
 * @param category - Medical category
 * @param field - Field name
 * @param value - Numeric value
 * @returns true if value is in normal range
 */
function isInNormalRange(category: string, field: string, value: number | null): boolean {
  if (value === null) return false

  const ranges = (NORMAL_RANGES as any)[category]
  if (!ranges || !ranges[field]) return false

  const range = ranges[field]
  return value >= range.min && value <= range.max
}

/**
 * Calculate field confidence
 *
 * @param value - Numeric value
 * @param inRange - Whether value is in normal range
 * @returns Confidence score (0-1)
 */
function calculateFieldConfidence(value: number | null, inRange: boolean): number {
  if (value === null) return 0

  let confidence = 0.5 // Base confidence

  // Add points for valid pattern match
  confidence += 0.2

  // Add points for normal range
  if (inRange) {
    confidence += 0.1
  }

  // Subtract points for suspicious values
  if (value < 0 || value > 1000) {
    confidence -= 0.2
  }

  // Clamp between 0-1
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Get missing fields for category
 *
 * @param category - Medical category
 * @param fields - Extracted fields
 * @returns Array of missing fields
 */
export function getMissingFields(category: string, fields: Record<string, any>): string[] {
  const requiredFields = Object.keys((PATTERNS as any)[category] || {})
  return requiredFields.filter(field => !(field in fields))
}

/**
 * Get field descriptions
 *
 * @param category - Medical category
 * @returns Object with field descriptions
 */
export function getFieldDescriptions(category: string): Record<string, string> {
  const descriptions: Record<string, any> = {
    'blood_sugar': {
      'fasting': 'Fasting Blood Sugar (mg/dL)',
      'post_meal': 'Post Meal Blood Sugar (mg/dL)',
      'random': 'Random Blood Sugar (mg/dL)',
      'hba1c': 'HbA1c (%)'
    },
    'bp': {
      'systolic': 'Systolic Blood Pressure (mmHg)',
      'diastolic': 'Diastolic Blood Pressure (mmHg)',
      'pulse': 'Pulse Rate (bpm)'
    },
    'cholesterol': {
      'total': 'Total Cholesterol (mg/dL)',
      'ldl': 'LDL Cholesterol (mg/dL)',
      'hdl': 'HDL Cholesterol (mg/dL)',
      'triglycerides': 'Triglycerides (mg/dL)'
    },
    'thyroid': {
      'tsh': 'TSH (mIU/L)',
      't3': 'T3 (ng/dL)',
      't4': 'T4 (mcg/dL)'
    },
    'opd': {
      'doctor': 'Doctor Name',
      'diagnosis': 'Diagnosis',
      'medication': 'Medication'
    }
  }

  return descriptions[category] || {}
}

/**
 * Generate preview text
 *
 * @param result - Extraction result
 * @returns Preview text for user review
 */
export function generatePreview(result: any): string {
  const descriptions = getFieldDescriptions(result.category)
  let preview = `\nExtraction Results for ${result.category.toUpperCase()}:\n\n`

  if (Object.keys(result.fields).length === 0) {
    preview += 'No medical data found in the document.\n'
    return preview
  }

  for (const [field, value] of Object.entries(result.fields)) {
    const description = descriptions[field] || field
    const confidence = result.rawMatches?.find((m: any) => m.field === field)?.confidence || 0
    const inRange = result.rawMatches?.find((m: any) => m.field === field)?.inRange || false

    preview += `${description}: ${value || 'N/A'} (${confidence.toFixed(2)} confidence)`
    if (inRange) {
      preview += ' [Normal Range]'
    }
    preview += '\n'
  }

  if (result.missingFields && result.missingFields.length > 0) {
    preview += '\nMissing fields: ' + result.missingFields.join(', ') + '\n'
  }

  preview += `\nOverall confidence: ${result.confidence.toFixed(2)}`

  return preview
}

/**
 * Validate extracted data
 *
 * @param category - Medical category
 * @param fields - Extracted fields
 * @returns Validation result
 */
export function validateExtractedData(category: string, fields: Record<string, any>): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const requiredFields = Object.keys((PATTERNS as any)[category] || {})

  // Check for required fields
  for (const field of requiredFields) {
    if (!(field in fields) || fields[field] === null || fields[field] === undefined) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Check for invalid values
  for (const [field, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) {
      const ranges = (NORMAL_RANGES as any)[category]
      if (ranges && ranges[field]) {
        const range = ranges[field]
        if (Number(value) < range.min || Number(value) > range.max) {
          warnings.push(`${field} value ${value} is outside normal range (${range.min}-${range.max})`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Export constants
export {
  NORMAL_RANGES,
  PATTERNS
}