import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Shield, Trash2, Calendar, FileText, Clock, AlertTriangle,
  Edit3, X, CheckSquare, Square, Save, Search, MessageSquare,
  CheckCircle, Loader2, Activity, Plus, ChevronRight, Check, Home
} from 'lucide-react'
import {
  getActiveShares, revokeAccess, updateShareRecords, DoctorAccess
} from '../services/doctorAccessService'
import { getRecords, MedicalRecord } from '../services/api'
import { Card } from '../components'
import { useChatStore } from '../store/chatStore'

const DoctorDetail: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { openChat } = useChatStore()

  const [share, setShare] = useState<DoctorAccess | null>(null)
  const [records, setRecords] = useState<Record<string, MedicalRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [editSearchTerm, setEditSearchTerm] = useState('')

  // Revoke Modal State
  const [isRevokingOpen, setIsRevokingOpen] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  useEffect(() => {
    fetchData()
  }, [token])

  const fetchData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const [sharesData, recordsData] = await Promise.all([
        getActiveShares(),
        getRecords({ limit: 100 })
      ])

      const currentShare = sharesData.find(s => s.shareToken === token)
      if (!currentShare) {
        setError('Connection not found or has expired.')
        return
      }

      setShare(currentShare)

      const recordMap: Record<string, MedicalRecord> = {}
      recordsData.data.records.forEach(r => {
        recordMap[r._id || r.id] = r
      })
      setRecords(recordMap)
      setError(null)
    } catch (err) {
      console.error('Error fetching detail:', err)
      setError('Failed to load clinical connection details.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!share) return
    if (tempSelectedIds.length === 0) {
      alert('At least one record must be selected. To stop sharing all records, use the Revoke button.')
      return
    }

    try {
      setIsUpdating(true)
      const updatedShare = await updateShareRecords(share.shareToken, tempSelectedIds)
      setShare(updatedShare)
      setIsEditing(false)
    } catch (err) {
      alert('Failed to update shared records')
    } finally {
      setIsUpdating(false)
    }
  }

  const executeRevoke = async () => {
    if (!share) return
    try {
      setIsRevoking(true)
      await revokeAccess(share.shareToken)
      navigate('/manage-shares')
    } catch (err) {
      alert('Failed to revoke access. Please try again.')
    } finally {
      setIsRevoking(false)
      setIsRevokingOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin w-12 h-12 text-[#0055c9] mb-4" />
        <p className="text-sm font-bold text-outline uppercase tracking-widest">Loading Clinical Data...</p>
      </div>
    )
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-black text-on-surface mb-2">Connection Error</h2>
        <p className="text-on-surface-variant mb-8 px-4">{error || 'Unable to find this clinical connection.'}</p>
        <button
          onClick={() => navigate('/manage-shares')}
          className="px-8 py-4 bg-[#0055c9] text-white rounded-2xl font-bold tracking-wide shadow-lg shadow-[#0055c9]/20 active:scale-95 transition-all"
        >
          BACK TO DOCTORS
        </button>
      </div>
    )
  }

  const shareRecords = share.recordIds.map(id => records[id]).filter(Boolean)
  const categories = Array.from(new Set(shareRecords.map(r => r.category.toUpperCase().replace(/_/g, ' '))))

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Premium Header */}
      <header className="fixed top-0 left-0 w-full z-[80] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/manage-shares')}
          className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-on-surface active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-on-surface tracking-tight leading-none" style={{ fontFamily: 'Manrope' }}>Details</h1>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1 opacity-60">Clinical Connection</p>
        </div>
        <button className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest italic outline outline-1 outline-emerald-100">
          Active
        </button>
      </header>

      <main className="pt-10 px-4 max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Doctor Profile Card */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(25,28,29,0.04)] relative overflow-hidden border border-white/50" >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-[2rem] overflow-hidden ring-4 ring-blue-50 shadow-inner">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200"
                  alt="Doctor"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#0055c9] text-white p-1.5 rounded-full border-4 border-white shadow-sm">
                <CheckCircle className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div>
              <h2 className="font-headline font-bold text-2xl text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>{share.doctorName || 'Dr. Specialist'}</h2>
              <p className="text-[#414754] text-sm font-bold uppercase tracking-widest opacity-40 mt-1">Medical Professional</p>
            </div>
            <div className="w-full grid grid-cols-2 gap-4 mt-2">
              <div className="bg-slate-50/80 rounded-2xl p-4">
                <span className="block text-[10px] text-[#717786] font-bold uppercase tracking-widest opacity-60 mb-1">Experience</span>
                <span className="text-lg font-black text-[#0055c9]">14 Years</span>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-4">
                <span className="block text-[10px] text-[#717786] font-bold uppercase tracking-widest opacity-60 mb-1">Avg. Rating</span>
                <span className="text-lg font-black text-[#0055c9]">4.9/5.0</span>
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Action Bar */}
        <section className="grid grid-cols-3 gap-3">
          <button
            onClick={() => openChat(share.shareToken, 'patient', 'Patient', share.doctorName || 'Doctor', shareRecords)}
            className="flex flex-col items-center justify-center bg-white py-5 rounded-2xl border border-white/50 hover:bg-blue-50 transition-colors active:scale-95 duration-200 shadow-sm group"
          >
            <MessageSquare className="text-[#0055c9] mb-2 w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-label text-xs font-black text-on-surface-variant text-[10px] uppercase tracking-wider">Chat</span>
          </button>
          <button
            onClick={() => {
              setTempSelectedIds([...share.recordIds])
              setIsEditing(true)
            }}
            className="flex flex-col items-center justify-center bg-white py-5 rounded-2xl border border-white/50 hover:bg-blue-50 transition-colors active:scale-95 duration-200 shadow-sm group"
          >
            <Edit3 className="text-[#0055c9] mb-2 w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-label text-xs font-black text-on-surface-variant text-[10px] uppercase tracking-wider">Manage</span>
          </button>
          <button
            onClick={() => setIsRevokingOpen(true)}
            className="flex flex-col items-center justify-center bg-white py-5 rounded-2xl border border-white/50 hover:bg-red-50 transition-colors active:scale-95 duration-200 shadow-sm group"
          >
            <Trash2 className="text-red-500 mb-2 w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="font-label text-xs font-black text-red-500 text-[10px] uppercase tracking-wider">Revoke</span>
          </button>
        </section>

        {/* Status & History Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-headline font-bold text-on-surface tracking-tight uppercase italic text-sm" style={{ fontFamily: 'Manrope' }}>Documentation & Access</h3>
            <span className="text-[10px] text-outline font-black uppercase tracking-widest opacity-60">since {new Date(share.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 space-y-6 border border-white/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <Calendar className="text-[#006c4f] w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter opacity-60">Authorization Established</p>
                  <p className="text-md font-black">{new Date(share.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-[#717786]/10"></div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.15em]">Shared Clinical Data</p>
                <span className="bg-[#0055c9]/10 text-[#0055c9] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase italic tracking-tighter border border-[#0055c9]/20 shadow-inner">{share.recordIds.length} Reports</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map((cat, idx) => (
                  <span key={cat} className="px-4 py-2 bg-white text-on-surface-variant rounded-full text-[10px] font-black shadow-sm flex items-center gap-2 border border-white uppercase tracking-tight">
                    <span className={`w-2 h-2 rounded-full ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span> {cat}
                  </span>
                )) : (
                  <p className="text-[10px] font-bold text-gray-400 italic">No reports categorized as shared yet</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Activity Log Section */}
        <section className="space-y-4 pb-12">
          <h3 className="font-headline font-bold text-on-surface tracking-tight uppercase italic text-sm px-2" style={{ fontFamily: 'Manrope' }}>Security Timeline</h3>
          <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden border border-white/50">
            <div className="relative flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-[#0055c9]/10 flex items-center justify-center z-10 border border-[#0055c9]/10">
                  <Clock className="text-[#0055c9] w-5 h-5" />
                </div>
                <div className="absolute top-10 bottom-[-32px] w-0.5 bg-[#edeeef] dashed"></div>
              </div>
              <div className="flex-1 pb-4">
                <p className="text-md font-black text-on-surface">Connection initialized</p>
                <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">Secure clinical portal handshake protocol verified</p>
                <p className="text-[10px] font-black text-outline uppercase tracking-wider mt-2 bg-slate-50 inline-block px-2 py-0.5 rounded-md">{new Date(share.createdAt).toLocaleDateString('en-GB')} • SYSTEM</p>
              </div>
            </div>
            <div className="relative flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center z-10 border border-emerald-100">
                  <Shield className="text-emerald-600 w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-md font-black text-on-surface">Privacy rules active</p>
                <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">End-to-end clinical data encryption remains healthy</p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mt-2 bg-emerald-50/50 inline-block px-2 py-0.5 rounded-md">LATEST SYNC • VERIFIED</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Record Selection Modal (Manage) */}
      {isEditing && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#191c1d]/40 backdrop-blur-sm" onClick={() => setIsEditing(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>Manage Access</h2>
                  <p className="text-sm font-bold text-on-surface-variant opacity-60 uppercase tracking-widest mt-1">Select clinical shared data</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-50 rounded-xl text-on-surface-variant hover:bg-slate-100 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Filter reports by name or category..."
                  value={editSearchTerm}
                  onChange={(e) => setEditSearchTerm(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/10 font-bold text-on-surface placeholder:text-outline transition-all"
                />
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-8 py-4 space-y-4">
              {Object.values(records)
                .filter(r =>
                  r.category.toLowerCase().includes(editSearchTerm.toLowerCase())
                )
                .map((record) => {
                  const isSelected = tempSelectedIds.includes(record._id || record.id)
                  return (
                    <div
                      key={record._id || record.id}
                      onClick={() => {
                        const id = record._id || record.id
                        setTempSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
                      }}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected ? 'border-[#0055c9] bg-blue-50/50 shadow-md shadow-blue-100' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white text-[#0055c9] shadow-sm' : 'bg-slate-50 text-outline'}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface truncate pr-2">{record.category.replace(/_/g, ' ')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-outline">{record.category.replace(/_/g, ' ')}</p>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <p className="text-[10px] font-black text-outline">{new Date(record.createdAt).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-[#0055c9] border-[#0055c9] text-white scale-110' : 'border-slate-200 text-transparent'}`}>
                        <Check className="w-5 h-5" strokeWidth={4} />
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">{tempSelectedIds.length} REPORTS SELECTED</p>
                <button onClick={() => setTempSelectedIds([])} className="text-xs font-black text-[#0055c9] uppercase tracking-widest hover:underline">Clear all</button>
              </div>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="h-16 w-full bg-[#0055c9] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isUpdating ? 'Applying Changes...' : 'Update Shared Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {isRevokingOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#191c1d]/5 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-[20px] rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 text-center animate-in zoom-in-95 duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-600">
              <Shield className="w-32 h-32 rotate-[15deg] translate-x-8 -translate-y-8" />
            </div>

            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-rose-50/50">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight leading-none mb-4" style={{ fontFamily: 'Manrope' }}>Revoke Access?</h2>
            <p className="text-[#414754] font-bold text-[11px] leading-relaxed uppercase tracking-[0.15em] mb-10 px-2 opacity-80">
              This will immediately block <span className="text-gray-900 border-b-2 border-rose-100">{share.doctorName}</span>'s access to your medical documentation. This action cannot be undone.
            </p>

            <div className="space-y-3">
              <button
                onClick={executeRevoke}
                disabled={isRevoking}
                className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-100 active:scale-95 flex items-center justify-center gap-2"
              >
                {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isRevoking ? 'Revoking Access...' : 'Terminate Connection'}
              </button>
              <button
                onClick={() => setIsRevokingOpen(false)}
                className="w-full py-5 bg-gray-50 hover:bg-white text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:text-gray-900 active:scale-95"
              >
                No, Keep Connected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
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
  )
}

export default DoctorDetail
