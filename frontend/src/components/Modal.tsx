// === frontend/src/components/Modal.tsx ===

import React from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true
}) => {
  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto px-4 sm:px-0">
      <div className="relative mx-auto mt-12 sm:mt-24">
        <div className={`bg-white rounded-lg shadow-lg transform transition-all duration-300 ${sizeClasses[size]}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {children}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 mr-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* Close on overlay click */}
      {closeOnOverlayClick && (
        <div
          className="fixed inset-0"
          onClick={onClose}
        />
      )}
    </div>
  )
}

export default Modal
