
/**
 * Safely parse a numeric value from a string, stripping units or handling slashes
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  
  try {
    const str = String(val).replace(/,/g, '').trim()
    
    // Handle blood pressure 120/80
    if (str.includes('/')) {
      const parts = str.split('/')
      const systolic = parseFloat(parts[0])
      if (!isNaN(systolic)) return systolic
    }
    
    // Extract first number found
    const match = str.match(/[-+]?\d*\.?\d+/)
    if (match) {
      return parseFloat(match[0])
    }
    
    return null
  } catch (e) {
    return null
  }
}

/**
 * Get normal ranges and status for a specific metric
 */
export function getFieldInfo(category: string, field: string, value: number): any {
  const normalizedField = field.toLowerCase().replace(/ /g, '_')
  
  // Blood Sugar logic
  if (category === 'blood_sugar' || normalizedField.includes('sugar') || normalizedField.includes('glucose')) {
    const isFasting = normalizedField.includes('fasting')
    const min = isFasting ? 70 : 80
    const max = isFasting ? 100 : 140
    
    return {
      unit: 'mg/dL',
      normalMin: min,
      normalMax: max,
      status: value < min ? 'low' : (value > max ? 'high' : 'normal')
    }
  }
  
  // Blood Pressure logic
  if (category === 'bp' || normalizedField === 'systolic' || normalizedField === 'diastolic' || normalizedField === 'pulse') {
    if (normalizedField === 'systolic') {
      return {
        unit: 'mmHg',
        normalMin: 90,
        normalMax: 120,
        status: value < 90 ? 'low' : (value > 120 ? 'high' : 'normal')
      }
    }
    if (normalizedField === 'diastolic') {
      return {
        unit: 'mmHg',
        normalMin: 60,
        normalMax: 80,
        status: value < 60 ? 'low' : (value > 80 ? 'high' : 'normal')
      }
    }
    if (normalizedField === 'pulse') {
      return {
        unit: 'bpm',
        normalMin: 60,
        normalMax: 100,
        status: value < 60 ? 'low' : (value > 100 ? 'high' : 'normal')
      }
    }
  }

  // Sugar / HbA1c
  if (category === 'blood_sugar' || normalizedField.includes('hba1c')) {
    if (normalizedField === 'hba1c') {
      return {
        unit: '%',
        normalMin: 4.0,
        normalMax: 5.6,
        status: value > 5.6 ? 'high' : 'normal'
      }
    }
  }

  // Cholesterol
  if (category === 'cholesterol') {
    if (normalizedField === 'total') return { unit: 'mg/dL', normalMin: 125, normalMax: 200, status: value > 200 ? 'high' : 'normal' }
    if (normalizedField === 'ldl') return { unit: 'mg/dL', normalMin: 0, normalMax: 100, status: value > 100 ? 'high' : 'normal' }
    if (normalizedField === 'hdl') return { unit: 'mg/dL', normalMin: 40, normalMax: 100, status: value < 40 ? 'low' : 'normal' }
    if (normalizedField === 'triglycerides') return { unit: 'mg/dL', normalMin: 0, normalMax: 150, status: value > 150 ? 'high' : 'normal' }
  }

  // Thyroid
  if (category === 'thyroid') {
    if (normalizedField === 'tsh') return { unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, status: value < 0.4 ? 'low' : (value > 4.0 ? 'high' : 'normal') }
  }
  
  // Weights (Common check)
  if (normalizedField === 'weight') return { unit: 'kg', normalMin: 40, normalMax: 150, status: 'normal' }
  if (normalizedField === 'bmi') return { unit: 'kg/m2', normalMin: 18.5, normalMax: 24.9, status: value < 18.5 ? 'low' : (value > 24.9 ? 'high' : 'normal') }

  return {
    unit: 'units', // Use default unit instead of empty string so it's not skipped during sync
    normalMin: 0,
    normalMax: 100,
    status: 'normal'
  }
}
