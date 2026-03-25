// === frontend/src/components/ErrorMessage.tsx ===

import React from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from './Button'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, className }) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-6 p-8 bg-white rounded-lg border border-red-200 ${className || ''}`}>
      <div className="text-6xl text-red-200">
        <AlertTriangle />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Error</h3>
        <p className="text-gray-600">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          icon={<RefreshCcw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  )
}

export default ErrorMessage
