// === frontend/src/components/LoadingSpinner.tsx ===

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'gray'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'blue', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  const colorClasses = {
    blue: 'border-blue-500 border-t-blue-300',
    gray: 'border-gray-400 border-t-gray-300'
  }

  return (
    <div className={`inline-block animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  )
}

export default LoadingSpinner
