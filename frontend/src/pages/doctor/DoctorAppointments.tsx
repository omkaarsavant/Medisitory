import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, LoadingSpinner, ErrorMessage, Modal } from '../../components'
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Plus, Edit2, Trash2, 
  List, ClipboardList, Share2, ChevronLeft, ChevronRight, Search, Bell, Filter,
  Building2, Users, QrCode, LogOut, Menu, X, Shield
} from 'lucide-react'
import { 
  getDoctorAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  IAppointment,
  CreateAppointmentDTO
} from '../../services/appointmentService'
import { useDoctorStore } from '../../store/doctorStore'

const DoctorAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<IAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const { savedPatients } = useDoctorStore()
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState<IAppointment | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Form states
  const [formData, setFormData] = useState<CreateAppointmentDTO>({
    date: '',
    time: '',
    patientName: '',
    userId: '',
    doctorId: 'demo_doctor',
    doctorName: 'Dr. Self', // Default or from auth
    location: 'Main Clinic',
    duration: 30,
    type: 'Checkup',
    status: 'Scheduled',
    reason: '',
    notesForPatient: ''
  })

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const data = await getDoctorAppointments()
      setAppointments(data)
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingAppt) {
        await updateAppointment(editingAppt._id, formData)
      } else {
        await createAppointment({
          ...formData,
          doctorName: 'Dr. Self', // This would come from auth in real app
        })
      }
      setIsModalOpen(false)
      setEditingAppt(null)
      fetchAppointments()
      alert(editingAppt ? 'Appointment updated' : 'Appointment scheduled')
    } catch (err) {
      alert('Failed to save appointment')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await deleteAppointment(id)
      fetchAppointments()
    } catch (err) {
      alert('Failed to cancel appointment')
    }
  }

  const handleSendReminder = (appt: IAppointment) => {
    // Mock reminder functionality
    alert(`Reminder sent to ${appt.patientName || 'Patient'} for ${new Date(appt.date).toLocaleDateString()} at ${appt.time}`)
  }

  // Calendar Logic
  const currentYear = currentMonth.getFullYear()
  const currentMonthIdx = currentMonth.getMonth()
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay()
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const getAppointmentsForDate = (day: number) => {
    const dStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.filter(a => a.date.startsWith(dStr))
  }

  if (loading && appointments.length === 0) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
  }

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-to-br from-[#F8FAFC] to-indigo-50/30">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Appointments</h1>
            <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-widest flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              {appointments.filter(a => a.status === 'Scheduled').length} Scheduled Today
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
              <button 
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
              >
                <List className="w-4 h-4 inline-block mr-2" />
                List
              </button>
              <button 
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
              >
                <CalendarIcon className="w-4 h-4 inline-block mr-2" />
                Calendar
              </button>
            </div>
            <button 
              onClick={() => {
                setEditingAppt(null)
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  time: '09:00',
                  patientName: '',
                  userId: '',
                  doctorId: 'demo_doctor',
                  doctorName: 'Dr. Self',
                  location: 'Main Clinic',
                  duration: 30,
                  type: 'Checkup',
                  status: 'Scheduled',
                  reason: '',
                  notesForPatient: ''
                })
                setIsModalOpen(true)
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center gap-2 ml-auto md:ml-0"
            >
              <Plus className="w-4 h-4" />
              New Appt
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={fetchAppointments} />}

        {/* Main Content View */}
        {view === 'list' ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                Upcoming Schedule
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Status:</span>
                <Badge color="green">Scheduled</Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Patient</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date & Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No appointments found</p>
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                              {appt.patientName?.charAt(0) || 'P'}
                            </div>
                            <span className="font-bold text-gray-900">{appt.patientName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-bold text-gray-700">{new Date(appt.date).toLocaleDateString()}</div>
                          <div className="text-gray-400 font-medium text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {appt.time} ({appt.duration} min)
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                            {appt.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color={appt.status === 'Cancelled' ? 'red' : appt.status === 'Scheduled' ? 'green' : 'yellow'}>
                            {appt.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleSendReminder(appt)}
                              className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm"
                              title="Send Reminder"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingAppt(appt)
                                setFormData({
                                  ...appt,
                                  date: new Date(appt.date).toISOString().split('T')[0]
                                })
                                setIsModalOpen(true)
                              }}
                              className="p-2 text-amber-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all shadow-sm"
                              title="Edit/Reschedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(appt._id)}
                              className="p-2 text-red-300 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm"
                              title="Cancel Appointment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <CalendarIcon className="text-indigo-600 w-8 h-8" />
                {monthNames[currentMonthIdx]} <span className="text-indigo-600">{currentYear}</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIdx - 1, 1))} icon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIdx + 1, 1))} icon={<ChevronRight className="w-4 h-4" />}>Next</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 border-b text-center text-[10px] font-black text-gray-400 p-4 bg-gray-50/30">
              {dayNames.map(d => <div key={d} className="uppercase tracking-[0.2em]">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 min-h-[600px] auto-rows-fr bg-[#F1F5F9]/30">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-r border-b border-white/40 p-2 bg-gray-50/20" />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayAppts = getAppointmentsForDate(day)
                const isToday = currentYear === new Date().getFullYear() && currentMonthIdx === new Date().getMonth() && day === new Date().getDate()
                
                return (
                  <div 
                    key={day} 
                    className={`group relative border-r border-b border-white p-2 min-h-[140px] transition-all hover:bg-white hover:shadow-inner ${isToday ? 'bg-indigo-50/50' : 'bg-white/40'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black tracking-tight ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400'}`}>
                        {day}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppts.map(appt => (
                        <div
                          key={appt._id}
                          onClick={() => {
                            setEditingAppt(appt)
                            setFormData({
                              ...appt,
                              date: new Date(appt.date).toISOString().split('T')[0]
                            })
                            setIsModalOpen(true)
                          }}
                          className={`px-3 py-1.5 text-[10px] rounded-xl font-bold truncate cursor-pointer transition-all hover:scale-[1.02] border-l-4 ${
                            appt.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-400' : 'bg-indigo-50 text-indigo-700 border-indigo-400'
                          }`}
                          title={`${appt.patientName} at ${appt.time}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{appt.time}</span>
                            <span className="opacity-50">{appt.type}</span>
                          </div>
                          <div className="truncate font-black uppercase tracking-tighter mt-0.5">{appt.patientName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <Modal 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingAppt ? "Edit Appointment" : "Schedule New Appointment"}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Patient</label>
                <select 
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" 
                  value={formData.userId} 
                  onChange={e => {
                    const patient = savedPatients.find(p => p.patientId === e.target.value);
                    setFormData({...formData, userId: e.target.value, patientName: patient?.name || ''})
                  }}
                >
                  <option value="">Choose a patient...</option>
                  {savedPatients.map(p => (
                    <option key={p.shareToken} value={p.patientId}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Appointment Type</label>
                <select 
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                >
                  <option value="Checkup">General Checkup</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
                <input required type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Time</label>
                <input required type="time" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Duration (min)</label>
                <input required type="number" step="15" min="15" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Internal Notes / Reason</label>
              <textarea 
                placeholder="Internal notes regarding this appointment..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-gray-700 h-24" 
                value={formData.reason} 
                onChange={e => setFormData({...formData, reason: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Notes for Patient</label>
              <textarea 
                placeholder="What should the patient bring? fasting instructions? etc." 
                className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-gray-700 h-24" 
                value={formData.notesForPatient} 
                onChange={e => setFormData({...formData, notesForPatient: e.target.value})} 
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Discard</Button>
              <Button type="submit" className="bg-indigo-600">{editingAppt ? 'Update Schedule' : 'Confirm Appointment'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default DoctorAppointments
