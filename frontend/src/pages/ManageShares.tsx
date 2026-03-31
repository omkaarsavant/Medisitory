import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Trash2, Calendar, FileText, AlertTriangle, 
  Edit3, X, Search, MessageSquare, Users, UserPlus, Send,
  CheckCircle, Loader2, Check, QrCode, Activity, Plus, Bell, ChevronRight, Home, Brain
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { 
  getActiveShares, DoctorAccess,
  sendDoctorRequest, getMyRequests, DoctorRequestData
} from '../services/doctorAccessService'
import { getRecords, MedicalRecord } from '../services/api'
import { Card, Badge, Button } from '../components'
import { useChatStore } from '../store/chatStore'

const ManageShares: React.FC = () => {
  const navigate = useNavigate()
  const [shares, setShares] = useState<DoctorAccess[]>([])
  const [records, setRecords] = useState<Record<string, MedicalRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { openChat } = useChatStore()
  
  // Add Doctor Modal State
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false)
  const [doctorIdInput, setDoctorIdInput] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [allRequests, setAllRequests] = useState<DoctorRequestData[]>([])
  
  // Edit/Revoke State
  const [editingShare, setEditingShare] = useState<DoctorAccess | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<DoctorAccess | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [editSearchTerm, setEditSearchTerm] = useState('')
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const startScanning = () => {
    setIsScanning(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-doctor",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render((decodedText) => {
        scanner.clear()
        setIsScanning(false)
        setDoctorIdInput(decodedText.toUpperCase())
      }, (err) => {
        // Ignore errors
      })
    }, 100)
  }

  const stopScanning = () => {
    setIsScanning(false)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sharesData, recordsData, requestsData] = await Promise.all([
        getActiveShares(),
        getRecords({ limit: 100 }),
        getMyRequests()
      ])
      
      setShares(sharesData)
      setAllRequests(requestsData)
      
      const recordMap: Record<string, MedicalRecord> = {}
      recordsData.data.records.forEach(r => {
        recordMap[r._id || r.id] = r
      })
      setRecords(recordMap)
      
      setError(null)
    } catch (err) {
      console.error('Error fetching shares:', err)
      setError('Failed to load active shares')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (share: DoctorAccess) => {
    setEditingShare(share)
    setTempSelectedIds(share.recordIds)
  }

  const handleRevokeClick = (share: DoctorAccess) => {
    setRevokeTarget(share)
  }

  const executeRevoke = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      const { revokeAccess } = await import('../services/doctorAccessService')
      await revokeAccess(revokeTarget.shareToken)
      setRevokeTarget(null)
      fetchData()
    } catch (err) {
      alert('Failed to revoke access')
    } finally {
      setIsRevoking(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingShare) return
    setIsUpdating(true)
    try {
      const { updateShareRecords } = await import('../services/doctorAccessService')
      await updateShareRecords(editingShare.shareToken, tempSelectedIds)
      setEditingShare(null)
      fetchData()
    } catch (err) {
      alert('Failed to update records')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleRecordSelection = (id: string) => {
    setTempSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const getMobileCategoryStyle = (category: string) => {
      const cat = (category || 'custom').toLowerCase()
      if (cat.includes('blood') || cat.includes('sugar')) return { bg: 'bg-[#ffdad6]/30', text: 'text-[#ba1a1a]', icon: <Activity className="w-6 h-6" /> }
      if (cat.includes('vaccine') || cat.includes('immun')) return { bg: 'bg-[#67fcc6]/20', text: 'text-[#006c4f]', icon: <Shield className="w-6 h-6" /> }
      if (cat.includes('x-ray') || cat.includes('imag') || cat.includes('scan') || cat.includes('radiology')) return { bg: 'bg-[#c5c7c8]/20', text: 'text-[#414754]', icon: <Search className="w-6 h-6" /> }
      return { bg: 'bg-[#036cfb]/10', text: 'text-[#0055c9]', icon: <FileText className="w-6 h-6" /> }
  }

  const handleSendRequest = async () => {
    const inputId = doctorIdInput.trim()
    if (!inputId) {
      alert('Please enter a Doctor ID')
      return
    }

    const existingEntry = allRequests.find(r => r.doctorUniqueId === inputId && r.status !== 'Rejected')
    if (existingEntry) {
      if (existingEntry.status === 'Accepted') {
        alert('Doctor is already connected to your profile.')
      } else {
        alert('A connection request is already pending for this doctor.')
      }
      return
    }

    try {
      setSendingRequest(true)
      await sendDoctorRequest(inputId, 'Jane Doe')
      const newRequests = await getMyRequests()
      setAllRequests(newRequests)
      
      setSendSuccess(true)
      setTimeout(() => {
        setSendSuccess(false)
        setIsAddDoctorOpen(false)
        setDoctorIdInput('')
      }, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send request'
      alert(msg)
    } finally {
      setSendingRequest(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased pb-32">
      <div className="hidden md:block">
        <main className="max-w-5xl mx-auto p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase italic leading-none">Clinician Hub</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Manage your healthcare network & data reach</p>
            </div>
            <button
              onClick={() => setIsAddDoctorOpen(true)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center gap-3 group"
            >
              <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Add Doctor
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Clinician Data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-red-900 uppercase tracking-widest mb-2">Error Syncing Hub</h3>
              <p className="text-red-700 font-medium mb-8 text-sm">{error}</p>
              <Button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white border-none px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-200">Retry Connection</Button>
            </div>
          ) : shares.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-24 text-center shadow-sm">
              <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3 shadow-inner">
                <Shield className="w-12 h-12 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-3">Privacy Shield Active</h3>
              <p className="text-gray-500 font-medium max-w-sm mx-auto text-lg leading-relaxed mb-8">
                You haven't connected with any clinicians yet. Add a doctor using their unique ID to get started.
              </p>
              <button
                onClick={() => setIsAddDoctorOpen(true)}
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-200 active:scale-95 inline-flex items-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                Add Your First Doctor
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {shares.map((share) => (
                <div key={share.shareToken} className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-indigo-200/30 hover:border-indigo-100 transition-all duration-500 overflow-hidden relative border-l-8 border-l-transparent hover:border-l-indigo-600">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 transition-all duration-300">
                        <Users className="w-8 h-8 text-indigo-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                            {share.doctorName || 'Assigned Clinician'}
                          </h3>
                          <Badge color="green" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest italic bg-green-50 text-green-600 border-none">Verified</Badge>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="text-indigo-500/80">Clinician ID:</span> {share.shareToken.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            const freshData = await (await import('../services/doctorAccessService')).getSharedRecords(share.shareToken, true)
                            const sharedOnly = (freshData.records || []).filter((r: any) => !r.isRestricted)
                            openChat(share.shareToken, 'patient', 'Patient', share.doctorName || 'Doctor', sharedOnly as MedicalRecord[])
                          } catch {
                            const shareRecords = share.recordIds.map(id => records[id]).filter(Boolean) as MedicalRecord[]
                            openChat(share.shareToken, 'patient', 'Patient', share.doctorName || 'Doctor', shareRecords)
                          }
                        }}
                        className="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-indigo-100 active:scale-95 flex-1 sm:flex-none"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Open Chat
                      </button>
                      <button 
                        onClick={() => handleEditClick(share)}
                        className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all border border-gray-100 active:scale-95"
                      >
                        <Edit3 className="w-4 h-4" />
                        Manage Records
                      </button>
                      <button 
                        onClick={() => handleRevokeClick(share)}
                        className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all border border-rose-100 active:scale-95 group"
                      >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        Revoke Access
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Authorized Since</span>
                      <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span className="font-black text-gray-900 text-sm">{new Date(share.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between pl-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reports Shared</span>
                        <Badge color="blue" className="px-2 py-0 text-[9px] font-black uppercase">{share.recordIds.length} Reports</Badge>
                      </div>
                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                        <div className="flex flex-wrap gap-2">
                          {share.recordIds.map(id => {
                            const record = records[id]
                            return (
                              <div key={id} className="px-2.5 py-1 bg-white rounded-lg border border-gray-100 flex items-center gap-2 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="text-[9px] font-black text-gray-800 uppercase tracking-tight">
                                  {record ? record.category.replace(/_/g, ' ') : 'Hub Synchronizing...'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setIsAddDoctorOpen(true)}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl shadow-indigo-100 active:scale-95 flex items-center gap-4 group"
            >
              <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Add Doctor
            </button>
          </div>
        </main>
      </div>

      <div className="md:hidden">
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
                    {shares.length > 0 && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
                    )}
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
               <button onClick={() => setShowNotifications(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">
                 Close
               </button>
            </div>
          </div>
        )}

        <main className="pt-10 px-4 max-w-lg mx-auto space-y-6">
          {loading ? (
             <div className="text-center py-20">
               <Loader2 className="animate-spin w-10 h-10 text-indigo-500 mx-auto mb-4" />
               <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Syncing Connections...</p>
             </div>
          ) : shares.length === 0 ? (
            <section className="bg-white rounded-2xl p-10 shadow-sm text-center space-y-4 border border-white/50">
               <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                 <Shield className="w-10 h-10" />
               </div>
               <h3 className="font-headline font-bold text-lg text-on-surface">No Doctors Connected</h3>
               <p className="text-sm text-on-surface-variant leading-relaxed">Add a doctor to securely share your medical reports.</p>
               <button 
                 onClick={() => setIsAddDoctorOpen(true)}
                 className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all"
               >
                 ADD DOCTOR
               </button>
            </section>
          ) : (
            shares.map(share => {
              return (
                <div 
                  key={share.shareToken} 
                  onClick={() => navigate(`/manage-shares/${share.shareToken}`)}
                  className="animate-in fade-in duration-500 active:scale-[0.98] transition-transform"
                >
                  <section className="bg-white rounded-[2rem] p-6 shadow-[0_20px_40px_rgba(25,28,29,0.04)] relative overflow-hidden border border-white/50">
                      <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-blue-50">
                                  <img 
                                    className="w-full h-full object-cover" 
                                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200" 
                                    alt="Doctor"
                                  />
                              </div>
                              <div className="absolute -bottom-2 -right-2 bg-[#0055c9] text-white p-1 rounded-full border-4 border-white shadow-sm">
                                  <CheckCircle className="w-4 h-4 fill-current" />
                              </div>
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                      <h2 className="font-headline font-bold text-xl text-[#191c1d] truncate" style={{ fontFamily: 'Manrope' }}>{share.doctorName || 'Dr. Specialist'}</h2>
                                      <p className="text-[#414754] text-sm font-medium truncate opacity-60">Medical Professional</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className="shrink-0 bg-[#67fcc6]/30 text-[#007354] text-[10px] font-black px-2 py-1 rounded-full tracking-widest uppercase italic">Active</span>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#edeeef] text-[#0055c9] shadow-inner shadow-black/5">
                                      <ChevronRight className="w-6 h-6" />
                                    </div>
                                  </div>
                              </div>
                              <div className="mt-3 flex items-center gap-4">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] text-[#717786] font-bold uppercase tracking-wider opacity-60">Experience</span>
                                      <span className="text-sm font-black text-[#0055c9]">14 Years</span>
                                  </div>
                                  <div className="w-px h-6 bg-[#edeeef]"></div>
                                  <div className="flex flex-col">
                                      <span className="text-[10px] text-[#717786] font-bold uppercase tracking-wider opacity-60">Rating</span>
                                      <span className="text-sm font-black text-[#0055c9]">4.9/5.0</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </section>
                </div>
              );
            })
          )}
          <div className="pt-8"></div>
        </main>

        <button 
            onClick={() => setIsAddDoctorOpen(true)}
            className="fixed right-6 bottom-28 w-14 h-14 bg-[#006c4f] text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-transform z-50 shadow-[#006c4f]/30"
        >
            <Plus className="w-6 h-6" />
        </button>

        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl rounded-t-[2.5rem] z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] border-t border-slate-100">
            <div onClick={() => navigate('/records')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <FileText className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Records</span>
            </div>
            <div onClick={() => navigate('/manage-shares')} className="flex flex-col items-center justify-center bg-[#0055c9]/10 text-[#0055c9] rounded-full px-5 py-2 active:scale-90 duration-200 cursor-pointer">
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
            <div onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
                <Calendar className="w-6 h-6" />
                <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Calendar</span>
            </div>
        </nav>
      </div>

      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191c1d]/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-[0_20px_40px_rgba(25,28,29,0.12)] overflow-hidden border border-[#c1c6d7]/10 animate-in zoom-in-95 duration-300">
            <div className="px-6 pt-10 pb-4 flex justify-between items-center">
                <h2 className="font-headline font-bold text-2xl text-[#191c1d] tracking-tight uppercase italic" style={{ fontFamily: 'Manrope' }}>Connect Doctor</h2>
                <button
                    onClick={() => { setIsAddDoctorOpen(false); setSendSuccess(false); stopScanning() }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#edeeef] transition-colors">
                    <X className="w-5 h-5 text-[#414754]" />
                </button>
            </div>

            {sendSuccess ? (
              <div className="px-6 pb-12 pt-4 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-emerald-50/50">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight mb-2">Request Sent!</h3>
                <p className="text-[#414754] font-bold text-[10px] uppercase tracking-widest px-4 leading-relaxed opacity-70">
                  Waiting for the doctor to accept your request.
                </p>
                <button 
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="mt-10 w-full py-5 bg-[#0055c9] text-white rounded-full font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#0055c9]/20"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : isScanning ? (
              <div className="px-6 pb-10 pt-4 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6 px-1">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scan Doctor QR</h3>
                  <button onClick={stopScanning} className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 hover:underline">
                    <X className="w-3 h-3" /> Stop
                  </button>
                </div>
                <div id="qr-reader-doctor" className="w-full overflow-hidden rounded-[2.5rem] border-2 border-[#0055c9]/10 shadow-inner bg-gray-50 aspect-square flex items-center justify-center relative">
                   <div className="absolute inset-0 border-[3px] border-dashed border-[#0055c9]/20 rounded-[2.5rem] m-2"></div>
                   <div className="animate-pulse text-[#0055c9]/30 font-black text-[10px] uppercase tracking-widest">Initializing...</div>
                </div>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-[0.2em] font-black mt-8 opacity-60">Align QR within the frame</p>
              </div>
            ) : (
              <div className="px-6 pb-10 pt-4">
                <p className="text-[#414754] text-sm font-medium leading-relaxed mb-10 opacity-80">
                    Enter the doctor's unique ID to send a connection request
                </p>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black tracking-[0.15em] text-[#414754] uppercase opacity-60 px-1">
                            DOCTOR'S UNIQUE ID
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <input
                                    value={doctorIdInput}
                                    onChange={e => setDoctorIdInput(e.target.value.toUpperCase())}
                                    className="w-full bg-[#f3f4f5] border-0 border-b-[3px] border-transparent focus:border-[#0055c9] focus:ring-0 rounded-t-xl px-5 py-4 text-lg font-black tracking-widest transition-all placeholder:text-[#717786]/30 placeholder:font-medium placeholder:tracking-normal"
                                    placeholder="e.g. DOC-A3X9K2" type="text" autoFocus />
                            </div>
                            <button
                                onClick={startScanning}
                                className="bg-[#e7e8e9] w-14 h-14 rounded-xl flex items-center justify-center text-[#0055c9] hover:bg-[#e1e3e4] transition-colors active:scale-95 shadow-sm">
                                <QrCode className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 flex gap-4">
                        <button
                            onClick={() => setIsAddDoctorOpen(false)}
                            className="flex-1 py-5 rounded-full text-[#414754] font-black text-[11px] uppercase tracking-widest hover:bg-[#edeeef] transition-colors active:scale-95">
                            Cancel
                        </button>
                        <button
                            onClick={handleSendRequest}
                            disabled={sendingRequest || !doctorIdInput.trim()}
                            className="flex-1 py-5 rounded-full bg-[#0055c9] text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[#0055c9]/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30">
                            {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span>{sendingRequest ? 'Sending...' : 'Send Request'}</span>
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#191c1d]/5 backdrop-blur-sm z-0" onClick={() => setEditingShare(null)}></div>
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] sm:max-h-[751px] bg-white/75 backdrop-blur-[25px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-white/60 animate-in zoom-in-95 fade-in duration-300">
            <div className="px-6 pt-10 pb-4 flex flex-col items-center text-center relative">
                <button onClick={() => setEditingShare(null)} className="absolute right-6 top-6 p-2 rounded-full hover:bg-black/5 transition-colors">
                    <X className="w-6 h-6 text-[#44474e]" />
                </button>
                <div className="w-16 h-16 bg-[#0055c9] rounded-full flex items-center justify-center shadow-lg shadow-[#0055c9]/20 mb-4">
                    <Shield className="text-white w-8 h-8" />
                </div>
                <h1 className="font-extrabold text-2xl tracking-tight text-[#191c1d] uppercase" style={{ fontFamily: 'Manrope' }}>MANAGE ACCESS</h1>
                <p className="text-[#44474e] font-medium text-sm mt-1">Controlling visibility for {editingShare.doctorName}</p>
            </div>
            <div className="px-6 py-4">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-[#74777f]" />
                    <input
                        value={editSearchTerm}
                        onChange={e => setEditSearchTerm(e.target.value)}
                        className="w-full bg-[#e7e8e9]/50 border-none rounded-full py-4 pl-12 pr-6 text-sm font-semibold tracking-wider placeholder:text-[#74777f] focus:ring-2 focus:ring-[#0055c9]/20 transition-all text-[#191c1d]"
                        placeholder="SEARCH RECORDS TO SHARE..." type="text" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
                <div className="space-y-4 pb-4">
                    {Object.values(records)
                      .filter(r => {
                          const cat = r.category || 'custom'
                          return cat.toLowerCase().includes(editSearchTerm.toLowerCase()) || 
                                 (r.doctorName || '').toLowerCase().includes(editSearchTerm.toLowerCase())
                      })
                      .map(record => {
                          const id = record._id || record.id || ''
                          const isSelected = tempSelectedIds.includes(id)
                          const style = getMobileCategoryStyle(record.category || '')

                          return (
                            <div key={id} onClick={() => toggleRecordSelection(id)} className={`${isSelected ? 'bg-white border-2 border-[#0055c9] shadow-xl shadow-[#0055c9]/10' : 'bg-white/60 backdrop-blur-[10px] border border-white/50 hover:bg-white/80'} rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 ${style.bg} ${style.text} rounded-full flex items-center justify-center`}>
                                        {style.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-[#191c1d] uppercase truncate" style={{ fontFamily: 'Manrope' }}>{record.category ? record.category.toUpperCase().replace(/_/g, ' ') : 'GENERAL CONSULTATION'}</h3>
                                        <p className="text-[#44474e] text-sm font-medium">{new Date(record.visitDate || record.createdAt).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'border-2 border-[#0055c9] bg-[#0055c9]' : 'border-2 border-[#c1c6d7]'}`}>
                                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                </div>
                            </div>
                          )
                      })}
                </div>
            </div>
            {/* Selection Summary */}
            <div className="px-6 py-4 flex justify-between items-center border-t border-[#c1c6d7]/30">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0055c9] animate-pulse"></span>
                    <span className="font-extrabold text-[#191c1d] text-sm tracking-widest" style={{ fontFamily: 'Manrope' }}>{tempSelectedIds.length} SELECTED</span>
                </div>
                <button onClick={() => setTempSelectedIds([])} className="text-[#0055c9] font-bold text-sm hover:underline">Clear All</button>
            </div>
            {/* Actions Footer */}
            <div className="px-6 pb-8 pt-2 grid grid-cols-2 gap-4">
                <button
                    onClick={() => setEditingShare(null)}
                    className="h-14 rounded-full bg-[#e7e8e9]/80 text-[#191c1d] font-bold text-sm tracking-widest active:scale-95 transition-transform uppercase">
                    CANCEL
                </button>
                <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="h-14 rounded-full bg-[#0055c9] text-white font-bold text-sm tracking-widest shadow-lg shadow-[#0055c9]/30 active:scale-95 transition-transform uppercase flex items-center justify-center">
                    {isUpdating ? 'UPDATING...' : 'UPDATE ACCESS'}
                </button>
            </div>
          </div>
        </div>
      )}
      {/* Revocation Confirmation Engine */}
      {revokeTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191c1d]/5 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-sm bg-white/95 backdrop-blur-[20px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 text-center animate-in zoom-in-95 duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-600">
              <Shield className="w-32 h-32 rotate-[15deg] translate-x-8 -translate-y-8" />
            </div>
            
            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-rose-50/50">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight leading-none mb-4" style={{ fontFamily: 'Manrope' }}>Revoke Access?</h2>
            <p className="text-[#414754] font-bold text-[11px] leading-relaxed uppercase tracking-[0.15em] mb-10 px-2 opacity-80">
              Are you sure you want to terminate clinical connection with <span className="text-gray-900 border-b-2 border-rose-100">{revokeTarget.doctorName}</span>? This will immediately block their access to your shared medical documentation.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={executeRevoke}
                disabled={isRevoking}
                className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-100 active:scale-95 flex items-center justify-center gap-2"
              >
                {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isRevoking ? 'Revoking Access...' : 'Yes, Terminate Connection'}
              </button>
              <button 
                onClick={() => setRevokeTarget(null)}
                className="w-full py-5 bg-gray-50 hover:bg-white text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:text-gray-900 active:scale-95"
              >
                No, Keep Connected
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ManageShares
