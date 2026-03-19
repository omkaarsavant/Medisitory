// === frontend/src/components/DatePicker.tsx ===
import React from 'react'

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  className?: string
  label?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  className = '',
  label
}) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )
}

export default DatePicker
