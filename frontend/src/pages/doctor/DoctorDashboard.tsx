import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDoctorStore } from '../../store/doctorStore'
import { Users, Clock, ArrowRight, Activity, Trash2, Search } from 'lucide-react'

const DoctorDashboard: React.FC = () => {
  const { savedPatients, removePatient, unreadCounts } = useDoctorStore()
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const handleRemove = (e: React.MouseEvent, token: string) => {
    e.stopPropagation()
    if (window.confirm('Remove this patient access?')) {
      removePatient(token)
    }
  }

  const filteredPatients = savedPatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-to-br from-[#F8FAFC] to-indigo-50/30">
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
          <button 
            onClick={() => navigate('/doctor/scan')}
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
          >
            Connect New Patient
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {savedPatients.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-16 text-center shadow-xl shadow-indigo-50/50">
            <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3">
              <Activity className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">No active patient sessions</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 text-lg leading-relaxed">
              Connect to a patient by scanning their secure MedVault QR code or entering their direct access token.
            </p>
            <button 
              onClick={() => navigate('/doctor/scan')}
              className="px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-gray-900/20 active:scale-95 inline-flex items-center gap-3"
            >
              Scan Patient QR
              <ArrowRight className="w-5 h-5" />
            </button>
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
  )
}

export default DoctorDashboard
