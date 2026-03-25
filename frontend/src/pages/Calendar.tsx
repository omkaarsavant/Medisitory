// === frontend/src/pages/Calendar.tsx ===

import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, LoadingSpinner, ErrorMessage } from '../components'
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Plus, Edit2, Trash2, 
  List, ClipboardList, Share2, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  IAppointment,
  CreateAppointmentDTO
} from '../services/appointmentService'

const Calendar: React.FC = () => {
  const [appointments, setAppointments] = useState<IAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<IAppointment | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Form states
  const [formData, setFormData] = useState<CreateAppointmentDTO>({
    date: '',
    time: '',
    doctorName: '',
    location: '',
    reason: '',
    reminderType: 'none',
    customReminderTime: '',
    preVisitQuestions: ['']
  })

  // Post-visit review state
  const [postNotes, setPostNotes] = useState('')

  useEffect(() => {
    fetchAppointments()
  }, [])

  // Reminder polling has been migrated to Navbar.tsx for global coverage.

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const data = await getAppointments()
      // Sort: upcoming first, then past
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setAppointments(data)
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Filter out empty questions
      const cleanedQuestions = formData.preVisitQuestions?.filter(q => q.trim() !== '') || []
      const payload = { ...formData, preVisitQuestions: cleanedQuestions }
      if (payload.reminderType !== 'anytime') {
        delete payload.customReminderTime
      }
      await createAppointment(payload)
      setIsAddModalOpen(false)
      // Reset form
      setFormData({
        date: '', time: '', doctorName: '', location: '', reason: '', reminderType: 'none', customReminderTime: '', preVisitQuestions: ['']
      })
      fetchAppointments()
    } catch (err) {
      alert('Failed to create appointment')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return
    try {
      await deleteAppointment(id)
      if (selectedAppt?._id === id) setIsViewModalOpen(false)
      fetchAppointments()
    } catch (err) {
      alert('Failed to delete appointment')
    }
  }

  const handleUpdatePostVisit = async () => {
    if (!selectedAppt) return
    try {
      await updateAppointment(selectedAppt._id, { postVisitNotes: postNotes })
      setIsViewModalOpen(false)
      fetchAppointments()
    } catch (err) {
      alert('Failed to save notes')
    }
  }

  const exportToCalendar = (appt: IAppointment) => {
    const startObj = new Date(`${appt.date.split('T')[0]}T${appt.time}:00`)
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000) // 1 hour duration
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '')

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Appointment with ${appt.doctorName}`)}&dates=${formatDate(startObj)}/${formatDate(endObj)}&details=${encodeURIComponent(appt.reason || 'Medical appointment')}&location=${encodeURIComponent(appt.location)}`
    
    window.open(googleUrl, '_blank')
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQs = [...(formData.preVisitQuestions || [])]
    newQs[index] = value
    setFormData({ ...formData, preVisitQuestions: newQs })
  }

  const addQuestionField = () => {
    setFormData({ ...formData, preVisitQuestions: [...(formData.preVisitQuestions || []), ''] })
  }

  if (loading && appointments.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
  }

  // --- Calendar Grid Logic ---
  const currentYear = currentMonth.getFullYear()
  const currentMonthIdx = currentMonth.getMonth()
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
  // Adjust so Monday is first day of week, Sunday is last (0-indexed locally: Mon=0 ... Sun=6)
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay()
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const handlePrevMonth = () => setCurrentMonth(new Date(currentYear, currentMonthIdx - 1, 1))
  const handleNextMonth = () => setCurrentMonth(new Date(currentYear, currentMonthIdx + 1, 1))

  const handleAddForDate = (day: number) => {
    // Format to YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setFormData({ ...formData, date: dateStr })
    setIsAddModalOpen(true)
  }

  const getAppointmentsForDate = (day: number) => {
    const dStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.filter(a => a.date.startsWith(dStr))
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointment Tracker</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Manage your upcoming doctor visits and checklists</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto" icon={<Plus className="w-5 h-5" />}>
          New Appointment
        </Button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchAppointments} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-0 overflow-hidden w-full">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="text-blue-600 w-5 h-5 md:w-6 md:h-6" />
                {monthNames[currentMonthIdx]} {currentYear}
              </h2>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="outline" size="sm" onClick={handlePrevMonth} icon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth} icon={<ChevronRight className="w-4 h-4" />}>Next</Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-7 border-b text-center text-sm font-semibold text-gray-500 bg-gray-50">
                  {dayNames.map(d => <div key={d} className="py-2 border-r last:border-r-0">{d}</div>)}
                </div>

                <div className="grid grid-cols-7 min-h-[500px] auto-rows-fr">
                  {/* Empty padding days */}
                  {Array.from({ length: startingDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b bg-gray-50/50 p-2 min-h-[100px]" />
                  ))}
                  
                  {/* Actual days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dayAppts = getAppointmentsForDate(day)
                    const isToday = currentYear === new Date().getFullYear() && currentMonthIdx === new Date().getMonth() && day === new Date().getDate()
                    
                    return (
                      <div 
                        key={day} 
                        className={`group relative border-r border-b p-2 min-h-[120px] transition-colors hover:bg-blue-50/30 ${isToday ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 font-bold'}`}>
                            {day}
                          </span>
                          <button 
                            onClick={() => handleAddForDate(day)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Add appointment"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="mt-2 flex flex-col gap-1">
                          {dayAppts.map(appt => {
                            const isPast = new Date(appt.date) < new Date(new Date().setHours(0,0,0,0))
                            return (
                              <div
                                key={appt._id}
                                onClick={() => {
                                  setSelectedAppt(appt)
                                  setPostNotes(appt.postVisitNotes || '')
                                  setIsViewModalOpen(true)
                                }}
                                className={`px-2 py-1 text-xs rounded-md truncate cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                                  isPast ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                                title={`Dr. ${appt.doctorName} at ${appt.time}`}
                              >
                                <span className="font-semibold mr-1">{appt.time}</span>
                                Dr. {appt.doctorName}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-none">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="text-indigo-600 w-5 h-5" />
              AI Suggestions
            </h3>
            <p className="text-sm text-gray-600 mb-4">Based on your recent lab reports:</p>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl shadow-sm text-sm">
                <span className="font-bold text-red-600 flex items-center gap-2 mb-1">High Cholesterol</span>
                <span className="text-gray-600">Consider scheduling a follow-up with Dr. Smith within 3 months to check lipid panel.</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm text-sm">
                <span className="font-bold text-amber-600 flex items-center gap-2 mb-1">Pre-diabetes marker</span>
                <span className="text-gray-600">Ask your endocrinologist about dietary changes during your next visit.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 md:p-8 shadow-2xl relative z-10 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Schedule Appointment</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Doctor Name</label>
                  <input required placeholder="e.g. Dr. Sarah Johnson" className="w-full px-4 py-2 border rounded-lg" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Location / Clinic</label>
                  <input required placeholder="City Medical Center" className="w-full px-4 py-2 border rounded-lg" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Date</label>
                  <input required type="date" className="w-full px-4 py-2 border rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Time</label>
                  <input required type="time" className="w-full px-4 py-2 border rounded-lg" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Reason for visit</label>
                <input placeholder="e.g. Annual checkup, thyroid review" className="w-full px-4 py-2 border rounded-lg" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Reminder</label>
                  <select className="w-full px-4 py-2 border rounded-lg bg-white" value={formData.reminderType} onChange={e => setFormData({...formData, reminderType: e.target.value as any})}>
                    <option value="none">No reminder</option>
                    <option value="1 hour before">1 hour before</option>
                    <option value="1 day before">1 day before</option>
                    <option value="anytime">Custom</option>
                  </select>
                </div>
                {formData.reminderType === 'anytime' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Custom Reminder Time</label>
                    <input 
                      required 
                      type="datetime-local" 
                      className="w-full px-4 py-2 border rounded-lg bg-white" 
                      value={formData.customReminderTime || ''} 
                      onChange={e => setFormData({...formData, customReminderTime: e.target.value})} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-bold text-gray-700 flex items-center justify-between">
                  <span>Pre-visit Checklist (Questions to ask)</span>
                  <button type="button" onClick={addQuestionField} className="text-blue-600 text-xs flex items-center">+ Add Question</button>
                </label>
                {formData.preVisitQuestions?.map((q, i) => (
                  <input 
                    key={i}
                    placeholder={`Question ${i + 1}`} 
                    className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50" 
                    value={q} 
                    onChange={e => handleQuestionChange(i, e.target.value)} 
                  />
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save Appointment</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* View/Review Appointment Modal */}
      {isViewModalOpen && selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 md:p-8 shadow-2xl relative z-10 border border-gray-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">Dr. {selectedAppt.doctorName}</h2>
                <p className="text-gray-500 font-medium mt-1">{new Date(selectedAppt.date).toLocaleDateString()} at {selectedAppt.time}</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Location</p>
                  <p className="font-medium text-gray-900">{selectedAppt.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reason</p>
                  <p className="font-medium text-gray-900">{selectedAppt.reason || 'Not specified'}</p>
                </div>
              </div>

              {selectedAppt.preVisitQuestions && selectedAppt.preVisitQuestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Questions to Ask</h3>
                  <ul className="space-y-2">
                    {selectedAppt.preVisitQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-sm items-start">
                        <div className="w-5 h-5 rounded border border-gray-300 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Post-Visit Log</h3>
                <textarea 
                  placeholder="Log the doctor's notes, recommendations, or new prescriptions here after your visit..."
                  className="w-full p-4 border rounded-xl h-32 text-sm bg-blue-50/50 focus:bg-white transition-colors"
                  value={postNotes}
                  onChange={e => setPostNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pt-4 border-t border-gray-100 gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => handleDelete(selectedAppt._id)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center justify-center sm:justify-start gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button 
                    onClick={() => exportToCalendar(selectedAppt)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center justify-center sm:justify-start gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Export to Calendar
                  </button>
                </div>
                <div className="flex gap-3 w-full sm:w-auto justify-end">
                  <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                  <Button className="flex-1 sm:flex-none" onClick={handleUpdatePostVisit}>Save Notes</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Calendar
