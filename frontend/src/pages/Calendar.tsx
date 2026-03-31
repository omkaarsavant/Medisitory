// === frontend/src/pages/Calendar.tsx ===

import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, LoadingSpinner, ErrorMessage } from '../components'
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Plus, Edit2, Trash2, 
  List, ClipboardList, Share2, ChevronLeft, ChevronRight, CreditCard, Download,
  CheckCircle, IndianRupee, Receipt, AlertCircle, ArrowRight,
  Activity, FileText, Shield, Bell, X, Camera, Home, Brain
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { appointments, loading, fetchAppointments, addAppointment: addApptStore, updateAppointment: updateApptStore, deleteAppointment: deleteApptStore } = useAppointmentStore()
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<IAppointment | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)

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

  const handleDelete = (id: string) => {
    const appt = appointments.find(a => a._id === id)
    if (appt && isDoctorScheduled(appt)) {
      alert('You cannot delete appointments scheduled by your doctor.')
      return
    }
    setDeleteCandidateId(id)
  }

  const confirmDelete = async () => {
    if (!deleteCandidateId) return
    const id = deleteCandidateId
    try {
      await deleteApptStore(id)
      if (selectedAppt?._id === id) setIsViewModalOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete appointment'
      alert(msg)
    } finally {
      setDeleteCandidateId(null)
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
    <>
      <style>{`
        /* Global CSS for Mobile Redesign */
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
        
        .mobile-body {
          background: #f8f9fa; /* surface color */
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        @media (max-width: 768px) {
           #global-navbar, #global-footer { display: none !important; }
           #main-content-container { padding: 0 !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>
      
      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:block space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
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
      </div>

      {/* ================= MOBILE VIEW (APP.HTML Design) ================= */}
      <div className="md:hidden mobile-body pb-32">
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center neon-glow-primary overflow-hidden">
                    <img alt="JD" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4" />
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Manrope' }}>MedVault</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer"
                     onClick={() => navigate('/know-your-report')}
                >
                    <Brain className="text-[#0055c9] w-6 h-6" />
                </div>
                <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer"
                     onClick={() => setShowNotifications(true)}
                >
                    <Bell className="text-[#0055c9] w-6 h-6" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
                </div>
            </div>
        </header>

        {showNotifications && (
          <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="text-center py-20">
                  <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium italic">No new notifications</p>
                </div>
            </div>
            <div className="absolute bottom-10 left-0 w-full px-6">
               <button onClick={() => setShowNotifications(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center">
                 Close
               </button>
            </div>
          </div>
        )}

        <main className="px-6 max-w-[390px] mx-auto pt-24">
            {/* Main Header */}
            <section className="mb-8">
                <h1 className="font-headline font-extrabold text-3xl text-slate-900 tracking-tight leading-tight" style={{ fontFamily: 'Manrope' }}>
                  Appointment Tracker
                </h1>
                <p className="text-slate-500 text-sm mt-1" style={{ fontFamily: 'Inter' }}>Manage your upcoming doctor visits and checklists</p>
            </section>
            
            {/* Monthly Calendar View */}
            <section className="glass-card border border-slate-100 rounded-xl p-5 mb-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-headline font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
                      {monthNames[currentMonthIdx]} {currentYear}
                    </h2>
                    <div className="flex items-center gap-1 bg-slate-100/80 rounded-full p-1 border border-slate-200/50">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-full transition-all flex items-center justify-center shadow-sm">
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0055c9]">Today</button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-full transition-all flex items-center justify-center shadow-sm">
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-y-4 text-center">
                    {/* Day Labels */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</span>
                    ))}
                    
                    {/* Calendar Grid */}
                    {Array.from({ length: startingDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="py-2"></div>
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayAppts = getAppointmentsForDate(day);
                        const isToday = currentYear === new Date().getFullYear() && currentMonthIdx === new Date().getMonth() && day === new Date().getDate();
                        const hasAppts = dayAppts.length > 0;
                        
                        return (
                          <div key={day} className="relative py-2" onClick={() => {
                            if (hasAppts) {
                              setSelectedAppt(dayAppts[0]);
                              if (dayAppts[0].postVisitNotes) setPostNotes(dayAppts[0].postVisitNotes);
                              setIsViewModalOpen(true);
                            } else {
                              handleAddForDate(day);
                            }
                          }}>
                              {isToday ? (
                                <button className="w-8 h-8 mx-auto flex items-center justify-center bg-[#0055c9] text-white rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform">
                                  {day}
                                </button>
                              ) : hasAppts ? (
                                <button className="w-8 h-8 mx-auto flex items-center justify-center border-2 border-[#0055c9] text-[#0055c9] rounded-full text-sm font-bold active:scale-95 transition-transform">
                                  {day}
                                </button>
                              ) : (
                                <button className="py-2 text-sm font-medium text-slate-900 w-full hover:bg-slate-50 rounded-full active:scale-95 transition-transform">
                                  {day}
                                </button>
                              )}
                              {hasAppts && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0055c9] rounded-full"></div>}
                          </div>
                        );
                    })}
                </div>
            </section>

            {/* Upcoming Appointments */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-headline font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>Upcoming Appointments</h3>
                    <span className="text-xs font-semibold text-[#0055c9] px-3 py-1 bg-[#dae2ff] rounded-full">
                      {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length} Pending
                    </span>
                </div>
                
                {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 ? (
                   <div className="glass-card rounded-lg p-8 text-center opacity-50 italic text-sm text-slate-600 border border-slate-100">No upcoming appointments.</div>
                ) : (
                  appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).map((appt) => (
                    <div key={appt._id} className="glass-card border border-slate-100 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:bg-white transition-colors shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#dae2ff]/50 border border-[#dae2ff] flex flex-col items-center justify-center pt-1">
                                    <span className="text-[10px] font-bold uppercase text-[#0055c9] leading-none mb-1">
                                      {new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-xl font-extrabold text-[#0055c9] leading-none">
                                      {new Date(appt.date).getDate()}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-headline font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>Dr. {appt.doctorName}</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {appt.time}
                                    </p>
                                </div>
                            </div>
                            {appt.paymentAmount > 0 && appt.paymentStatus === 'Paid' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-md">Paid</span>
                            ) : appt.paymentAmount > 0 ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 px-2 py-0.5 bg-amber-100 rounded-md text-center">Unpaid</span>
                            ) : null}
                        </div>
                        <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setFormData({
                                  date: appt.date.split('T')[0],
                                  time: appt.time,
                                  doctorName: appt.doctorName,
                                  location: appt.location,
                                  reason: appt.reason,
                                  reminderType: 'none',
                                  customReminderTime: '',
                                  preVisitQuestions: appt.preVisitQuestions || ['']
                                });
                                setIsAddModalOpen(true);
                              }}
                              className="flex-1 bg-slate-200 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-300 transition-colors active:scale-95"
                            >
                              Reschedule
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedAppt(appt);
                                setPostNotes(appt.postVisitNotes || '');
                                setIsViewModalOpen(true);
                              }}
                              className="flex-1 bg-[#0055c9] py-2 rounded-full text-xs font-bold text-white shadow-sm active:scale-95 transition-transform hover:shadow-lg"
                            >
                              Details
                            </button>
                        </div>
                    </div>
                  ))
                )}
            </section>
        </main>

        {/* FAB */}
        <button 
          onClick={() => {
            const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(Math.min(new Date().getDate(), daysInMonth)).padStart(2, '0')}`;
            setFormData({ ...formData, date: dateStr });
            setIsAddModalOpen(true);
          }} 
          className="fixed bottom-28 right-6 w-14 h-14 bg-[#0055c9] text-white rounded-2xl shadow-[0_8px_30px_rgb(0,85,201,0.3)] flex items-center justify-center z-40 active:scale-90 transition-transform"
        >
            <Plus className="w-8 h-8 stroke-[3]" />
        </button>

        {/* BottomNavBar */}
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl rounded-t-[2.5rem] z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] border-t border-slate-100">
            <div onClick={() => navigate('/records')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <FileText className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Records</span>
            </div>
            <div onClick={() => navigate('/manage-shares')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Shield className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Doctors</span>
            </div>
            <div onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Home className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Home</span>
            </div>
            <div onClick={() => navigate('/analytics')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Activity className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Analytics</span>
            </div>
            <div onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center bg-[#0055c9]/10 text-[#0055c9] rounded-full px-5 py-2 active:scale-90 duration-200 cursor-pointer">
                <CalendarIcon className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Calendar</span>
            </div>
        </nav>
      </div>

      {/* Add Appointment Modal */}
      {isAddModalOpen && (
        <>
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4">
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

        {/* MOBILE Modal (Full Screen Layout) */}
        <div className="md:hidden fixed inset-0 z-[100] bg-[#f8f9fa] overflow-y-auto w-full h-full animate-in slide-in-from-bottom duration-300 pb-32">
          <main className="pt-24 px-4 max-w-md mx-auto relative min-h-full pb-8">
            {/* Close Button Mobile */}
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-4 w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 active:scale-95 transition-all border border-slate-100">
                <X className="w-5 h-5" />
            </button>

            {/* Hero Decorative Element */}
            <div className="mb-8">
                <h2 className="font-headline font-extrabold text-3xl text-slate-900 tracking-tight mb-2" style={{ fontFamily: 'Manrope' }}>
                  Schedule Appointment
                </h2>
                <p className="text-slate-500 text-sm">Fill in the details below to secure your next medical consultation.</p>
            </div>
            
            {/* Appointment Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Doctor & Clinic Info */}
                <div className="glass-card border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="space-y-5">
                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Doctor Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0055c9]" />
                                <input required type="text" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-100/80 rounded-xl border-none focus:ring-2 focus:ring-[#0055c9] transition-all font-medium text-slate-900 placeholder:text-slate-400 shadow-inner"
                                    placeholder="e.g. Dr. Sarah Johnson" />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Location / Clinic</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0055c9]" />
                                <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-100/80 rounded-xl border-none focus:ring-2 focus:ring-[#0055c9] transition-all font-medium text-slate-900 placeholder:text-slate-400 shadow-inner"
                                    placeholder="City Medical Center" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card border border-slate-100 p-4 rounded-2xl shadow-sm text-center">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Date</label>
                        <div className="flex flex-col items-center justify-center gap-1">
                            <CalendarIcon className="w-6 h-6 text-[#0055c9] mb-1" />
                            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-slate-900 text-center" />
                        </div>
                    </div>
                    <div className="glass-card border border-slate-100 p-4 rounded-2xl shadow-sm text-center">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Time</label>
                        <div className="flex flex-col items-center justify-center gap-1">
                            <Clock className="w-6 h-6 text-[#0055c9] mb-1" />
                            <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-slate-900 text-center" />
                        </div>
                    </div>
                </div>

                {/* Reason & Reminder */}
                <div className="glass-card border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Reason for visit</label>
                        <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-100/80 rounded-xl border-none focus:ring-2 focus:ring-[#0055c9] transition-all font-medium text-slate-900 placeholder:text-slate-400 resize-none shadow-inner"
                            placeholder="e.g. Annual checkup..." rows={3}></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Reminder</label>
                        <div className="relative">
                            <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0055c9] pointer-events-none" />
                            <select value={formData.reminderType} onChange={e => setFormData({...formData, reminderType: e.target.value as any})}
                                className="w-full pl-12 pr-10 py-4 bg-slate-100/80 rounded-xl border-none focus:ring-2 focus:ring-[#0055c9] appearance-none transition-all font-medium text-slate-900 shadow-inner">
                                <option value="none">No reminder</option>
                                <option value="30 minutes before">30 minutes before</option>
                                <option value="1 hour before">1 hour before</option>
                                <option value="1 day before">1 day before</option>
                                <option value="anytime">Custom Date & Time</option>
                            </select>
                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                    
                    {formData.reminderType === 'anytime' && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Custom Reminder Time</label>
                          <input required type="datetime-local" value={formData.customReminderTime} onChange={e => setFormData({...formData, customReminderTime: e.target.value})}
                              className="w-full px-4 py-4 bg-slate-100/80 rounded-xl border-none focus:ring-2 focus:ring-[#0055c9] transition-all font-medium text-slate-900 shadow-inner" />
                      </div>
                    )}
                </div>

                {/* Checklist Section */}
                <div className="glass-card border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-headline font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>Pre-visit Checklist</h3>
                        <button type="button" onClick={addQuestionField}
                            className="text-[#0055c9] bg-[#dae2ff] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-opacity whitespace-nowrap active:scale-95 shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(!formData.preVisitQuestions || formData.preVisitQuestions.length === 0) && (
                          <div className="text-sm font-medium text-slate-400 italic text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">No questions added yet.</div>
                        )}
                        {formData.preVisitQuestions?.map((q, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-100/80 p-4 rounded-xl relative group shadow-inner">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Q{i+1}</span>
                                <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                    placeholder="Any specific symptoms?" type="text" value={q} onChange={e => handleQuestionChange(i, e.target.value)} />
                                <button type="button" onClick={() => {
                                    const newQs = [...(formData.preVisitQuestions || [])];
                                    newQs.splice(i, 1);
                                    setFormData({ ...formData, preVisitQuestions: newQs });
                                }} className="p-1.5 hover:bg-white rounded-full transition-colors active:scale-95 text-slate-400 hover:text-red-500 shadow-sm shrink-0">
                                   <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col gap-3 pb-8">
                    <button type="submit"
                        className="w-full py-4 bg-[#0055c9] text-white font-bold rounded-xl shadow-[0_8px_30px_rgb(0,85,201,0.2)] active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-200" /> Save Appointment
                    </button>
                    <button type="button" onClick={() => setIsAddModalOpen(false)}
                        className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </main>
        </div>
        </>
      )}

      {/* View/Review Appointment Modal */}
      {isViewModalOpen && selectedAppt && (
        <>
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4">
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

        {/* MOBILE Modal (Centered Layout) */}
        <div className="md:hidden fixed inset-0 z-[60] p-4 bg-white/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
          {/* Modal Container */}
          <div className="w-full max-w-md bg-white shadow-[0_20px_60px_rgba(25,28,29,0.15)] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
                <div className="flex flex-col">
                    <h1 className="font-headline font-extrabold text-xl tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>Dr. {selectedAppt.doctorName}</h1>
                    <p className="font-medium text-sm text-slate-500">{new Date(selectedAppt.date).toLocaleDateString()} at {selectedAppt.time}</p>
                </div>
                <button onClick={() => setIsViewModalOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 active:scale-95">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 pb-20 overflow-y-auto w-full custom-scrollbar space-y-7">
                
                {/* Payment Banner */}
                {selectedAppt.paymentAmount > 0 && (
                  <div className={`p-5 rounded-2xl border ${
                    selectedAppt.paymentStatus === 'Paid' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Consultation Fee</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                          selectedAppt.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedAppt.paymentStatus}
                        </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-4">₹{selectedAppt.paymentAmount}</div>
                    {selectedAppt.paymentStatus === 'Paid' ? (
                        <button onClick={() => handleDownloadReceipt(selectedAppt)}
                           className="w-full py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                           <Download className="w-4 h-4" /> Download Receipt
                        </button>
                    ) : (
                        <button onClick={() => handlePay(selectedAppt)} disabled={paymentLoading}
                           className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                           {paymentLoading ? 'Processing...' : 'Pay Now'}
                        </button>
                    )}
                  </div>
                )}

                {/* Visit Info Section */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0055c9] block mb-1">Location</span>
                        <p className="font-semibold text-sm text-slate-900 line-clamp-2">{selectedAppt.location}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0055c9] block mb-1">Reason</span>
                        <p className="font-semibold text-sm text-slate-900 line-clamp-2">{selectedAppt.reason || 'Not specified'}</p>
                    </div>
                </div>

                {/* Checklist (if any) */}
                {selectedAppt.preVisitQuestions && selectedAppt.preVisitQuestions.length > 0 && (
                  <div className="space-y-3">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          QUESTIONS TO ASK
                          <span className="h-px flex-1 bg-slate-100"></span>
                      </label>
                      <ul className="space-y-2.5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        {selectedAppt.preVisitQuestions.map((q, i) => (
                          <li key={i} className="flex gap-3 text-sm items-start">
                            <div className="w-4 h-4 rounded-md border-2 border-slate-300 flex-shrink-0 mt-0.5 bg-white shadow-sm" />
                            <span className="text-slate-700 font-medium leading-tight">{q}</span>
                          </li>
                        ))}
                      </ul>
                  </div>
                )}

                {/* Post-Visit Log Section */}
                <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#0055c9] flex items-center gap-2">
                        POST-VISIT LOG
                        <span className="h-px flex-1 bg-blue-100"></span>
                    </label>
                    <div className="relative group">
                        <textarea
                            className="w-full min-h-[220px] p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#0055c9] text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed resize-none transition-all shadow-inner"
                            placeholder="Log the doctor's notes, recommendations, or new prescriptions here after your visit..."
                            value={postNotes}
                            onChange={e => setPostNotes(e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-6 bg-white/90 backdrop-blur-md flex flex-col gap-4 border-t border-slate-100">
                <div className="flex items-center justify-between w-full">
                    {/* Left Actions */}
                    <div className="flex items-center gap-1.5">
                        {!isDoctorScheduled(selectedAppt) && (
                          <button onClick={() => handleDelete(selectedAppt._id)}
                              className="w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition-all active:scale-95 border border-red-50" title="Delete">
                              <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => exportToCalendar(selectedAppt)}
                            className="w-12 h-12 flex items-center justify-center rounded-full text-[#0055c9] hover:bg-blue-50 transition-all active:scale-95 border border-blue-50" title="Export to Calendar">
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Right Buttons */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsViewModalOpen(false)}
                            className="px-5 h-12 font-semibold text-slate-500 hover:text-slate-900 transition-colors active:scale-95">
                            Close
                        </button>
                        <button onClick={handleUpdatePostVisit}
                            className="px-7 h-12 bg-[#0055c9] text-white font-bold rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm">
                            Save Notes
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-[100] p-4 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>Delete Appointment?</h3>
            <p className="text-sm text-center text-slate-500 mb-6 font-medium">This action cannot be undone. Are you sure you want to remove this appointment from your records?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteCandidateId(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-[0_8px_30px_rgb(220,38,38,0.2)] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Calendar
