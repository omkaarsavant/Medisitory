import React, { useState } from 'react'
import { SharedPatientData } from '../services/doctorAccessService'
import { MedicalRecord as IMedicalRecord } from '../services/api'
import { ArrowLeft, Search, FileText, Calendar, Activity, X, Info, ArrowRight, Shield, MessageSquare, Clock } from 'lucide-react'
import { Card, Badge, Button } from './index' // Reusing some shared UI
import SharedTimelineView from './SharedTimelineView'
import { saveDoctorNotes } from '../services/doctorAccessService'
import { useChatStore } from '../store/chatStore'
import { useDoctorStore } from '../store/doctorStore'

interface Props {
  data: SharedPatientData
  onBack: () => void
}

const SharedPatientView: React.FC<Props> = ({ data, onBack }) => {
  const [selectedRecord, setSelectedRecord] = useState<IMedicalRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [editingNotes, setEditingNotes] = useState('')
  
  const { openChat } = useChatStore()
  const { unreadCounts } = useDoctorStore()

  const categories = [
    'All', 'Blood Sugar', 'Blood Pressure', 'OPD', 'Cholesterol', 'Thyroid', 'Imaging', 'Lab', 'Custom'
  ]

  const allRecords = data.records.filter(r => {
    // Search Term Filter
    const matchesSearch = searchTerm === '' || 
      (r.doctorName || r.doctor || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    // Category Filter
    const recordCat = (r.category || 'custom').toLowerCase().replace(/_/g, ' ')
    const matchesCategory = selectedCategory === 'All' || 
      recordCat === selectedCategory.toLowerCase()
    
    // Date Range Filter
    const recordDate = new Date(r.visitDate || r.createdAt)
    const matchesStartDate = !startDate || recordDate >= new Date(startDate)
    const matchesEndDate = !endDate || recordDate <= new Date(endDate + 'T23:59:59')

    return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate
  })

  const sharedRecordsOnly = allRecords.filter(r => !r.isRestricted)

  const handleRecordClick = (record: IMedicalRecord) => {
    if (record.isRestricted) return
    setSelectedRecord(record)
    setEditingNotes(record.doctorNotes || '')
  }

  const handleSaveNotes = async () => {
    if (!selectedRecord) return
    try {
      setIsSavingNotes(true)
      await saveDoctorNotes(selectedRecord._id || selectedRecord.id, editingNotes)
      // Update local state
      selectedRecord.doctorNotes = editingNotes
      alert('Notes saved and patient notified.')
    } catch (err) {
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Simple modal content for viewing the selected record details
  const renderRecordDetails = () => {
    if (!selectedRecord) return null
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
        <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex justify-between items-center z-10">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span>Record Details</span>
            </h2>
            <button onClick={() => setSelectedRecord(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                Record Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Category</p>
                  <p className="font-bold text-gray-900 capitalize">{(selectedRecord.category || 'Custom').replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Status</p>
                  <Badge color={['completed', 'processed', 'active'].includes((selectedRecord.status || '').toLowerCase()) ? 'green' : 'yellow'} className="text-[10px] font-black px-2 py-0.5 uppercase">
                    {selectedRecord.status || 'Active'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Visit Date & Time</p>
                  <p className="font-bold text-gray-900">{new Date(selectedRecord.visitDate || selectedRecord.createdAt).toLocaleDateString('en-GB')} at {new Date(selectedRecord.visitDate || selectedRecord.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Provider / Doctor</p>
                  <p className="font-bold text-gray-900">{selectedRecord.doctorName || selectedRecord.doctor || 'Not specified'}</p>
                </div>
                {selectedRecord.hospitalName || selectedRecord.hospital ? (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Facility / Hospital</p>
                    <p className="font-bold text-gray-900">{selectedRecord.hospitalName || selectedRecord.hospital}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {Object.keys(selectedRecord.displayData || selectedRecord.extractedData?.fields || {}).length > 0 && (
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Test Results & Metrics
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Test</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(selectedRecord.displayData || selectedRecord.extractedData?.fields || {}).map(([key, value]: [string, any], idx: number) => {
                        const strVal = String(value)
                        return (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-sm text-gray-900 capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 font-bold text-sm text-indigo-600">{strVal}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {Object.keys(selectedRecord.manualData || {}).length > 0 && (
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Additional Data
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedRecord.manualData || {}).map(([k, v]: [string, any]) => (
                    <p key={k} className="text-sm text-gray-700">
                      <span className="font-bold capitalize">{k.replace(/_/g, ' ')}:</span> {String(v)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {selectedRecord.notes && (
              <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100/50">
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Patient / Upload Notes
                </h3>
                <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                  {selectedRecord.notes}
                </p>
              </div>
            )}

            {/* Doctor's Recommendation Section */}
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="w-16 h-16 text-indigo-500" />
              </div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                Doctor's Recommendation & Notes
              </h3>
              <textarea 
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add professional observations or recommendations for the patient..."
                className="w-full h-32 p-4 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none resize-none mb-4"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || editingNotes === (selectedRecord.doctorNotes || '')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-2 rounded-xl shadow-lg shadow-indigo-200 border-none transition-all active:scale-95"
                >
                  {isSavingNotes ? 'Saving...' : 'Save & Notify Patient'}
                </Button>
              </div>
            </div>
            
            {((selectedRecord.fileUrl || selectedRecord.imagePath) || selectedRecord.prescriptionImageUrl) && (
              <div className={`mt-8 border-t border-gray-100 pt-8 grid grid-cols-1 ${selectedRecord.prescriptionImageUrl && (selectedRecord.fileUrl || selectedRecord.imagePath) ? 'lg:grid-cols-2' : ''} gap-8`}>
                {(selectedRecord.fileUrl || selectedRecord.imagePath) && (
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Original Document
                    </h3>
                    {((selectedRecord.fileUrl || selectedRecord.imagePath) || '').toLowerCase().endsWith('.pdf') ? (
                      <iframe src={`${selectedRecord.fileUrl || selectedRecord.imagePath}#toolbar=0`} className="w-full h-96 rounded-2xl border border-gray-200 bg-gray-50" title="Medical record preview" />
                    ) : (
                      <img src={selectedRecord.fileUrl || selectedRecord.imagePath} alt="Report" className="w-full rounded-2xl border border-gray-200 object-contain max-h-[600px] bg-gray-50" />
                    )}
                  </div>
                )}
                
                {selectedRecord.prescriptionImageUrl && (
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Attached Prescription
                    </h3>
                    <img src={selectedRecord.prescriptionImageUrl} alt="Prescription" className="w-full rounded-2xl border-2 border-blue-50 object-contain max-h-[600px] bg-gray-50" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Navbar overlay */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900 shadow-sm border border-gray-100 bg-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Secure Dashboard</p>
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">{data.patient.name}</h1>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-10 animate-in fade-in duration-500">
        {/* Patient Profile Header */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-indigo-100/20 border border-gray-100 mb-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center border border-indigo-100 shadow-inner transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <span className="text-4xl font-black text-indigo-600 uppercase italic">
                  {data.patient.name.charAt(0)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">{data.patient.name}</h1>
                  <Badge color="green" className="px-3 py-1 font-black text-[9px] uppercase tracking-widest italic bg-green-50 text-green-600 border-none shadow-sm">Active Hub</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                  <span className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase">ID: {data.patient.id.substring(0, 12)}</span>
                  <span className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Authorized {new Date(data.patient.sharedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <button 
                  onClick={() => openChat(data.shareToken, 'doctor', 'Dr. Clinician', data.patient.name, allRecords.filter(r => !r.isRestricted))}
                  className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-2xl shadow-indigo-100 active:scale-95 group"
                >
                  <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Clinician Hub Chat
                </button>
                {unreadCounts[data.shareToken] > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white items-center justify-center text-[8px] font-black text-white italic">
                      {unreadCounts[data.shareToken] > 9 ? '9+' : unreadCounts[data.shareToken]}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-10 pt-10 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Age / Identity</span>
              <p className="font-extrabold text-gray-900 text-xl italic">{data.patient.age} Yrs <span className="text-gray-300 font-medium not-italic ml-2">{new Date(data.patient.dob).toLocaleDateString('en-GB')}</span></p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clinical Group</span>
              <p className="font-extrabold text-indigo-600 text-xl italic uppercase tracking-tighter">{data.patient.bloodGroup}</p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Records Scope</span>
              <p className="font-black text-gray-900 text-xl italic">{sharedRecordsOnly.length} Reports</p>
            </div>
          </div>
        </div>

        {/* View Selection Hooks */}
        <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] w-fit mb-10 shadow-inner">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'list' ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Clinical List
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'timeline' ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Temporal View
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Observation Filtering Logic */}
            <div className="mb-12">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search clinical observations..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-3xl text-sm font-bold text-gray-700 placeholder:text-gray-300 shadow-xl shadow-gray-200/20 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
                  />
                </div>
                
                <div className="flex gap-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-6 py-5 bg-white border border-gray-100 rounded-3xl text-[11px] font-black uppercase tracking-widest text-gray-600 shadow-xl shadow-gray-200/20 focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {sharedRecordsOnly.map((record, index) => (
                <div 
                  key={index}
                  onClick={() => handleRecordClick(record)}
                  className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-indigo-200/40 hover:-translate-y-2 cursor-pointer transition-all duration-500 group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-indigo-500"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500 shadow-inner transform group-hover:rotate-6">
                      <FileText className="w-8 h-8 text-gray-300 group-hover:text-white transition-colors" />
                    </div>
                    <Badge color={['completed', 'processed'].includes((record.status || '').toLowerCase()) ? 'green' : 'yellow'} className="text-[10px] font-black italic px-3 py-1 bg-white border-2 border-gray-100">
                      {(record.status || 'Verified').toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2 italic">
                    {(record.category || 'Record').replace(/_/g, ' ')}
                  </h3>
                  
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{new Date(record.visitDate || record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-6 h-6 text-indigo-500" />
                  </div>
                </div>
              ))}
              {sharedRecordsOnly.length === 0 && (
                <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                  <Info className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[11px]">No matching observations found in this hub</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <SharedTimelineView 
              records={allRecords} 
              onRecordClick={handleRecordClick} 
            />
          </div>
        )}
      </main>

      {renderRecordDetails()}

      {renderRecordDetails()}
    </div>
  )
}

export default SharedPatientView
