// === frontend/src/components/Card.tsx ===

import React from 'react'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'secondary'
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', onClick }) => {
  const baseClasses = 'rounded-lg shadow-sm'
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    primary: 'bg-blue-50 border border-blue-200',
    secondary: 'bg-gray-50 border border-gray-200'
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export default Card
