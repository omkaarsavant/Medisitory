// === frontend/src/components/Input.tsx ===

import React from 'react'

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date'
  placeholder?: string
  value?: string | number
  onChange?: (value: string | number) => void
  className?: string
  disabled?: boolean
  readOnly?: boolean
  error?: string
  icon?: React.ReactNode
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  className = '',
  disabled = false,
  readOnly = false,
  error,
  icon,
  onKeyDown
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (type === 'number') {
      const num = parseFloat(val)
      onChange?.(!isNaN(num) ? num : val)
    } else {
      onChange?.(val)
    }
  }

  const errorClass = error ? 'border-red-500 focus:ring-red-500' : ''
  const disabledClass = disabled ? 'bg-gray-100 cursor-not-allowed' : ''
  const readOnlyClass = readOnly ? 'bg-gray-50' : ''

  const inputClasses = `
    block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    transition-colors duration-200 ${errorClass} ${disabledClass} ${readOnlyClass} ${className}
  `

  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={inputClasses}
        disabled={disabled}
        readOnly={readOnly}
        onKeyDown={onKeyDown}
        style={{
          ...(icon && { paddingLeft: '2.5rem' }),
          ...(error && { borderColor: '#ef4444' })
        }}
      />
      {error && (
        <div className="mt-1 text-sm text-red-600">{error}</div>
      )}
    </div>
  )
}

export default Input
