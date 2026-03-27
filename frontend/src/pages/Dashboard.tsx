// === frontend/src/pages/Dashboard.tsx ===

import React, { useState, useEffect, useRef } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { useRecordStore } from '../store/recordStore'
import { getDashboardSummary, DashboardSummary } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { IAppointment } from '../services/appointmentService' // Added this import
import { useAppointmentStore } from '../store/appointmentStore'
import { 
  Activity, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  Bell,
  ArrowRight,
  Shield
} from 'lucide-react'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { records, fetchRecords } = useRecordStore() // Modified: added fetchRecords back
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const { appointments, fetchAppointments } = useAppointmentStore() // Modified: changed fetchAppts to fetchAppointments
  const [showDropdown, setShowDropdown] = useState(false) // Added this state
  const dropdownRef = useRef<HTMLDivElement>(null) // Added this ref

  // Initial fetch
  useEffect(() => {
    const initData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchRecords(),
          fetchAppointments() // Modified: changed fetchAppts to fetchAppointments
        ])
        const summaryData = await getDashboardSummary()
        setSummary(summaryData.data)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  // New useEffect block for dropdown and initial appointment fetch
  useEffect(() => {
    fetchAppointments() // Ensure appointments are fetched on mount

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Reactively update summary whenever records change
  useEffect(() => {
    if (!records) return

    const updateSummary = async () => {
      try {
        setSummaryLoading(true)
        const summaryData = await getDashboardSummary()
        setSummary(summaryData.data)
      } catch (err) {
        console.error('Error updating dashboard summary:', err)
      } finally {
        setSummaryLoading(false)
      }
    }

    // Always recalculate recent uploads from records
    setRecentUploads(records.slice(0, 4).map(record => {
      const rawDate = new Date(record.visitDate || record.uploadDate || record.createdAt || Date.now())
      const localDate = new Date(rawDate.getTime() + rawDate.getTimezoneOffset() * 60000)
      
      return {
        id: record._id || record.id,
        category: record.category,
        date: localDate.toLocaleDateString(),
        status: record.status
      }
    }))

    // Re-fetch summary if we are not in initial loading
    if (!loading) {
      updateSummary()
    }
  }, [records])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Welcome Back
          </h1>
          <p className="text-gray-500 mt-1">Here's a snapshot of your health overview.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge color="blue" className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-50 border-blue-100 flex items-center space-x-2 shadow-sm">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </Badge>
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

      {/* Main Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="w-24 h-24" />
          </div>
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Health Score</h3>
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-end space-x-3">
              <span className={`text-6xl font-black ${
                (summary?.healthScore || 0) > 80 ? 'text-green-600' : 
                (summary?.healthScore || 0) > 60 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {summary?.healthScore || 0}
              </span>
              <span className="text-xl font-bold text-gray-300 mb-2">/ 100</span>
            </div>

            <div className="pt-2">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${
                    (summary?.healthScore || 0) > 80 ? 'bg-green-500' : 
                    (summary?.healthScore || 0) > 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${summary?.healthScore || 0}%` }}
                />
              </div>
            </div>
          </div>
          {summaryLoading && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-400 animate-pulse" />}
        </Card>

        {/* Abnormal Metrics Card */}
        <Card className="p-8 space-y-5 shadow-xl border-none hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Abnormal Metrics</h3>
            <div className="p-2 bg-red-50 rounded-lg text-red-500 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-black text-gray-900">{summary?.abnormalCount || 0}</span>
            <span className="text-lg font-bold text-gray-400">currently abnormal</span>
          </div>

          <div className="space-y-2">
            {summary?.abnormalCount && summary.abnormalCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.abnormalMetricNames.map((name, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-md border border-red-100 uppercase tracking-wide">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                All tracked metrics are currently normal.
              </p>
            )}
          </div>
        </Card>

        {/* Total Records Card */}
        <div className="p-8 space-y-4 shadow-xl rounded-lg hover:shadow-2xl transition-all duration-300 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Records</h3>
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-black text-white">{records.length}</span>
            <span className="text-lg font-bold text-gray-400">saved</span>
          </div>

          <button 
            onClick={() => navigate('/records')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all border border-white/10 active:scale-95 text-white"
          >
            <span>Browse History</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Uploads Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <Activity className="w-6 h-6 text-blue-500" />
              <span>Recent Activity</span>
            </h2>
            <button 
              onClick={() => navigate('/records')}
              className="text-blue-600 hover:text-blue-700 font-bold text-sm"
            >
              View All
            </button>
          </div>
          
          <Card className="border-none shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="divide-y divide-gray-50">
              {recentUploads.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-transparent">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <Search className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="font-bold text-gray-600">No records found yet</p>
                  <p className="text-sm mt-1">Start by uploading your first medical report</p>
                </div>
              ) : (
                recentUploads.map((upload, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all cursor-pointer group border-l-4 border-transparent hover:border-blue-500"
                    onClick={() => navigate(`/records/${upload.id}`)}
                  >
                    <div className="flex items-center space-x-5">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                        <FileText className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-bold text-gray-900">
                            {(() => {
                              const cat = (upload.category || 'custom').toLowerCase();
                              const mapping: Record<string, string> = {
                                'blood_sugar': 'Blood Sugar',
                                'bp': 'Blood Pressure',
                                'thyroid': 'Thyroid',
                                'cholesterol': 'Cholesterol',
                                'opd': 'OPD',
                                'imaging': 'Imaging',
                                'lab': 'Lab'
                              };
                              return mapping[cat] || cat.replace(/_/g, ' ');
                            })()}
                          </span>
                          <Badge color={['completed', 'active', 'processed'].includes((upload.status || '').toLowerCase()) ? "green" : (upload.status || '').toLowerCase() === "pending" ? "yellow" : "red"}>
                            {upload.status || 'Active'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-400">{upload.date}</p>
                      </div>
                    </div>
                    <div className="p-2 transition-colors">
                      <CheckCircle2 className={`w-6 h-6 ${['completed', 'active', 'processed'].includes((upload.status || '').toLowerCase()) ? 'text-green-500' : 'text-gray-200'}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-none shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Health Reminders</h3>
              </div>
              <div className="space-y-3">
                {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 2).map(appt => (
                  <div 
                    key={appt._id}
                    onClick={() => navigate('/calendar')}
                    className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold truncate pr-2">Dr. {appt.doctorName}</p>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <p className="text-[10px] text-blue-100 font-medium uppercase tracking-widest opacity-80">
                      {new Date(appt.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {appt.time}
                    </p>
                  </div>
                ))}
                {appointments.filter(a => new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-blue-100 opacity-60">No upcoming appointments</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/know-your-report')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all font-bold text-sm border border-transparent hover:border-blue-100 shadow-sm"
              >
                <span>Analyze Report</span>
                <Sparkles className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all font-bold text-sm border border-transparent hover:border-blue-100 shadow-sm"
              >
                <span>View Analytics</span>
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard