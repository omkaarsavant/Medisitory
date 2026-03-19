// === frontend/src/components/Footer.tsx ===

import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-4">
      <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <div>
          <span className="mr-2">© 2026 MedVault</span>
          <span className="mr-2">v1.0.0</span>
          <span className="mr-2">All rights reserved</span>
        </div>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <span className="hover:text-gray-700 cursor-pointer">
            Privacy Policy
          </span>
          <span className="hover:text-gray-700 cursor-pointer">
            Terms of Service
          </span>
          <span className="hover:text-gray-700 cursor-pointer">
            Help & Support
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
