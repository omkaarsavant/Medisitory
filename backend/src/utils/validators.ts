// === backend/src/utils/validators.ts ===

// Validation utilities for medical data

// Check if a value is a valid blood sugar reading
export const isValidBloodSugar = (value: number): boolean => {
  return typeof value === 'number' && value >= 0 // No upper bound
}

// Check if a value is a valid blood pressure reading
export const isValidBloodPressure = (systolic: number, diastolic: number): boolean => {
  return (
    typeof systolic === 'number' && systolic >= 0 && // No upper bound
    typeof diastolic === 'number' && diastolic >= 0
  )
}

// Check if a value is a valid cholesterol reading
export const isValidCholesterol = (value: number): boolean => {
  return typeof value === 'number' && value >= 0 // No upper bound
}

// Check if a value is a valid thyroid reading
export const isValidThyroid = (value: number): boolean => {
  return typeof value === 'number' && value >= 0 // No upper bound
}

// Validate medical record data based on category
export const validateMedicalRecord = (category: string, data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  let valid = true

  switch (category) {
    case 'blood_sugar': {
      const fasting = typeof data.fasting === 'string' ? parseFloat(data.fasting) : data.fasting
      const post_meal = typeof data.post_meal === 'string' ? parseFloat(data.post_meal) : data.post_meal
      const random = typeof data.random === 'string' ? parseFloat(data.random) : data.random
      const hba1c = typeof data.hba1c === 'string' ? parseFloat(data.hba1c) : data.hba1c

      const hasFasting = fasting !== null && fasting !== undefined && isValidBloodSugar(fasting)
      const hasPostMeal = post_meal !== null && post_meal !== undefined && isValidBloodSugar(post_meal)
      const hasRandom = random !== null && random !== undefined && isValidBloodSugar(random)
      const hasHbA1c = hba1c !== null && hba1c !== undefined && typeof hba1c === 'number'

      if (!hasFasting && !hasPostMeal && !hasRandom && !hasHbA1c) {
        errors.push('At least one valid blood sugar metric is required (Fasting, Post-Meal, Random, or HbA1c)')
        valid = false
      }
      
      // Still validate individual fields if they are present but invalid (not numeric)
      if (data.fasting && typeof fasting !== 'number') {
        errors.push('Invalid fasting blood sugar value (must be numeric)')
        valid = false
      }
      if (data.post_meal && typeof post_meal !== 'number') {
        errors.push('Invalid post-meal blood sugar value (must be numeric)')
        valid = false
      }
      if (data.random && typeof random !== 'number') {
        errors.push('Invalid random blood sugar value (must be numeric)')
        valid = false
      }
      if (data.hba1c && typeof hba1c !== 'number') {
        errors.push('Invalid HbA1c value (must be numeric)')
        valid = false
      }
      break
    }

    case 'bp':
      if (!data.systolic || !data.diastolic || typeof data.systolic !== 'number' || typeof data.diastolic !== 'number') {
        errors.push('Systolic and Diastolic values are required and must be numeric')
        valid = false
      }
      if (data.pulse && typeof data.pulse !== 'number') {
        errors.push('Invalid pulse value (must be numeric)')
        valid = false
      }
      break

    case 'cholesterol':
      if (!data.total || typeof data.total !== 'number') {
        errors.push('Total cholesterol is required and must be numeric')
        valid = false
      }
      if (data.ldl && typeof data.ldl !== 'number') {
        errors.push('LDL value must be numeric')
        valid = false
      }
      if (data.hdl && typeof data.hdl !== 'number') {
        errors.push('HDL value must be numeric')
        valid = false
      }
      if (data.triglycerides && typeof data.triglycerides !== 'number') {
        errors.push('Triglycerides value must be numeric')
        valid = false
      }
      break

    case 'thyroid':
      if (!data.tsh || typeof data.tsh !== 'number') {
        errors.push('TSH value is required and must be numeric')
        valid = false
      }
      if (data.t3 && typeof data.t3 !== 'number') {
        errors.push('T3 value must be numeric')
        valid = false
      }
      if (data.t4 && typeof data.t4 !== 'number') {
        errors.push('T4 value must be numeric')
        valid = false
      }
      break

    case 'opd':
      if (!data.symptoms || typeof data.symptoms !== 'string' || data.symptoms.trim().length === 0) {
        errors.push('Symptoms are required')
        valid = false
      }
      if (!data.diagnosis || typeof data.diagnosis !== 'string' || data.diagnosis.trim().length === 0) {
        errors.push('Diagnosis is required')
        valid = false
      }
      break

    case 'lab':
      if (!data.testName || typeof data.testName !== 'string' || data.testName.trim().length === 0) {
        errors.push('Test name is required')
        valid = false
      }
      if (data.result !== null && data.result !== undefined &&
          (typeof data.result !== 'number' || data.result < 0)) {
        errors.push('Invalid test result')
        valid = false
      }
      break

    case 'imaging':
      if (!data.modality || typeof data.modality !== 'string' || data.modality.trim().length === 0) {
        errors.push('Modality is required')
        valid = false
      }
      if (!data.indication || typeof data.indication !== 'string' || data.indication.trim().length === 0) {
        errors.push('Indication is required')
        valid = false
      }
      break

    default:
      // For custom categories, only basic validation
      if (!data.notes || typeof data.notes !== 'string' || data.notes.trim().length === 0) {
        errors.push('Notes are required for custom categories')
        valid = false
      }
  }

  return { valid, errors }
}

// Check if a string is a valid email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Check if a string is a valid phone number (basic validation)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

// Check if a string is a valid name
export const isValidName = (name: string): boolean => {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100
}

// Check if a string is a valid address
export const isValidAddress = (address: string): boolean => {
  return typeof address === 'string' && address.trim().length >= 5 && address.trim().length <= 200
}

// Check if a string is a valid medical condition
export const isValidMedicalCondition = (condition: string): boolean => {
  return typeof condition === 'string' && condition.trim().length >= 1 && condition.trim().length <= 200
}

// Check if a date is in the past
export const isPastDate = (date: Date): boolean => {
  return date < new Date()
}

// Check if a date is within a reasonable range (not too far in the future)
export const isReasonableDate = (date: Date): boolean => {
  const now = new Date()
  const maxFutureDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  return date <= maxFutureDate
}

// Check if a number is within a reasonable range for age
export const isValidAge = (age: number): boolean => {
  return Number.isInteger(age) && age >= 0 && age <= 120
}

// Check if a string is a valid gender
export const isValidGender = (gender: string): boolean => {
  return ['Male', 'Female', 'Other'].includes(gender)
}