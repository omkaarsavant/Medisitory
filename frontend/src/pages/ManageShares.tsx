import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Shield, Trash2, Calendar, FileText, ExternalLink, Clock, AlertTriangle, 
  Edit3, X, CheckSquare, Square, Save, Search, MessageSquare, Users, UserPlus, Send,
  CheckCircle, XCircle, Loader2, Copy, Check, QrCode
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { 
  getActiveShares, revokeAccess, updateShareRecords, DoctorAccess,
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
  
  // Edit Modal State
  const [editingShare, setEditingShare] = useState<DoctorAccess | null>(null)
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [editSearchTerm, setEditSearchTerm] = useState('')

  // Add Doctor Modal State
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false)
  const [doctorIdInput, setDoctorIdInput] = useState('')
  const [patientNameInput, setPatientNameInput] = useState('Jane Doe')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [isScanning, setIsScanning] = useState(false)



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
      const [sharesData, recordsData] = await Promise.all([
        getActiveShares(),
        getRecords({ limit: 100 })
      ])
      
      setShares(sharesData)
      
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



  const handleRevoke = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke this access? The doctor will no longer be able to view these records.')) {
      return
    }

    try {
      await revokeAccess(token)
      setShares(prev => prev.filter(s => s.shareToken !== token))
    } catch (err) {
      alert('Failed to revoke access. Please try again.')
    }
  }

  const handleEditClick = (share: DoctorAccess) => {
    setEditingShare(share)
    setTempSelectedIds([...share.recordIds])
    setEditSearchTerm('')
  }

  const toggleRecordSelection = (id: string) => {
    setTempSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleUpdate = async () => {
    if (!editingShare) return
    if (tempSelectedIds.length === 0) {
      alert('At least one record must be selected. To stop sharing all records, use the Revoke button.')
      return
    }

    try {
      setIsUpdating(true)
      const updatedShare = await updateShareRecords(editingShare.shareToken, tempSelectedIds)
      setShares(prev => prev.map(s => s.shareToken === editingShare.shareToken ? updatedShare : s))
      setEditingShare(null)
    } catch (err) {
      alert('Failed to update share records')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendRequest = async () => {
    if (!doctorIdInput.trim()) {
      alert('Please enter a Doctor ID')
      return
    }
    try {
      setSendingRequest(true)
      await sendDoctorRequest(doctorIdInput.trim(), patientNameInput || 'Patient')
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
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors font-black">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-widest">My Doctors</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Medical Consultations & Chat</p>
          </div>
          <button
            onClick={() => setIsAddDoctorOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Doctor
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">




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
                          // Fallback to local records map
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
                      onClick={() => handleRevoke(share.shareToken)}
                      className="inline-flex items-center justify-center px-4 py-3.5 text-red-600 hover:text-red-700 font-black uppercase tracking-widest text-[11px] active:scale-95 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8 border-t border-gray-50">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Authorized Since</span>
                    <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="font-black text-gray-900 text-sm">{new Date(share.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Session Scope</span>
                    <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="font-black text-gray-900 text-sm">{share.recordIds.length} Medical Reports Shared</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Encryption Mode</span>
                    <div className="flex items-center gap-3 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/20">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="font-black text-indigo-600 text-[10px] uppercase tracking-widest">End-to-End Secure</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 bg-gray-50/30 p-6 rounded-3xl border border-gray-100/50 group-hover:bg-white transition-colors duration-500">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 pl-1">Shared Health Documentation</p>
                  <div className="flex flex-wrap gap-3">
                    {share.recordIds.map(id => {
                      const record = records[id]
                      return (
                        <div key={id} className="px-5 py-2.5 bg-white rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm group-hover:border-indigo-100 group-hover:shadow-lg group-hover:shadow-indigo-50 transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
                            {record ? record.category.replace(/_/g, ' ') : 'Hub Synchronizing...'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Doctor Modal */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-lg bg-white rounded-[3rem] p-0 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 border-none">
            <div className="p-10 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none mb-2">Connect Doctor</h2>
                <p className="text-indigo-200 font-medium text-sm">Enter the doctor's unique ID to send a connection request</p>
              </div>
              <button 
                onClick={() => { setIsAddDoctorOpen(false); setSendSuccess(false); stopScanning() }} 
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors text-white z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <UserPlus className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-white/10" />
            </div>

            {sendSuccess ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">Request Sent!</h3>
                <p className="text-gray-500 font-medium">Waiting for the doctor to accept your request.</p>
              </div>
            ) : isScanning ? (
              <div className="p-10 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Scan Doctor QR</h3>
                  <button onClick={stopScanning} className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                    <X className="w-3 h-3" /> Stop Scanning
                  </button>
                </div>
                <div id="qr-reader-doctor" className="w-full overflow-hidden rounded-3xl border-2 border-indigo-100 shadow-inner bg-gray-50 aspect-square flex items-center justify-center">
                  <div className="animate-pulse text-indigo-300">Initializing Camera...</div>
                </div>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-[0.2em] font-black">Align the doctor's QR code within the frame</p>
              </div>
            ) : (
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doctor's Unique ID</label>
                    <button 
                      onClick={startScanning}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:text-indigo-700 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Scan QR
                    </button>
                  </div>
                  <input 
                    type="text"
                    placeholder="e.g. DOC-A3X9K2"
                    value={doctorIdInput}
                    onChange={e => setDoctorIdInput(e.target.value.toUpperCase())}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-gray-900 text-lg tracking-widest placeholder:text-gray-300 placeholder:font-medium placeholder:tracking-normal"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Your Name (visible to the doctor)</label>
                  <input 
                    type="text"
                    placeholder="Your name"
                    value={patientNameInput}
                    onChange={e => setPatientNameInput(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setIsAddDoctorOpen(false)}
                    className="rounded-2xl border-gray-200 text-gray-400 font-black uppercase tracking-widest text-[11px] px-8 h-14 flex-1 hover:bg-white"
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleSendRequest}
                    disabled={sendingRequest || !doctorIdInput.trim()}
                    className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {sendingRequest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Access Configuration Engine */}
      {editingShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white rounded-[3rem] p-0 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border-none">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none mb-2">Scope Control</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Session: {editingShare.shareToken}</p>
              </div>
              <button 
                onClick={() => setEditingShare(null)} 
                className="relative z-10 p-3 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <Shield className="absolute right-[-20px] top-[-20px] w-48 h-48 text-white/5 rotate-12" />
            </div>

            <div className="p-10 pb-4">
              <div className="relative mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                <input 
                  type="text"
                  placeholder="Filter medical documentation..."
                  value={editSearchTerm}
                  onChange={e => setEditSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] shadow-inner font-bold text-gray-700 outline-none focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 transition-all text-lg placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-4 custom-scrollbar">
              {Object.values(records)
                .filter(r => (r.category || '').toLowerCase().includes(editSearchTerm.toLowerCase()) || (r.doctorName || '').toLowerCase().includes(editSearchTerm.toLowerCase()))
                .sort((a, b) => new Date(b.visitDate || b.createdAt).getTime() - new Date(a.visitDate || a.createdAt).getTime())
                .map((record) => {
                  const isSelected = tempSelectedIds.includes(record._id || record.id)
                  return (
                    <div 
                      key={record._id || record.id}
                      onClick={() => toggleRecordSelection(record._id || record.id)}
                      className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-500 shadow-xl shadow-indigo-100/50 scale-[1.02]' 
                          : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`p-3 rounded-2xl transition-all duration-300 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-200'}`}>
                          {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tight text-lg mb-1 italic">{(record.category || 'Documentation').replace(/_/g, ' ')}</h4>
                          <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {new Date(record.visitDate || record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                      )}
                    </div>
                  )
                })}
            </div>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Scope Identification</p>
                <p className="font-black text-gray-900 text-2xl tracking-tighter italic">
                  <span className="text-indigo-600">{tempSelectedIds.length}</span> / {Object.keys(records).length} Reports Hub
                </p>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingShare(null)}
                  className="rounded-2xl border-gray-200 text-gray-400 font-black uppercase tracking-widest text-[11px] px-8 h-14 flex-1 sm:flex-none hover:bg-white"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px] px-12 h-14 shadow-xl shadow-indigo-100 border-none flex-1 sm:flex-none transition-all"
                >
                  {isUpdating ? 'Synchronizing...' : 'Update Authority'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ManageShares
