// === backend/src/services/aiService.ts ===

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'

/**
 * AI Service for medical data extraction
 * 
 * Uses Google Gemini to analyze OCR text and extract structured 
 * medical data based on the category.
 */

// Initialize Gemini only if API key is provided
const API_KEY = process.env.GEMINI_API_KEY
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

/**
 * Extract medical data from OCR text using AI
 */
export async function extractMedicalDataWithAI(
  ocrText: string,
  category: string
): Promise<{
  fields: Record<string, any>
  patientName: string | null
  confidence: number
  analysis: string
}> {
  if (!genAI) {
    logger.warn('Gemini API key not found in environment variables')
    throw new Error('AI extraction not configured. Please add GEMINI_API_KEY to .env')
  }

  try {
    logger.info(`Starting AI extraction for category: ${category}`)

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

    const prompt = `
      You are a specialized medical data extractor. 
      Analyze the following OCR text from a medical report and extract the specific health metrics for the category: "${category}".

      OCR TEXT:
      """
      ${ocrText}
      """

      INSTRUCTIONS:
      1. Extract numeric values for relevant tests (e.g. Fasting, Post Prandial, Random Sugar, HbA1c for 'blood_sugar').
      2. Extract the patient's full name if clearly visible (e.g. "Name: Mr. Dummy").
      3. Return ONLY a valid JSON object with the following fields:
         - "fields": An object mapping internal field names to values (numbers only where possible)
         - "patientName": A string with the identified patient name (or null if not found)
         - "confidence": A number between 0 and 1 representing your overall confidence
         - "analysis": A brief 1-sentence summary of what was found
      4. For "blood_sugar" category, use these internal keys: "fasting", "post_meal", "random", "hba1c".
      5. If a value is missing, set it to null.
      6. Correct common OCR typos (e.g. "o" for "0", "l" for "1").
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response (handling potential markdown formatting)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned an invalid response format')
    }

    const data = JSON.parse(jsonMatch[0])

    logger.info(`AI extraction successful: ${data.confidence.toFixed(2)} confidence`)

    return {
      fields: data.fields || {},
      patientName: data.patientName || null,
      confidence: data.confidence || 0,
      analysis: data.analysis || 'Extraction successful'
    }

  } catch (error: any) {
    logger.error('AI extraction failed:', error)
    throw new Error(`AI Extraction failed: ${error.message}`)
  }
}
/**
 * Generate medical insights based on extracted data
 */
export async function generateMedicalInsights(
  category: string,
  fields: Record<string, any>
): Promise<{
  findings: string
  notes: string
}> {
  if (!genAI) {
    logger.warn('Gemini API key not found in environment variables')
    return { findings: '', notes: '' } // Graceful fallback
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })
    
    // Format fields for the prompt
    const metricsString = Object.entries(fields)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    const prompt = `
      You are an expert medical assistant. Analyze the following health metrics for the category "${category}":
      Metrics: ${metricsString}

      TASK:
      Provide a brief, professional medical interpretation of these results.
      
      INSTRUCTIONS:
      1. Return ONLY a valid JSON object with:
         - "findings": A concise (1-2 sentences) observation about the scores (e.g., "Your fasting glucose is slightly elevated, suggesting pre-diabetic levels.")
         - "notes": Practical, actionable advice or next steps (e.g., "Consider reducing refined carb intake and monitor your activity levels. Consult a GP for a formal evaluation.")
      2. Use standard clinical ranges for your interpretation.
      3. Be professional and encouraging.
      4. DO NOT include medical disclaimers in the content; the UI will handle that.
      5. If metrics are missing or invalid, stay neutral.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { findings: 'Analysis completed.', notes: 'Contact your doctor for a detailed review.' }
    }

    const data = JSON.parse(jsonMatch[0])

    return {
      findings: data.findings || 'No specific findings identified.',
      notes: data.notes || 'Please consult with a healthcare professional regarding these results.'
    }

  } catch (error: any) {
    logger.error('Failed to generate medical insights:', error)
    return { 
      findings: 'Automated analysis is currently unavailable.', 
      notes: 'Please review your results with a medical professional.' 
    }
  }
}
