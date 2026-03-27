import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Building2, Users, QrCode, LogOut, Menu, X, Shield, Calendar as CalendarIcon } from 'lucide-react'

const DoctorLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navItems = [
    { name: 'My Patients', path: '/doctor', icon: Users, exact: true },
    { name: 'Appointments', path: '/doctor/appointments', icon: CalendarIcon, exact: false }
  ]

  const isActive = (path: string, exact: boolean) => {
    return exact ? pathname === path : pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-indigo-100 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-white font-black text-lg tracking-tighter">MV</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">MedVault <span className="text-indigo-600">Pro</span></h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Provider Portal</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 p-1" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path, item.exact)
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path)
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  active 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-200' : ''}`} />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-indigo-50">
          <div className="bg-indigo-50/50 rounded-2xl p-4 mb-4 border border-indigo-100/50">
            <div className="flex items-center space-x-2 text-indigo-800 mb-1">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs font-black uppercase tracking-widest">Secure Session</span>
            </div>
            <p className="text-xs text-indigo-600/80 font-medium">HIPAA compliant connection</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Exit Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-indigo-50 px-4 py-4 sm:px-6 flex items-center lg:hidden sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 mr-2 text-gray-500 hover:bg-indigo-50 rounded-xl"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-lg font-black text-gray-900 tracking-tight">MedVault Pro</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DoctorLayout
