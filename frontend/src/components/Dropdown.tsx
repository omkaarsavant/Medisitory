// === frontend/src/components/Dropdown.tsx ===

import React, { useState } from 'react'

interface DropdownProps {
  label: string
  options: Array<{
    value: string | number
    label: string
    disabled?: boolean
  }>
  value?: string | number
  onChange?: (value: string | number) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select...'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find(option => option.value === value)
  const selectedLabel = selectedOption?.label || placeholder

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const selectOption = (optionValue: string | number) => {
    onChange?.(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <button
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="text-sm">{selectedLabel}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  disabled={option.disabled}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dropdown
