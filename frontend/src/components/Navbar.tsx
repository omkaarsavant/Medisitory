// === frontend/src/components/Navbar.tsx ===

import React, { useState, useEffect, useRef } from 'react'
import { Bell, User, Menu, X, Calendar as CalendarIcon, Clock, Shield, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getAppointments, IAppointment } from '../services/appointmentService'
import { useRecordStore } from '../store/recordStore'
import { useChatStore } from '../store/chatStore'
import { useDoctorStore } from '../store/doctorStore'
import { io } from 'socket.io-client'

interface NavbarProps {
  onToggleSidebar: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate()
  const { records } = useRecordStore()
  const [appointments, setAppointments] = useState<IAppointment[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogoClick = () => {
    navigate('/')
  }

  const fetchAppointments = async () => {
    try {
      const data = await getAppointments()
      // Sort: upcoming first, then past
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setAppointments(data)
    } catch (err) {
      console.error('Navbar: Failed to load appointments for notifications', err)
    }
  }

  // Fetch once on mount, and listen for clicks outside dropdown
  useEffect(() => {
    fetchAppointments()
    
    // Optionally re-fetch periodically so if added in Calendar it updates here
    const fetchInterval = setInterval(fetchAppointments, 30000)

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      clearInterval(fetchInterval)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Socket listener for instant appointment sync
  useEffect(() => {
    const socket = io('http://localhost:5000')
    
    socket.on('new_appointment', (appt: IAppointment) => {
      console.log('Navbar received new_appointment:', appt)
      // Refetch appointments if it's relevant (we can just refetch for simplicity)
      fetchAppointments()
    })

    return () => {
      socket.off('new_appointment')
      socket.disconnect()
    }
  }, [])

  // Reminder Polling (Global)
  useEffect(() => {
    if (appointments.length === 0) return
    const interval = setInterval(() => {
      const now = new Date()
      appointments.forEach(appt => {
        const warnedKey = `warned_${appt._id}`
        if (localStorage.getItem(warnedKey)) return

        let shouldAlert = false
        // Combine date and time
        const apptDate = new Date(`${appt.date.split('T')[0]}T${appt.time}`)
        const diffMs = apptDate.getTime() - now.getTime()

        if (appt.reminderType === '1 hour before' && diffMs > 0 && diffMs <= 60 * 60 * 1000) {
          shouldAlert = true
        } else if (appt.reminderType === '1 day before' && diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
          shouldAlert = true
        } else if (appt.reminderType === 'anytime' && appt.customReminderTime) {
          const customDate = new Date(appt.customReminderTime)
          // Alert if current time has passed the custom reminder time (but not more than 10 mins ago to avoid old stale alerts if closed)
          if (now.getTime() >= customDate.getTime() && now.getTime() < customDate.getTime() + 10 * 60 * 1000) {
            shouldAlert = true
          }
        }

        if (shouldAlert) {
          alert(`Reminder: Upcoming appointment with Dr. ${appt.doctorName} at ${appt.time}`)
          localStorage.setItem(warnedKey, 'true')
        }
      })
    }, 30000) // check every 30s
    return () => clearInterval(interval)
  }, [appointments])

  // Get upcoming appointments (future or today)
  const upcomingAppts = appointments.filter(a => new Date(`${a.date.split('T')[0]}T${a.time}`).getTime() >= new Date().getTime() - 24 * 60 * 60 * 1000)
  const recordsWithNotes = records.filter(r => r.hasNewDoctorNote)
  const { unreadTotal, openChat, lastNotificationToken, lastNotificationSender } = useChatStore()
  const { unreadCounts } = useDoctorStore()
  
  const isDoctorPortal = window.location.pathname.includes('/doctor/')
  const chatUnread = isDoctorPortal 
    ? Object.values(unreadCounts).reduce((sum: number, count: number) => sum + count, 0)
    : unreadTotal
  const notificationCount = upcomingAppts.length + recordsWithNotes.length + chatUnread

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
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button 
                className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-full transition-colors"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Bell className="w-5 h-5" />
                {(notificationCount > 0 || unreadTotal > 0) && (
                  <span className="absolute top-1 right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold text-white items-center justify-center border-2 border-white">
                      {notificationCount > 0 ? (notificationCount > 9 ? '9+' : notificationCount) : ''}
                    </span>
                  </span>
                )}
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{notificationCount} New</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {upcomingAppts.length > 0 || recordsWithNotes.length > 0 || unreadTotal > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {/* Clinical Chat Messages */}
                        {unreadTotal > 0 && (
                          <div 
                            className="p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group border-l-4 border-blue-500"
                            onClick={() => {
                              setShowDropdown(false)
                              if (lastNotificationToken) {
                                openChat(lastNotificationToken, 'patient', 'Patient', lastNotificationSender || 'Clinician', [])
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <MessageSquare className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">New Clinical Messages</p>
                                <p className="text-[10px] text-gray-500 font-medium truncate">You have {unreadTotal} unread message{unreadTotal > 1 ? 's' : ''}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Doctor Notes */}
                        {recordsWithNotes.map(record => (
                          <div 
                            key={record._id || record.id} 
                            className="p-4 bg-indigo-50/30 hover:bg-indigo-50 transition-colors cursor-pointer group border-l-4 border-indigo-500"
                            onClick={() => {
                              setShowDropdown(false)
                              navigate(`/records/${record._id || record.id}`)
                            }}
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Shield className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">New Physician Note</p>
                                <p className="text-[10px] text-gray-500 font-medium truncate">{(record.category || 'Record').replace(/_/g, ' ')} — {record.doctorName || 'Doctor'}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Appointments */}
                        {upcomingAppts.map(appt => (
                          <div 
                            key={appt._id} 
                            className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                            onClick={() => {
                              setShowDropdown(false)
                              navigate('/calendar')
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                Dr. {appt.doctorName}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 font-medium">
                              <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1"/>{new Date(appt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/>{appt.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-sm font-medium text-gray-500 italic">
                        No new notifications
                      </div>
                    )}
                  </div>
                  <div 
                    className="p-3 bg-gray-50 border-t border-gray-100 text-center text-xs font-bold text-blue-600 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setShowDropdown(false)
                      navigate('/calendar')
                    }}
                  >
                    View Calendar
                  </div>
                </div>
              )}
            </div>

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
