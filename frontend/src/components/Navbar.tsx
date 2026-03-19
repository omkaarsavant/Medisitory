// === frontend/src/components/Navbar.tsx ===

import React from 'react'
import { Bell, Search, User, Menu, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface NavbarProps {
  onToggleSidebar: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate()

  const handleLogoClick = () => {
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and sidebar toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleSidebar}
              className="text-gray-400 hover:text-gray-600 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2 cursor-pointer"
                 onClick={handleLogoClick}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MV</span>
              </div>
              <span className="text-xl font-semibold text-gray-800 hidden md:block">
                MedVault
              </span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 hidden md:block">
                Dr. Jane Doe
              </span>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">JD</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 md:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
