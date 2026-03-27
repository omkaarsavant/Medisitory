// === frontend/src/components/Layout.tsx ===

import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar, Sidebar, Footer } from './index'
import './Layout.css'

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar onToggleSidebar={toggleSidebar} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="container mx-auto px-6 py-8">
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default Layout
