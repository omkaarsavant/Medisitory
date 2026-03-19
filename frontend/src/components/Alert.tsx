// === frontend/src/components/Alert.tsx ===

import React from 'react'

interface AlertProps {
  children: React.ReactNode
  type?: 'success' | 'error' | 'warning' | 'info'
  className?: string
  onClose?: () => void
}

export const Alert: React.FC<AlertProps> = ({ children, type = 'info', className = '', onClose }) => {
  const typeClasses = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  const iconClasses = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }

  return (
    <div className={`relative ${typeClasses[type]} ${className}`}>
      <div className="flex items-center p-4">
        <div className="flex-shrink-0">
          <svg className={`w-5 h-5 ${iconClasses[type]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {type === 'success' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
            {type === 'error' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
            {type === 'warning' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.814-1.332-2.174-1.332-2.788 0zM12 4v1m0 13h.01" />
            )}
            {type === 'info' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        <div className="ml-3 flex-1">
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 bg-white p-1 rounded-md hover:bg-gray-100"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert
