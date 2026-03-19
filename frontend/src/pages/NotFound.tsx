// === frontend/src/pages/NotFound.tsx ===

import React from 'react'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '../components'

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <div className="text-center space-y-6">
        <div className="text-9xl text-gray-200">
          <AlertTriangle />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Page Not Found</h1>
          <p className="mt-2 text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}

export default NotFound