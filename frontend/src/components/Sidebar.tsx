// === frontend/src/components/Sidebar.tsx ===

import React from 'react'
import {
  Home,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
  Search,
  PlusCircle,
  X
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Home,
      exact: true
    },
    {
      name: 'Medical Records',
      path: '/records',
      icon: FileText,
      exact: false
    },
    {
      name: 'Doctors',
      path: '/manage-shares',
      icon: Users,
      exact: false
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      exact: false
    },
    {
      name: 'Know Your Report',
      path: '/know-your-report',
      icon: Search, // Using Search for now, or I can import another one
      exact: false
    },
    {
      name: 'Calendar',
      path: '/calendar',
      icon: Calendar,
      exact: false
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      exact: false
    }
  ]

  const { pathname } = useLocation()
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 shadow-lg md:shadow-none transition-transform duration-300 transform
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Sidebar header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MV</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">MedVault</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center space-x-3 p-3 rounded-lg text-left transition-all
                ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
              <span className={`font-medium ${active ? 'text-blue-600' : ''}`}>
                {item.name}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <button 
          onClick={() => navigate('/upload')}
          className="w-full flex items-center space-x-2 p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100"
        >
          <PlusCircle className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-600">Add Record</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
