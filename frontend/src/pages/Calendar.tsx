// === frontend/src/pages/Calendar.tsx ===

import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, LoadingSpinner, ErrorMessage } from '../components'
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Plus, Edit2, Trash2, 
  List, ClipboardList, Share2, ChevronLeft, ChevronRight, CreditCard, Download,
  CheckCircle, IndianRupee, Receipt, AlertCircle, ArrowRight
} from 'lucide-react'
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  createPaymentOrder,
  verifyPayment,
  IAppointment,
  CreateAppointmentDTO
} from '../services/appointmentService'
import { useAppointmentStore } from '../store/appointmentStore'
import jsPDF from 'jspdf'

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Calendar: React.FC = () => {
  const { appointments, loading, fetchAppointments, addAppointment: addApptStore, updateAppointment: updateApptStore, deleteAppointment: deleteApptStore } = useAppointmentStore()
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<IAppointment | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

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
    fetchLocalAppointments()
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  const fetchLocalAppointments = async () => {
    try {
      await fetchAppointments()
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError('Failed to load appointments')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cleanedQuestions = formData.preVisitQuestions?.filter(q => q.trim() !== '') || []
      const payload = { ...formData, preVisitQuestions: cleanedQuestions }
      if (payload.reminderType !== 'anytime') {
        delete payload.customReminderTime
      }
      await addApptStore(payload)
      setIsAddModalOpen(false)
      setFormData({
        date: '', time: '', doctorName: '', location: '', reason: '', reminderType: 'none', customReminderTime: '', preVisitQuestions: ['']
      })
    } catch (err) {
      alert('Failed to create appointment')
    }
  }

  const isDoctorScheduled = (appt: IAppointment) => {
    return appt.doctorId && appt.doctorId !== 'demo_user' && appt.doctorId !== appt.userId
  }

  const handleDelete = async (id: string) => {
    const appt = appointments.find(a => a._id === id)
    if (appt && isDoctorScheduled(appt)) {
      alert('You cannot delete appointments scheduled by your doctor.')
      return
    }
    if (!window.confirm('Are you sure you want to delete this appointment?')) return
    try {
      await deleteApptStore(id)
      if (selectedAppt?._id === id) setIsViewModalOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete appointment'
      alert(msg)
    }
  }

  const handleUpdatePostVisit = async () => {
    if (!selectedAppt) return
    try {
      await updateApptStore(selectedAppt._id, { postVisitNotes: postNotes })
      setIsViewModalOpen(false)
    } catch (err) {
      alert('Failed to save notes')
    }
  }

  // --- Razorpay Payment ---
  const handlePay = async (appt: IAppointment) => {
    try {
      setPaymentLoading(true)
      const orderData = await createPaymentOrder(appt._id)

      const options = {
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'MedVault',
        description: `Consultation - Dr. ${appt.doctorName}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verified = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              appointmentId: appt._id,
            })
            // Update local state implicitly through store listener if needed, but verifyPayment returns fresh appt
            setSelectedAppt(verified)
            // No need to manually update appointments list if store handles it, but verifyPayment is special
            fetchLocalAppointments()
            alert('Payment successful! Your receipt is ready to download.')
          } catch (e) {
            alert('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: appt.patientName || 'Patient',
          email: 'patient@medvault.app',
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: () => setPaymentLoading(false)
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert('Failed to initiate payment. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  // --- Receipt PDF Generation ---
  const handleDownloadReceipt = (appt: IAppointment) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(79, 70, 229) // indigo-600
    doc.rect(0, 0, pageWidth, 45, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('MedVault', 20, 22)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Payment Receipt', 20, 34)

    // Receipt ID
    doc.setTextColor(79, 70, 229)
    doc.setFontSize(10)
    doc.text(`Receipt #${appt.razorpayPaymentId || appt._id.slice(-8).toUpperCase()}`, pageWidth - 20, 22, { align: 'right' })
    doc.setTextColor(200, 200, 200)
    doc.text(new Date(appt.paidAt || Date.now()).toLocaleString(), pageWidth - 20, 34, { align: 'right' })

    let y = 60

    // Appointment Details Section
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('APPOINTMENT DETAILS', 20, y)
    y += 3
    doc.setDrawColor(230, 230, 230)
    doc.line(20, y, pageWidth - 20, y)
    y += 12

    const addRow = (label: string, value: string) => {
      doc.setTextColor(130, 130, 130)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(label, 20, y)
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.text(value, 90, y)
      y += 10
    }

    addRow('Doctor', `Dr. ${appt.doctorName}`)
    addRow('Patient', appt.patientName || 'Patient')
    addRow('Date', new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))
    addRow('Time', appt.time)
    addRow('Location', appt.location)
    addRow('Type', appt.type)

    y += 5

    // Payment Section
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT DETAILS', 20, y)
    y += 3
    doc.line(20, y, pageWidth - 20, y)
    y += 12

    addRow('Amount Paid', `₹${appt.paymentAmount}`)
    addRow('Payment ID', appt.razorpayPaymentId || 'N/A')
    addRow('Payment Status', 'PAID')
    addRow('Paid On', new Date(appt.paidAt || Date.now()).toLocaleString('en-IN'))

    y += 15

    // Success badge
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(20, y, pageWidth - 40, 20, 3, 3, 'F')
    doc.setTextColor(22, 163, 74)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('✓ Payment Successfully Completed', pageWidth / 2, y + 13, { align: 'center' })

    // Footer
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, 275, { align: 'center' })
    doc.text('MedVault Healthcare Platform', pageWidth / 2, 282, { align: 'center' })

    doc.save(`MedVault_Receipt_${appt._id.slice(-6)}.pdf`)
  }

  const exportToCalendar = (appt: IAppointment) => {
    const startObj = new Date(`${appt.date.split('T')[0]}T${appt.time}:00`)
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000)
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
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay()
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const handlePrevMonth = () => setCurrentMonth(new Date(currentYear, currentMonthIdx - 1, 1))
  const handleNextMonth = () => setCurrentMonth(new Date(currentYear, currentMonthIdx + 1, 1))

  const handleAddForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setFormData({ ...formData, date: dateStr })
    setIsAddModalOpen(true)
  }

  const getAppointmentsForDate = (day: number) => {
    const dStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.filter(a => a.date.startsWith(dStr))
  }

  const getPaymentBadge = (appt: IAppointment) => {
    if (!appt.paymentAmount || appt.paymentAmount === 0) return null
    if (appt.paymentStatus === 'Paid') {
      return <Badge color="green">Paid</Badge>
    }
    if (appt.paymentStatus === 'Failed') {
      return <Badge color="red">Failed</Badge>
    }
    return <Badge color="yellow">Unpaid</Badge>
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointment Tracker</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Manage your upcoming doctor visits and checklists</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setView('calendar')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
            >
              <CalendarIcon className="w-4 h-4 inline-block mr-2" />
              Calendar
            </button>
            <button 
              onClick={() => setView('list')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
            >
              <List className="w-4 h-4 inline-block mr-2" />
              List
            </button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none" icon={<Plus className="w-5 h-5" />}>
            New Appt
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchLocalAppointments} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {view === 'calendar' ? (
          <>
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
                      {Array.from({ length: startingDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-r border-b bg-gray-50/50 p-2 min-h-[100px]" />
                      ))}
                      
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

            {/* Appointment List Sidebar */}
            <div className="space-y-6">
              <Card className="p-0 border-none shadow-lg overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center gap-2">
                  <List className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-white text-sm">Upcoming</h3>
                  <span className="ml-auto bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length}
                  </span>
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
                  {appointments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm font-medium">No appointments yet</p>
                    </div>
                  ) : (
                    appointments.map(appt => {
                      const isPast = new Date(appt.date) < new Date(new Date().setHours(0,0,0,0))
                      return (
                        <div
                          key={appt._id}
                          onClick={() => {
                            setSelectedAppt(appt)
                            setPostNotes(appt.postVisitNotes || '')
                            setIsViewModalOpen(true)
                          }}
                          className={`px-5 py-3.5 hover:bg-indigo-50/40 cursor-pointer transition-all group ${isPast ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-gray-900 truncate group-hover:text-indigo-700 transition-colors">Dr. {appt.doctorName}</span>
                            {getPaymentBadge(appt)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {appt.time}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Full Page List View */
          <div className="lg:col-span-4 animate-in slide-in-from-bottom-4 duration-500">
            <Card className="p-0 border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" />
                  Your Appointment History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Doctor</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date & Time</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payment</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <CalendarIcon className="w-12 h-12 text-gray-100" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No appointments scheduled</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      appointments.map((appt) => {
                        const isPast = new Date(appt.date) < new Date(new Date().setHours(0,0,0,0))
                        return (
                          <tr key={appt._id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm">
                                  {appt.doctorName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">Dr. {appt.doctorName}</div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{appt.location}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="font-bold text-gray-700">{new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                              <div className="text-gray-400 font-medium text-xs flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                {appt.time}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <Badge color={appt.status === 'Cancelled' ? 'red' : isPast ? 'blue' : 'green'}>{appt.status}</Badge>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-100 rounded-md text-gray-600">Checkup</span>
                            </td>
                            <td className="px-8 py-6">
                              {appt.paymentAmount > 0 ? (
                                <div className="flex items-center gap-2">
                                  {getPaymentBadge(appt)}
                                  <span className="text-[10px] font-bold text-gray-400">₹{appt.paymentAmount}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">N/A</span>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedAppt(appt)
                                  setPostNotes(appt.postVisitNotes || '')
                                  setIsViewModalOpen(true)
                                }}
                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm"
                              >
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
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

              {/* Payment Section */}
              {selectedAppt.paymentAmount > 0 && (
                <div className={`p-5 rounded-2xl border-2 ${
                  selectedAppt.paymentStatus === 'Paid' 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {selectedAppt.paymentStatus === 'Paid' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-amber-600" />
                      )}
                      <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">
                        Consultation Payment
                      </h3>
                    </div>
                    <Badge color={selectedAppt.paymentStatus === 'Paid' ? 'green' : selectedAppt.paymentStatus === 'Failed' ? 'red' : 'yellow'}>
                      {selectedAppt.paymentStatus}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black text-gray-900">₹{selectedAppt.paymentAmount}</span>
                    <span className="text-sm text-gray-400 font-medium">consultation fee</span>
                  </div>

                  {selectedAppt.paymentStatus === 'Paid' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-bold">Paid on {new Date(selectedAppt.paidAt || '').toLocaleString('en-IN')}</span>
                      </div>
                      {selectedAppt.razorpayPaymentId && (
                        <p className="text-xs text-gray-400 font-medium">Payment ID: {selectedAppt.razorpayPaymentId}</p>
                      )}
                      <button
                        onClick={() => handleDownloadReceipt(selectedAppt)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        Download Receipt
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePay(selectedAppt)}
                      disabled={paymentLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay Now — ₹{selectedAppt.paymentAmount}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

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
                  {!isDoctorScheduled(selectedAppt) && (
                    <button 
                      onClick={() => handleDelete(selectedAppt._id)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center justify-center sm:justify-start gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
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
