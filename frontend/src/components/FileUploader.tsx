// === frontend/src/components/FileUploader.tsx ===
import React, { useRef } from 'react'
import { Upload } from 'lucide-react'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
  className?: string
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024,
  className = ''
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > maxSize) {
        alert(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`)
        return
      }
      onFileSelect(file)
    }
  }

  return (
    <div
      className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors ${className}`}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
      <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
      <p className="text-gray-400 text-sm mt-1">PDF, PNG, JPG up to {(maxSize / 1024 / 1024).toFixed(0)}MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

export default FileUploader
