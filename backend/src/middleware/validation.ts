// === backend/src/middleware/validation.ts ===

import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'

// Validation middleware for common request patterns
export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)))

    // Check for errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'One or more validation errors occurred',
        errors: errors.array()
      })
    }

    next()
  }
}

// Specific validation rules
export const patientValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('age')
    .isInt({ min: 0, max: 120 })
    .withMessage('Age must be a number between 0 and 120'),
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('condition')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Condition must be between 1 and 200 characters'),
  body('lastVisit')
    .optional()
    .isISO8601()
    .withMessage('Last visit must be a valid date')
]

export const recordValidation = [
  body('patientId')
    .isMongoId()
    .withMessage('Patient ID must be a valid MongoDB ID'),
  body('type')
    .isIn(['Consultation', 'Diagnosis', 'Prescription', 'Lab Results', 'Imaging'])
    .withMessage('Type must be one of: Consultation, Diagnosis, Prescription, Lab Results, Imaging'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date string'),
  body('doctor')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Doctor name must be between 1 and 100 characters'),
  body('status')
    .isIn(['Active', 'Archived', 'Pending'])
    .withMessage('Status must be Active, Archived, or Pending')
]

export const fileUploadValidation = [
  body('category')
    .isIn(['blood_sugar', 'bp', 'opd', 'cholesterol', 'thyroid', 'lab', 'imaging', 'custom'])
    .withMessage('Invalid category'),
  body('visitDate')
    .optional()
    .isISO8601()
    .withMessage('Visit date must be a valid date'),
  body('doctorName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Doctor name must be less than 100 characters')
]

// Custom validation functions
export const isValidMongoId = (id: string): boolean => {
  const isValid = id.match(/^[0-9a-fA-F]{24}$/)
  return isValid !== null
}

export const isValidDate = (date: string): boolean => {
  const timestamp = Date.parse(date)
  return !isNaN(timestamp)
}

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim()
  }
  return input
}