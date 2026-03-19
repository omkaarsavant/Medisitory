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
