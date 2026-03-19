// === backend/src/middleware/errorHandler.ts ===

import { Request, Response, NextFunction } from 'express'

interface IError extends Error {
  status?: number
}

export const errorHandler = (err: IError, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging
  console.error('Error occurred:', err)

  // If headers already sent, pass to default error handler
  if (res.headersSent) {
    return next(err)
  }

  // Extract error information
  const errorStatus = err.status || 500
  const errorMessage = err.message || 'Internal Server Error'
  const errorData = err.data || null

  // Log error based on environment
  if (process.env.NODE_ENV === 'development') {
    console.warn('Error details:', {
      status: errorStatus,
      message: errorMessage,
      stack: err.stack,
      data: errorData
    })
  }

  // Send error response
  res.status(errorStatus).json({
    error: errorStatus === 500 ? 'Internal Server Error' : errorMessage,
    message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong',
    ...(errorData && { data: errorData })
  })
}

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Cannot ${req.method} ${req.path}`)
  error.status = 404
  next(error)
}