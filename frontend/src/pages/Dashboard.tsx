// === frontend/src/pages/Dashboard.tsx ===

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, AlertCircle, FileText, Sparkles, Bell, ArrowRight, Shield, 
  Plus, Check, HeartPulse, Droplets, Bolt, Search, ShoppingBag, 
  HeartPulse as HeartPulseIcon, Calendar, TrendingUp, CheckCircle2, Menu, X 
} from 'lucide-react'
import { useRecordStore } from '../store/recordStore'
import { getDashboardSummary, DashboardSummary } from '../services/api'
import { useAppointmentStore } from '../store/appointmentStore'
import { useChatStore } from '../store/chatStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Badge from '../components/Badge'
import Card from '../components/Card'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { records, fetchRecords } = useRecordStore()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const { appointments, fetchAppointments } = useAppointmentStore()
  const [showNotifications, setShowNotifications] = useState(false)

  const { unreadTotal, lastNotificationToken, lastNotificationSender, openChat } = useChatStore()

  useEffect(() => {
    const initData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchRecords(),
          fetchAppointments()
        ])
        const summaryData = await getDashboardSummary()
        setSummary(summaryData.data)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  useEffect(() => {
    if (!records) return
    
    // Update recent uploads list
    setRecentUploads(records.slice(0, 4).map(record => {
      const rawDate = new Date(record.visitDate || record.uploadDate || record.createdAt || Date.now())
      return {
        id: record._id || record.id,
        category: record.category,
        date: rawDate.toLocaleDateString(),
        status: record.status || 'Active'
      }
    }))

    const updateSummary = async () => {
      try {
        setSummaryLoading(true)
        const summaryData = await getDashboardSummary()
        setSummary(summaryData.data)
      } catch (err) {
        console.error('Error updating summary:', err)
      } finally {
        setSummaryLoading(false)
      }
    }

    if (!loading) updateSummary()
  }, [records])

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorMessage message={error} onRetry={() => window.location.reload()} /></div>

  const healthScore = summary?.healthScore || 0

  return (
    <>
      <style>{`
        /* Global CSS for Mobile Redesign */
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .neon-glow-primary {
          box-shadow: 0 0 20px rgba(0, 85, 201, 0.15);
        }
        .text-neon-blue {
          text-shadow: 0 0 8px rgba(3, 108, 251, 0.2);
        }
        .mobile-body {
          background: radial-gradient(circle at top right, #f1f5f9, #f8fafc);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        @media (max-width: 768px) {
           #global-navbar, #global-footer { display: none !important; }
           #main-content-container { padding: 0 !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:block space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Welcome Back
            </h1>
            <p className="text-gray-500 mt-1">Here's a snapshot of your health overview.</p>
          </div>
        </div>

        {/* Doctor Notes Notifications */}
        {records.some(r => r.hasNewDoctorNote) && (
          <Card 
            className="p-4 bg-indigo-600 text-white border-none shadow-lg animate-in slide-in-from-top-4 duration-500 cursor-pointer hover:bg-indigo-700 transition-all flex items-center justify-between group"
            onClick={() => {
              const firstWithNote = records.find(r => r.hasNewDoctorNote)
              if (firstWithNote) navigate(`/records/${firstWithNote._id || firstWithNote.id}`)
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-80">New Physician Observation</p>
                <h4 className="text-sm font-bold">A doctor has added professional notes to your recent reports.</h4>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">View Observations</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Health Score Card */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Health Score</h3>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-end space-x-3">
                <span className={`text-6xl font-black ${healthScore > 80 ? 'text-green-600' : healthScore > 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {healthScore}
                </span>
                <span className="text-xl font-bold text-gray-300 mb-2">/ 100</span>
              </div>
              <div className="pt-2">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ease-out ${healthScore > 80 ? 'bg-green-500' : healthScore > 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${healthScore}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Abnormal Metrics Card */}
          <Card className="p-8 space-y-5 shadow-xl border-none hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Abnormal Metrics</h3>
              <div className="p-2 bg-red-50 rounded-lg text-red-500 shadow-sm"><AlertCircle className="w-5 h-5" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black text-gray-900">{summary?.abnormalCount || 0}</span>
              <span className="text-lg font-bold text-gray-400">currently abnormal</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary?.abnormalMetricNames.map((name, idx) => (
                <span key={idx} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-md border border-red-100 uppercase tracking-wide">{name}</span>
              ))}
            </div>
          </Card>

          {/* Total Records Card */}
          <div className="p-8 space-y-4 shadow-xl rounded-lg hover:shadow-2xl transition-all duration-300 bg-gray-900 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Records</h3>
              <FileText className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black text-white">{records.length}</span>
              <span className="text-lg font-bold text-gray-400">saved</span>
            </div>
            <button onClick={() => navigate('/records')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all border border-white/10 text-white">
              <span>Browse History</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <Activity className="w-6 h-6 text-blue-500" />
                <span>Recent Uploads</span>
              </h2>
              <button onClick={() => navigate('/records')} className="text-blue-600 hover:text-blue-700 font-bold text-sm">View All</button>
            </div>
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-50">
                {recentUploads.map((upload, index) => (
                  <div key={index} className="flex items-center justify-between p-6 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/records/${upload.id}`)}>
                    <div className="flex items-center space-x-5">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center"><FileText className="w-6 h-6 text-blue-500" /></div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1"><span className="font-bold text-gray-900 capitalize">{upload.category.replace(/_/g, ' ')}</span><Badge color="green">{upload.status}</Badge></div>
                        <p className="text-sm font-medium text-gray-400">{upload.date}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="p-6 bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-none shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center space-x-3"><Bell className="w-5 h-5" /><h3 className="font-bold text-lg">Appointment Reminders</h3></div>
              <div className="space-y-3">
                {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 2).map(appt => (
                  <div key={appt._id} onClick={() => navigate('/calendar')} className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 cursor-pointer">
                    <p className="text-sm font-bold truncate pr-2">Dr. {appt.doctorName}</p>
                    <p className="text-[10px] text-blue-100 font-medium uppercase tracking-widest opacity-80">{new Date(appt.date).toLocaleDateString()} • {appt.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ================= MOBILE VIEW (EXACT AS home.html) ================= */}
            <div className="md:hidden mobile-body pb-32">
        {/* TopAppBar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center neon-glow-primary overflow-hidden">
                    <img alt="JD" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4" />
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Manrope' }}>MedVault</span>
            </div>
            <div className="relative active:scale-95 duration-200 transition-opacity hover:opacity-80 cursor-pointer"
                 onClick={() => setShowNotifications(true)}
            >
                <Bell className="text-[#0055c9] w-6 h-6" />
                {(summary?.abnormalCount || 0) > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
                )}
            </div>
        </header>

        {/* Mobile Notification Overlay */}
        {showNotifications && (
          <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && records.filter(r => r.hasNewDoctorNote).length === 0 && (
                <div className="text-center py-20">
                  <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium italic">No new notifications</p>
                </div>
              )}
              
              {/* Appointments in Overlay */}
              {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Upcoming Appointments</h3>
                  {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).map(appt => (
                    <div key={appt._id} onClick={() => navigate('/calendar')} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Dr. {appt.doctorName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(appt.date).toLocaleDateString()} • {appt.time}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* Records with Notes in Overlay */}
              {records.filter(r => r.hasNewDoctorNote).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">New Reports Shared</h3>
                  {records.filter(r => r.hasNewDoctorNote).map(record => (
                    <div key={record._id || record.id} onClick={() => navigate(`/records/${record._id || record.id}`)} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 capitalize">{record.category.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">View Physician Observations</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="absolute bottom-10 left-0 w-full px-6">
               <button onClick={() => setShowNotifications(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">
                 Close
               </button>
            </div>
          </div>
        )}

        <main className="pt-24 px-6 space-y-8 max-w-lg mx-auto">
            {/* Greeting Section */}
            <section className="space-y-1">
                <h1 className="font-headline font-extrabold text-3xl text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope' }}>Welcome Back</h1>
                <p className="text-slate-500 font-medium">Your health profile is updated.</p>
                <p className="text-[#0055c9] font-bold text-sm uppercase tracking-widest pt-2">
                    {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </section>

            {/* Bento Grid: Health Score & Metrics */}
            <div className="grid grid-cols-12 gap-4">
                {/* Health Score Card */}
                <div className="col-span-12 glass-card rounded-[2rem] p-6 flex items-center justify-between overflow-hidden relative shadow-sm">
                    <div className="z-10">
                        <h3 className="text-slate-500 font-semibold text-sm mb-1">Health Score</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-slate-900" style={{ fontFamily: 'Manrope' }}>{healthScore}</span>
                            <span className="text-slate-400 font-bold text-lg">/100</span>
                        </div>
                    </div>
                    <div className="relative w-24 h-24 z-10">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-slate-100" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                            <circle 
                              className="text-[#0055c9]" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"
                              strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Bolt className="text-[#0055c9] w-5 h-5 fill-[#0055c9]" />
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#0055c9]/5 rounded-full blur-3xl"></div>
                </div>

                {/* Abnormal Metrics Card */}
                <div className="col-span-12 glass-card rounded-[2rem] p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h3 className="text-slate-900 font-bold tracking-tight">Abnormal Metrics</h3>
                        <span className="bg-[#ba1a1a]/10 text-[#ba1a1a] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {summary?.abnormalCount || 0} Active
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {summary?.abnormalMetricNames.map((name, idx) => (
                           <div key={idx} className="bg-[#ba1a1a]/5 border border-[#ba1a1a]/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-pulse"></span>
                              <span className="text-[11px] font-black text-[#ba1a1a] tracking-widest uppercase">{name}</span>
                           </div>
                        ))}
                        {(!summary?.abnormalCount || summary.abnormalCount === 0) && (
                          <div className="text-xs font-semibold text-slate-400 italic">No current alerts</div>
                        )}
                    </div>
                </div>

                {/* Total Records Card */}
                <div className="col-span-12 glass-card rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <h3 className="text-slate-500 font-semibold text-sm">Total Records</h3>
                        <p className="text-3xl font-black text-slate-900" style={{ fontFamily: 'Manrope' }}>
                          {records.length} <span className="text-sm font-medium text-slate-400">Saved</span>
                        </p>
                    </div>
                    <button onClick={() => navigate('/records')} className="bg-slate-50 hover:bg-slate-100 transition-colors px-4 py-2 rounded-full flex items-center gap-2 group border border-slate-200">
                        <span className="text-xs font-bold text-[#0055c9]">Browse History</span>
                        <ArrowRight className="text-[#0055c9] w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Recent Activity Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 px-2">
                    Recent Activity <span className="h-[1px] flex-grow bg-slate-200"></span>
                </h3>
                <div className="space-y-3">
                    {recentUploads.length === 0 ? (
                      <div className="p-8 text-center glass-card rounded-lg opacity-50 italic text-sm">No activity recorded</div>
                    ) : recentUploads.map((upload, idx) => (
                      <div key={idx} onClick={() => navigate(`/records/${upload.id}`)} className="glass-card rounded-[2rem] p-4 flex items-center justify-between shadow-sm active:scale-95 transition-all">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-[#0055c9]/10 flex items-center justify-center text-[#0055c9]">
                                  {upload.category.toLowerCase().includes('sugar') ? <Droplets className="w-6 h-6" /> : <HeartPulse className="w-6 h-6" />}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900 text-sm capitalize">{upload.category.replace(/_/g, ' ')}</h4>
                                  <p className="text-xs text-slate-500">{upload.date}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 bg-[#006c4f]/10 px-2 py-1 rounded-lg">
                              <Check className="text-[#006c4f] w-3 h-3 stroke-[3px]" />
                              <span className="text-[10px] font-black text-[#006c4f] uppercase tracking-tighter">Completed</span>
                          </div>
                      </div>
                    ))}
                </div>
            </section>

            {/* Appointment Reminders Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 px-2">
                    Health Reminders <span className="h-[1px] flex-grow bg-slate-200"></span>
                </h3>
                <div className="glass-card rounded-[2rem] p-5 flex items-start gap-4 border-l-4 border-[#0055c9] shadow-sm">
                    <div className="bg-[#0055c9]/10 p-2 rounded-lg text-[#0055c9]"><Bell className="w-6 h-6" /></div>
                    <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900 text-md">Active Feed</h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Appointments</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 2).map((appt, i) => (
                              <div key={appt._id} className={`flex items-center gap-3 ${i > 0 ? 'opacity-50' : ''}`}>
                                  <span className="text-[11px] font-black text-[#0055c9] bg-[#0055c9]/10 px-2 py-0.5 rounded">
                                    {new Date(appt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                                  </span>
                                  <span className="text-xs font-black text-slate-700">Dr. {appt.doctorName} • {appt.time}</span>
                              </div>
                            ))}
                            {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
                              <p className="text-xs text-slate-400 italic">No upcoming schedule</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>

        {/* FAB */}
        <button onClick={() => navigate('/upload')} className="fixed bottom-28 right-6 w-14 h-14 bg-[#0055c9] text-white rounded-full shadow-lg shadow-[#0055c9]/30 flex items-center justify-center active:scale-90 transition-transform z-50">
            <Plus className="w-8 h-8 font-bold" />
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
            <div onClick={() => navigate('/analytics')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Activity className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Analytics</span>
            </div>
            <div onClick={() => navigate('/records')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <FileText className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Reports</span>
            </div>
            <div onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Calendar className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Calendar</span>
            </div>
        </nav>
      </div>
    </>
  )
}

export default Dashboard