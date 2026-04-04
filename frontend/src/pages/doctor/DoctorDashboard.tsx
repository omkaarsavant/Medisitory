import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDoctorStore } from '../../store/doctorStore'
import { 
  Users, Clock, ArrowRight, Activity, Trash2, Search, 
  Copy, Check, UserCheck, UserX, Loader2, Bell, Hash, QrCode
} from 'lucide-react'
import { 
  getDoctorUniqueId, getDoctorRequests, respondToRequest, 
  getSharedRecords, DoctorRequestData, revokeAccess
} from '../../services/doctorAccessService'
import QRCode from 'react-qr-code'

const DoctorDashboard: React.FC = () => {
  const store = useDoctorStore()
  const { savedPatients, removePatient, unreadCounts, doctorUniqueId, setDoctorUniqueId, addPatient } = store
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<DoctorRequestData[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch or generate doctor ID
    const fetchDoctorId = async () => {
      try {
        const id = await getDoctorUniqueId(doctorUniqueId || undefined)
        setDoctorUniqueId(id)
      } catch (err) {
        console.error('Error fetching doctor ID:', err)
      }
    }
    if (!doctorUniqueId) {
      fetchDoctorId()
    }
  }, [])

  // Refresh function for patients and requests
  const refreshData = React.useCallback(async () => {
    // Get latest state from store without triggering dependency loops
    const currentDoctorId = useDoctorStore.getState().doctorUniqueId
    const currentPatients = useDoctorStore.getState().savedPatients
    
    if (!currentDoctorId) return
    
    try {
      // 1. Fetch connection requests
      const data = await getDoctorRequests(currentDoctorId)
      setPendingRequests(data.filter(r => r.status === 'Pending'))
      
      // 2. Validate/refresh saved patients to ensure accurate record counts
      if (currentPatients.length > 0) {
        for (const patient of currentPatients) {
          try {
            const patientData = await getSharedRecords(patient.shareToken, true)
            addPatient(patientData, patient.shareToken)
          } catch (err: any) {
            if (err?.response?.status === 404) {
              removePatient(patient.shareToken)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching healthcare data:', err)
    }
  }, [addPatient, removePatient])

  useEffect(() => {
    if (doctorUniqueId) {
      refreshData()
      // Poll every 10 seconds for updates
      const interval = setInterval(refreshData, 10000)
      return () => clearInterval(interval)
    }
  }, [doctorUniqueId, refreshData])

  const handleCopyId = () => {
    if (doctorUniqueId) {
      navigator.clipboard.writeText(doctorUniqueId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRespond = async (requestId: string, accept: boolean) => {
    try {
      setRespondingId(requestId)
      const result = await respondToRequest(requestId, accept, 'Doctor')
      
      // If accepted, fetch the shared records and auto-save the patient
      if (accept && result.data?.shareToken) {
        try {
          const patientData = await getSharedRecords(result.data.shareToken)
          addPatient(patientData, result.data.shareToken)
        } catch (err) {
          console.error('Error fetching patient data after accept:', err)
        }
      }
      
      // Remove from pending
      setPendingRequests(prev => prev.filter(r => r._id !== requestId))
    } catch (err) {
      alert('Failed to respond to request')
    } finally {
      setRespondingId(null)
    }
  }

  const handleRemove = async (e: React.MouseEvent, token: string) => {
    e.stopPropagation()
    if (window.confirm('Remove this patient access? This will also revoke your access to their records.')) {
      try {
        await revokeAccess(token)
        removePatient(token)
      } catch (err) {
        alert('Failed to revoke access')
      }
    }
  }

  const filteredPatients = savedPatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-body text-[#191c1d]">
      {/* Mobile View - Exact match for dochome.html design */}
      <div className="block md:hidden">
        {/* TopAppBar Shell */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex justify-between items-center px-6 py-4 shadow-[0_20px_40px_rgba(25,28,29,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#edeeef]">
              <img 
                alt="Doctor Profile Picture" 
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXbAvgyeO95AuQDIRrAhDNEnPCD8c6YnieA9TvsE17CWaCDXlZ-N4LaJc2ETMEhn-2VPRnrhOAUi_kiB6Yqi18Az222g6dMhJICheinH50TyRoCfhaAppJKxxZsCGlmcZVPHSlluRteGF3sSTEkKC_V19O_8dWilLiAAq_qZnWQlKGF2aD0XjnHnzqh-3MBrf-albT5rkD7YLn7Lqr5OiJUZZwjDQCsbGuO2Tkk2q4aN9jtSzfPnqDV0ldCa_-_86qfjVJ8u2jzMM" 
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline font-black text-xl text-[#0055c9] leading-none">Clinical Sanctuary</h1>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">MedVault Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100/50 transition-all">
              <span className="material-symbols-outlined text-[#414754]">notifications</span>
            </button>
          </div>
        </header>

        <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
          {/* Doctor ID Banner Card */}
          <section className="relative overflow-hidden p-6 rounded-[1rem] bg-gradient-to-br from-[#0055c9] to-[#036cfb] text-white shadow-xl">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Unique Provider Identity</p>
                  <h2 className="font-headline text-3xl font-extrabold tracking-tighter">{doctorUniqueId || 'LOADING...'}</h2>
                </div>
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl">verified_user</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 transition-all rounded-full text-xs font-bold backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copied' : 'Copy ID'}
                </button>
                <button 
                  onClick={() => setShowQr(!showQr)}
                  className={`flex items-center gap-2 px-4 py-2 transition-all rounded-full text-xs font-bold backdrop-blur-sm ${showQr ? 'bg-white text-[#0055c9]' : 'bg-white/20 hover:bg-white/30'}`}
                >
                  <span className="material-symbols-outlined text-sm">qr_code_2</span>
                  QR Code
                </button>
              </div>
              {showQr && (
                <div className="bg-white p-4 rounded-2xl shadow-2xl mt-2 flex justify-center animate-in zoom-in-95">
                  <QRCode value={doctorUniqueId || ''} size={140} level="H" />
                </div>
              )}
            </div>
          </section>

          {/* Search Section */}
          <section className="space-y-4">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#414754] transition-colors group-focus-within:text-[#0055c9]">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients by name or ID..."
                className="w-full pl-12 pr-6 py-4 bg-white rounded-[1rem] border-none shadow-[0_10px_30px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#0055c9]/20 placeholder:text-slate-400 font-medium"
              />
            </div>
          </section>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#006c4f] animate-pulse"></div>
              <span className="text-sm font-bold text-[#191c1d]">{savedPatients.length} Active Session{savedPatients.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Incoming Connection Requests Section */}
          {pendingRequests.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-headline text-xl font-bold tracking-tight px-2 flex items-center gap-2 text-amber-600">
                <span className="material-symbols-outlined">notifications_active</span>
                New Requests
              </h3>
              <div className="space-y-4">
                {pendingRequests.map(req => (
                  <div key={req._id} className="bg-white rounded-[1rem] p-5 border-2 border-amber-100 shadow-xl shadow-amber-50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center font-black text-amber-600">
                        {req.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#191c1d]">{req.patientName}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRespond(req._id, true)}
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleRespond(req._id, false)}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Patients List */}
          <section className="space-y-6">
            <h3 className="font-headline text-xl font-bold tracking-tight px-2">My Patients</h3>
            <div className="space-y-6">
              {filteredPatients.map((patient) => {
                const sharedAt = new Date(patient.sharedAt);
                const diffMs = Date.now() - sharedAt.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                
                return (
                  <div 
                    key={patient.shareToken}
                    onClick={() => navigate(`/doctor/patient/${patient.shareToken}`)}
                    className="glass-panel p-6 rounded-[1rem] shadow-[0_20px_40px_rgba(25,28,29,0.06)] hover:translate-y-[-4px] transition-all cursor-pointer relative"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-indigo-50 flex items-center justify-center text-[#0055c9] font-black text-2xl">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-headline font-bold text-lg text-[#191c1d]">{patient.name}</h4>
                            <p className="text-sm font-medium text-[#414754]">ID: {patient.patientId.substring(0, 8)}</p>
                          </div>
                          <span className="bg-[#006c4f]/10 text-[#006c4f] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">In-Session</span>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[#0055c9] text-lg">folder_shared</span>
                            <span className="text-xs font-bold text-[#191c1d]">{patient.recordCount} Records</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[#006c4f] text-lg">schedule</span>
                            <span className="text-xs font-bold text-[#191c1d]">Started {diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins/60)}h ago`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleRemove(e, patient.shareToken)}
                      className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                );
              })}
              
              {filteredPatients.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-[1rem] p-12 flex flex-col items-center justify-center text-center opacity-60">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_add</span>
                  <p className="text-sm font-medium text-slate-500">
                    {savedPatients.length === 0 ? 'No active patient sessions.\nShare your ID to connect.' : 'No patients match your search.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 w-full z-50 bg-white/80 backdrop-blur-md px-8 py-4 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)] border-t border-slate-50">
          <button onClick={() => navigate('/doctor')} className="flex flex-col items-center gap-1 text-[#0055c9] font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">My Patients</span>
          </button>
          <button onClick={() => navigate('/doctor/appointments')} className="flex flex-col items-center gap-1 text-slate-400 group">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Schedules</span>
          </button>
          <button onClick={() => navigate('/doctor/scan')} className="flex flex-col items-center gap-1 text-slate-400 group">
            <span className="material-symbols-outlined">qr_code_scanner</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Scan</span>
          </button>
          <button onClick={() => navigate('/doctor/profile')} className="flex flex-col items-center gap-1 text-slate-400 group">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
          </button>
        </nav>

        {/* Floating Action Button */}
        <button 
          onClick={() => navigate('/doctor/scan')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#0055c9] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      {/* Desktop View - Original Design Preserved */}
      <div className="hidden md:block p-6 lg:p-10 min-h-full bg-gradient-to-br from-[#F8FAFC] to-indigo-50/30">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">My Patients</h1>
              <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                {savedPatients.length} Active Sessions
              </p>
            </div>
          </div>

          {/* Doctor Unique ID Card */}
          {doctorUniqueId && (
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200/50 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5" />
                      Your Unique Doctor ID
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl lg:text-5xl font-black tracking-[0.15em] text-white">{doctorUniqueId}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleCopyId}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                          title="Copy to clipboard"
                        >
                          {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => setShowQr(!showQr)}
                          className={`p-3 rounded-xl transition-all active:scale-90 ${showQr ? 'bg-white text-indigo-700' : 'bg-white/10 hover:bg-white/20'}`}
                          title="Display QR Code"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {showQr ? (
                    <div className="bg-white p-4 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                      <QRCode 
                        value={doctorUniqueId} 
                        size={140}
                        level="H"
                        className="rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-indigo-200 font-medium max-w-xs leading-relaxed">
                      Share this ID with patients so they can send you a connection request from their MedVault app.
                    </div>
                  )}
                </div>
              </div>
              <Activity className="absolute right-[-30px] bottom-[-30px] w-60 h-60 text-white/5" />
            </div>
          )}

          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </div>
                <h2 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">
                  Incoming Connection Requests ({pendingRequests.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map(req => (
                  <div key={req._id} className="bg-white rounded-[2rem] p-6 border-2 border-amber-200 shadow-xl shadow-amber-50 hover:shadow-2xl transition-all">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shadow-inner">
                        <span className="text-amber-600 font-black text-xl">
                          {req.patientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{req.patientName}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRespond(req._id, true)}
                        disabled={respondingId === req._id}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center gap-2"
                      >
                        {respondingId === req._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRespond(req._id, false)}
                        disabled={respondingId === req._id}
                        className="flex-1 py-3.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:bg-gray-50 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 flex items-center justify-center gap-2 border border-gray-200 hover:border-red-200"
                      >
                        <UserX className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search patients by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-xl shadow-gray-200/20 font-bold text-gray-700 placeholder:text-gray-300"
              />
            </div>
          </div>

          {savedPatients.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-16 text-center shadow-xl shadow-indigo-50/50">
              <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3">
                <Activity className="w-12 h-12 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">No active patient sessions</h3>
              <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 text-lg leading-relaxed">
                Share your unique ID <strong className="text-indigo-600">{doctorUniqueId}</strong> with patients, or scan their MedVault QR code to connect.
              </p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest">No patients match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.shareToken}
                  onClick={() => navigate(`/doctor/patient/${patient.shareToken}`)}
                  className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-indigo-200/40 hover:-translate-y-1 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300 shadow-inner">
                        <span className="text-indigo-600 group-hover:text-white font-black text-xl tracking-tighter transition-colors">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {unreadCounts[patient.shareToken] > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 z-20">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white items-center justify-center text-[8px] font-black text-white italic">
                            {unreadCounts[patient.shareToken] > 9 ? '9+' : unreadCounts[patient.shareToken]}
                          </span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => handleRemove(e, patient.shareToken)}
                      className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1 truncate">
                    {patient.name}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">
                    ID: {patient.patientId.substring(0, 8)}...
                  </p>

                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg text-indigo-600">
                      <Activity className="w-3.5 h-3.5" />
                      {patient.recordCount} Records
                    </span>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 w-0 group-hover:w-full transition-all duration-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

}

export default DoctorDashboard
