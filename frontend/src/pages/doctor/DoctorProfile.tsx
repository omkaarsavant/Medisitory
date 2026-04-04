import React, { useState } from 'react'
import { 
  User, Mail, Phone, MapPin, Award, 
  Briefcase, BookOpen, Edit2, Check, 
  Camera, Shield, Hash, Activity 
} from 'lucide-react'
import { useDoctorStore } from '../../store/doctorStore'

const DoctorProfile: React.FC = () => {
  const { doctorUniqueId } = useDoctorStore()
  const [isEditing, setIsEditing] = useState(false)
  
  // Mock data representing a doctor's profile
  const [profile, setProfile] = useState({
    name: 'Dr. Sarah Wilson',
    specialty: 'Senior Cardiologist',
    experience: '12+ Years',
    education: 'MD - Cardiology, Johns Hopkins University',
    email: 'sarah.wilson@medvault.pro',
    phone: '+1 (555) 012-3456',
    clinic: 'HeartGuard Medical Center',
    location: '452 Medical Plaza, Ste 210, New York, NY',
    bio: 'Dedicated cardiologist with a passion for preventive medicine and heart health optimization. Specializing in advanced cardiovascular diagnostics and personalized patient care plans.'
  })

  const [editValues, setEditValues] = useState({ ...profile })

  const handleSave = () => {
    setProfile({ ...editValues })
    setIsEditing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditValues(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-to-br from-[#F8FAFC] to-indigo-50/30">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative overflow-hidden">
                {/* Visual placeholder for profile image */}
                <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">{profile.name}</h1>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Verified Specialist
                </span>
              </div>
              <p className="text-lg font-bold text-indigo-600/80 mb-4">{profile.specialty}</p>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  {profile.experience}
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  New York, USA
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 px-8 py-4 ${isEditing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-black'} text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-gray-900/20 active:scale-95`}
          >
            {isEditing ? (
              <><Check className="w-4 h-4" /> Save Profile</>
            ) : (
              <><Edit2 className="w-4 h-4" /> Edit Profile</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-50 shadow-xl shadow-indigo-100/20">
              <h2 className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Professional Summary
              </h2>
              {isEditing ? (
                <textarea 
                  name="bio"
                  value={editValues.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-4 bg-gray-50 border border-indigo-100 rounded-2xl font-medium text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none"
                />
              ) : (
                <p className="text-gray-600 font-medium leading-relaxed text-lg">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Credentials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Education */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-50 shadow-xl shadow-indigo-100/20">
                <h2 className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Education
                </h2>
                {isEditing ? (
                  <input 
                    name="education"
                    value={editValues.education}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 border border-indigo-100 rounded-xl font-bold text-gray-800"
                  />
                ) : (
                  <p className="text-gray-800 font-black tracking-tight">{profile.education}</p>
                )}
              </div>
              
              {/* Unique ID Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200/50">
                <h2 className="text-xs font-black text-indigo-200 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Digital Credentials
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-200/60 uppercase tracking-widest mb-1">Provider ID</p>
                    <p className="text-2xl font-black tracking-widest">{doctorUniqueId || 'DOC-992-X'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-lg w-fit">
                    <Activity className="w-3.5 h-3.5" />
                    HIPAA COMPLIANT PORTAL
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            
            {/* Contact Detail Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-50 shadow-xl shadow-indigo-100/20">
              <h2 className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em] mb-8">Contact & Location</h2>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Professional Email</p>
                    {isEditing ? (
                      <input 
                        name="email"
                        value={editValues.email}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-50 border rounded-lg font-bold text-sm"
                      />
                    ) : (
                      <p className="text-gray-900 font-bold truncate">{profile.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Access</p>
                    {isEditing ? (
                      <input 
                        name="phone"
                        value={editValues.phone}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-50 border rounded-lg font-bold text-sm"
                      />
                    ) : (
                      <p className="text-gray-900 font-bold">{profile.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Clinic</p>
                    {isEditing ? (
                      <>
                        <input 
                          name="clinic"
                          value={editValues.clinic}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-gray-50 border rounded-lg font-bold text-sm mb-2"
                        />
                        <input 
                          name="location"
                          value={editValues.location}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-gray-50 border rounded-lg font-medium text-xs"
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 font-bold mb-0.5">{profile.clinic}</p>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{profile.location}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats/Badge */}
            <div className="bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-inner flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-indigo-600/30" />
              </div>
              <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-1">Portal Status</h3>
              <p className="text-gray-500 font-bold text-sm">Active & Fully Integrated</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile
