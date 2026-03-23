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
 * Extract medical data from OCR text using AI with automatic category detection
 */
export async function extractMedicalDataWithAI(
  ocrText: string,
  category: string = 'detect'
): Promise<{
  fields: Record<string, any>
  patientName: string | null
  confidence: number
  analysis: string
  detectedCategory: string
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
      Analyze the following OCR text from a medical report.

      OCR TEXT:
      """
      ${ocrText}
      """

      TASK:
      1. Determine the medical category of the report (e.g., "blood_sugar", "bp", "cholesterol", "thyroid", "opd").
      2. If you are unsure or it doesn't fit the others, use "custom".
      3. For the detected category, extract the specific metrics ONLY using these keys:
         - IF "blood_sugar":
            - "fasting": Fasting Blood Sugar (FBS)
            - "post_meal": Postprandial Blood Sugar (PPBS)
            - "random": Random Blood Sugar (RBS)
            - "hba1c": HbA1c
         - IF "bp":
            - "systolic": Systolic Blood Pressure
            - "diastolic": Diastolic Blood Pressure
            - "pulse": Heart Rate / Pulse
         - IF others: Extract relevant metrics with descriptive internal keys.
      4. Extract the patient's full name if visible.

      INSTRUCTIONS:
      - Return ONLY a valid JSON object.
      - Use ONLY the internal keys specified above for Blood Sugar and BP.
      - Use these fields in the JSON:
         - "category": The detected category ID (lowercase, e.g. "blood_sugar", "bp")
         - "fields": Object mapping internal keys to values (numbers OR strings like "120/80")
         - "patientName": String (or null if not found)
         - "confidence": Number (0-1) representing your overall confidence
         - "analysis": Brief 1-sentence summary of what was found
      - Correct OCR typos (e.g. "o" for "0").
      - Set missing pre-set fields to null.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned an invalid response format')
    }

    const data = JSON.parse(jsonMatch[0])

    logger.info(`AI extraction successful: Detected ${data.category} with ${data.confidence.toFixed(2)} confidence`)

    return {
      fields: data.fields || {},
      patientName: data.patientName || null,
      confidence: data.confidence || 0,
      analysis: data.analysis || 'Extraction successful',
      detectedCategory: data.category || 'custom'
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

/**
 * Explain a medical report in simple terms for a layperson
 */
export async function explainReportWithAI(ocrText: string): Promise<any> {
  if (!genAI) {
    logger.warn('Gemini API key not found in environment variables')
    throw new Error('AI analysis not configured')
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

    const prompt = `
You are an AI Medical Report Analyzer designed for average people with no medical background.

Analyze the following OCR text extracted from a medical report:
"""
${ocrText}
"""

TASK:
Correct OCR typos (e.g. "o" for "0").
1. Identify what kind of medical report this is (e.g., Blood Test, Blood Sugar Report, Cholesterol Test, Thyroid Test, Blood Pressure Report, Ultrasound, X-Ray, etc.).
2. Extract the important medical tests mentioned in the report.
3. For each test, determine: Test Name, Reported Value, Normal Range (if visible), and Status (Normal, Slightly Abnormal, or Abnormal).
4. Explain what each test measures in 1 short sentence using very simple language.
5. Write a clear health explanation for a person with no medical background.
6. Identify the most important findings from the report.
7. Mention possible health risks suggested by abnormal values (clearly state NOT a diagnosis).
8. Suggest simple lifestyle improvements (diet, exercise, hydration, sleep) that are SPECIFICALLY tailored to the findings in this report. For example, if indicators show high sugar, focus on diabetic-friendly diet tips; if cholesterol is high, focus on heart health. Ensure the tips are practical and non-medical. Do NOT give medications or prescriptions.
9. Mention trends (improving, worsening, stable) if relevant.

FORMAT YOUR RESPONSE AS VALID JSON ONLY:
{
  "reportType": "Friendly Name of Report Type",
  "summary": "1-2 sentence high-level summary",
  "tests": [
    {
      "name": "Test Name",
      "value": "Value",
      "range": "Normal Range",
      "status": "Normal | Slightly Abnormal | Abnormal",
      "simpleExplanation": "Simple 1-sentence explanation"
    }
  ],
  "importantFindings": ["Finding 1", "Finding 2"],
  "healthExplanation": "Detailed but simple health explanation",
  "lifestyleSuggestions": {
    "diet": ["Suggestion 1", "Suggestion 2"],
    "exercise": ["Suggestion 1"],
    "hydration": ["Suggestion 1"],
    "sleep": ["Suggestion 1"]
  },
  "trends": "Optional trend note"
}
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    // Clean JSON if needed
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned an invalid response format')
    }

    return JSON.parse(jsonMatch[0])

  } catch (error: any) {
    logger.error('Failed to explain report with AI:', error)
    throw new Error(`AI Analysis failed: ${error.message}`)
  }
}

/**
 * Calculate a holistic health score (0-100) based on latest metrics
 */
export async function calculateHealthScore(metrics: any[]): Promise<{ score: number; analysis: string }> {
  if (!genAI) {
    logger.warn('Gemini API key not found in environment variables')
    return { score: 0, analysis: 'AI score unavailable' }
  }

  if (!metrics || metrics.length === 0) {
    return { score: 100, analysis: 'No health data recorded yet. Your score starts at 100.' }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

    const metricsString = metrics
      .map(m => `${m.metricName}: ${m.value} ${m.unit} (Status: ${m.status})`)
      .join('\n')

    const prompt = `
Analyze the following latest healthcare metrics for a patient and provide a holistic health score:

METRICS:
${metricsString}

TASK:
1. Calculate a single "Health Score" from 0 to 100.
   - 100 represents optimal health.
   - Deduct points for "high", "low", or "abnormal" statuses based on their clinical significance.
   - If multiple metrics for the same thing exist, prioritize the most recent.
2. Provide a 1-sentence analysis of the overall health status.

INSTRUCTIONS:
- Return ONLY a valid JSON object.
- Do NOT include any markdown formatting.

FORMAT:
{
  "score": 85,
  "analysis": "Your overall health is good, but your fasting sugar is slightly high."
}
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    // Clean JSON if needed
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned an invalid response format')
    }

    const data = JSON.parse(jsonMatch[0])
    return {
      score: data.score !== undefined ? Number(data.score) : 0,
      analysis: data.analysis || 'Analysis complete'
    }

  } catch (error: any) {
    logger.error('Failed to calculate health score:', error)
    return { score: 0, analysis: 'Score calculation failed' }
  }
}
