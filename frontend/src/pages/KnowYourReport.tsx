import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { explainReport, ReportExplanation } from '../services/api'
import { getMyRequests } from '../services/doctorAccessService'
import {
  Upload as UploadIcon,
  Search,
  FileText,
  CheckCircle2,
  ChevronRight,
  Info,
  Sparkles,
  ArrowLeft,
  X,
  AlertCircle,
  Activity,
  Utensils,
  Droplets,
  Moon,
  TrendingUp,
  Heart,
  Plus,
  Bell,
  Download,
  Loader2,
  Shield,
  Eye,
  Calendar,
  Home,
  Brain
} from 'lucide-react'

const patientImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4"

const KnowYourReport: React.FC = () => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<ReportExplanation | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [allRequests, setAllRequests] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const requestsData = await getMyRequests()
        setAllRequests(requestsData)
      } catch (err) {
        console.error('Error fetching requests:', err)
      }
    }
    fetchRequests()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a report to analyze.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await explainReport(selectedFile)
      setExplanation(result)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze report. Please ensure the image is clear and contains readable text.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setExplanation(null)
    setError(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'text-green-600 bg-green-50 border-green-100'
      case 'Slightly Abnormal': return 'text-amber-600 bg-amber-50 border-amber-100'
      case 'Abnormal': return 'text-red-600 bg-red-50 border-red-100'
      default: return 'text-gray-600 bg-gray-50 border-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Normal': return <CheckCircle2 className="w-3 h-3" />
      case 'Slightly Abnormal': return <AlertCircle className="w-3 h-3" />
      case 'Abnormal': return <X className="w-3 h-3" />
      default: return null
    }
  }

  const renderMobileView = () => {
    return (
      <div className="min-h-screen bg-[#f8f9fa] font-body text-[#191c1d] antialiased">
        {/* Top App Bar - Standardized */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center neon-glow-primary overflow-hidden cursor-pointer" onClick={() => navigate('/records')}>
              <img alt="JD" className="w-full h-full object-cover" src={patientImage} />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter cursor-pointer" style={{ fontFamily: 'Manrope' }} onClick={() => navigate('/records')}>MedVault</span>
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
              {allRequests.filter((r: any) => r.status === 'pending').length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
              )}
            </div>
          </div>
        </header>

        {/* Notification Tray Overlay */}
        {showNotifications && (
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-black text-[#191c1d] tracking-tight" style={{ fontFamily: 'Manrope' }}>Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {allRequests.filter((r: any) => r.status === 'pending').length === 0 ? (
                <div className="text-center py-20">
                  <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium italic">No new health requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allRequests.filter((r: any) => r.status === 'pending').map((req: any) => (
                    <div key={req._id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#dae2ff] flex items-center justify-center text-[#0055c9]">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-[#191c1d]">{req.doctorName || 'Dr. Specialist'}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Access</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-[#0055c9]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="absolute bottom-10 left-0 w-full px-6">
              <button onClick={() => setShowNotifications(false)} className="w-full py-5 bg-[#191c1d] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs">
                Close
              </button>
            </div>
          </div>
        )}

        <main className="pt-10 pb-[10px] px-6 max-w-lg mx-auto">
          {!explanation ? (
            <>
              {/* Main Header */}
              <section className="mb-10">
                <h2 className="font-headline font-black text-4xl text-[#191c1d] tracking-tight leading-none" style={{ fontFamily: 'Manrope' }}>Know Your Report</h2>
                <p className="text-[#414754] text-md font-medium mt-4 leading-relaxed opacity-60">Smarter, deeper analysis of your medical documents.</p>
              </section>

              {/* Central Upload Area */}
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(25,28,29,0.02)] mb-12">
                <div className="w-24 h-24 bg-[#0055c9]/5 rounded-full flex items-center justify-center mb-8">
                  <UploadIcon className="w-10 h-10 text-[#0055c9]" />
                </div>
                <h3 className="font-headline font-black text-2xl text-[#191c1d] mb-3" style={{ fontFamily: 'Manrope' }}>Analyze any medical report</h3>
                <p className="text-[#717786] text-sm font-medium px-4 leading-relaxed mb-10 opacity-70">
                  Upload blood tests, ultrasounds, X-rays or any health document to get a detailed layout of your results.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 w-full">
                      <FileText className="w-6 h-6 text-[#0055c9]" />
                      <span className="text-sm font-black text-[#191c1d] truncate flex-1">{selectedFile.name}</span>
                      <X className="w-5 h-5 text-slate-400 cursor-pointer" onClick={() => setSelectedFile(null)} />
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="w-full bg-[#0055c9] text-white font-black h-16 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      Analyze Report
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#0055c9] hover:bg-blue-700 text-white font-black h-16 px-10 rounded-3xl flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20 text-sm uppercase tracking-widest"
                  >
                    <Plus className="w-5 h-5" />
                    Select Report File
                  </button>
                )}
              </div>

              {/* Analysis Features Section */}
              <div className="flex items-center justify-between mb-6 px-2">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[#717786]">Analysis Features</h4>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Deep Scan', desc: 'AI-powered data extraction', icon: <Search className="text-[#0055c9]" />, bg: 'bg-[#0055c9]/5' },
                  { title: 'Simple View', desc: 'Layman terms explanations', icon: <Eye className="text-[#006c4f]" />, bg: 'bg-[#006c4f]/5' },
                  { title: 'Metrics', desc: 'Trend analysis & tracking', icon: <TrendingUp className="text-blue-600" />, bg: 'bg-blue-50' },
                  { title: 'Lifestyle', desc: 'Actionable health tips', icon: <Heart className="text-rose-500" />, bg: 'bg-rose-50' }
                ].map((feature, i) => (
                  <div key={i} className="bg-[#f3f4f5] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm border border-slate-100 hover:bg-[#edeeef] active:scale-95 transition-all">
                    <div className={`w-12 h-12 bg-white rounded-[1.25rem] flex items-center justify-center shadow-sm`}>
                      {feature.icon}
                    </div>
                    <div>
                      <p className="font-black text-[#191c1d] text-sm tracking-tight">{feature.title}</p>
                      <p className="text-[10px] font-bold text-[#717786] leading-tight mt-1 opacity-60">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
              <style>{`
                @keyframes subtle-glow {
                  0%, 100% { box-shadow: 0 0 15px rgba(186, 26, 26, 0.1); }
                  50% { box-shadow: 0 0 25px rgba(186, 26, 26, 0.25); }
                }
                .animate-glow { animation: subtle-glow 3s infinite ease-in-out; }
              `}</style>

              <button
                onClick={reset}
                className="flex items-center gap-2 text-[#0055c9] font-black text-[10px] uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                Analyze another report
              </button>

              {/* Hero Header */}
              <section className="relative rounded-[2.5rem] overflow-hidden p-8 text-white shadow-2xl shadow-blue-900/30 bg-gradient-to-br from-[#0055c9] to-[#036cfb] flex flex-col gap-6 min-w-0">
                <div className="flex flex-col gap-3 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Analysis Portfolio</span>
                  <h2 className="font-headline text-3xl font-black leading-tight break-words" style={{ fontFamily: 'Manrope' }}>{explanation.reportType}</h2>
                  <div className="mt-2 flex items-center gap-2 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 flex-wrap">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold leading-none py-1">Clinical AI Interpreted</span>
                  </div>
                </div>
                <p className="text-white/90 text-sm font-medium leading-relaxed italic border-t border-white/10 pt-6 break-words">
                  "{explanation.summary}"
                </p>
              </section>

              {/* Metrics Bento Grid */}
              <section className="space-y-6">
                <h3 className="font-headline font-black text-xl px-4" style={{ fontFamily: 'Manrope' }}>Test Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Featured Abnormal Result (if any) */}
                  {explanation.tests.some(t => t.status === 'Abnormal') && (
                    <div className="col-span-2 bg-white rounded-[2.5rem] p-8 flex flex-col gap-6 animate-glow border border-rose-500/10 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[#717786] font-bold text-[10px] uppercase tracking-widest break-words">Critical Finding</span>
                          <h3 className="font-headline text-2xl font-black text-rose-600 break-words" style={{ fontFamily: 'Manrope' }}>{explanation.tests.find(t => t.status === 'Abnormal')?.name}</h3>
                        </div>
                        <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-rose-100">Abnormal</span>
                      </div>
                      <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                        <div className="bg-rose-500 w-full h-full rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed italic opacity-80 break-words">
                        "{explanation.tests.find(t => t.status === 'Abnormal')?.simpleExplanation}"
                      </p>
                    </div>
                  )}

                  {/* Other Results Grid */}
                  {explanation.tests.filter(t => t.status !== 'Abnormal').map((test, i) => (
                    <div key={i} className="bg-white rounded-[2rem] p-6 flex flex-col gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-50 min-w-0">
                      <span className="text-[#717786] font-bold text-[10px] uppercase tracking-widest break-words">{test.name}</span>
                      <div className="flex flex-col gap-1">
                        <span className="font-headline text-2xl font-black text-[#006c4f] break-words" style={{ fontFamily: 'Manrope' }}>{test.value}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">{test.range}</span>
                      </div>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full w-fit uppercase tracking-widest border ${getStatusColor(test.status)}`}>
                        {test.status === 'Normal' ? 'Optimal' : test.status}
                      </span>
                      {test.simpleExplanation && (
                        <p className="text-[9px] font-medium text-slate-500 italic leading-tight border-t border-slate-50 pt-3 break-words">
                          {test.simpleExplanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* AI Key Findings */}
              <section className="bg-[#0055c9]/5 rounded-[2.5rem] p-8 relative overflow-hidden border border-[#0055c9]/10">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Activity className="w-24 h-24 text-[#0055c9]" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-[#0055c9]" />
                  </div>
                  <h3 className="font-headline font-black text-lg text-[#0055c9]" style={{ fontFamily: 'Manrope' }}>AI Key Findings</h3>
                </div>
                <div className="space-y-5">
                  {explanation.importantFindings.map((finding, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0055c9] shrink-0"></div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed break-words">{finding}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Clinical Explanation */}
              <section className="space-y-6">
                <h3 className="font-headline font-black text-xl px-4" style={{ fontFamily: 'Manrope' }}>What this means for you</h3>
                <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100">
                  <p className="text-slate-700 leading-relaxed font-medium italic opacity-80 underline underline-offset-8 decoration-slate-200 break-words">
                    {explanation.healthExplanation}
                  </p>
                  <div className="flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50">
                    <div className="w-14 h-14 rounded-2xl bg-[#006c4f]/10 flex items-center justify-center shrink-0">
                      <Activity className="w-7 h-7 text-[#006c4f]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recommended Follow-up</p>
                      <p className="text-sm font-black text-[#191c1d]">Consultation with Primary Physician</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lifestyle Support Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="font-headline font-black text-xl" style={{ fontFamily: 'Manrope' }}>Lifestyle Support</h3>
                  <Download className="w-5 h-5 text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#0055c9]">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-[10px] mb-1 uppercase tracking-tighter">Dietary Focus</h4>
                      <div className="space-y-1">
                        {explanation.lifestyleSuggestions.diet.slice(0, 2).map((item, idx) => (
                          <p key={idx} className="text-[8px] font-bold text-slate-500 leading-tight uppercase">• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#006c4f]/5 p-6 rounded-[2rem] border border-[#006c4f]/10 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#006c4f]">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-[10px] mb-1 uppercase tracking-tighter">Movement Plan</h4>
                      <div className="space-y-1">
                        {explanation.lifestyleSuggestions.exercise.slice(0, 2).map((item, idx) => (
                          <p key={idx} className="text-[8px] font-bold text-slate-500 leading-tight uppercase">• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-[10px] mb-1 uppercase tracking-tighter">Hydration</h4>
                      <div className="space-y-1">
                        {explanation.lifestyleSuggestions.hydration.slice(0, 1).map((item, idx) => (
                          <p key={idx} className="text-[8px] font-bold text-slate-500 leading-tight uppercase">• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50/50 p-6 rounded-[2rem] border border-purple-100/50 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-purple-600">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-[10px] mb-1 uppercase tracking-tighter">Sleep Quality</h4>
                      <div className="space-y-1">
                        {explanation.lifestyleSuggestions.sleep.slice(0, 1).map((item, idx) => (
                          <p key={idx} className="text-[8px] font-bold text-slate-500 leading-tight uppercase">• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Disclaimer */}
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider">
                    This analysis is provided by MedVault AI for informational purposes only and is **NOT a clinical diagnosis**. Always verify results with a medical professional.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Global Bottom NavBar */}
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
          <div onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center text-slate-400 hover:text-[#0055c9] transition-colors cursor-pointer active:scale-90 duration-200">
            <Calendar className="w-6 h-6" />
            <span className="font-medium text-[10px] uppercase tracking-wider mt-1">Calendar</span>
          </div>
        </nav>
      </div>
    )
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {renderMobileView()}
      </div>

      {/* Desktop View (Preserved) */}
      <div className="hidden md:block max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Know Your Report
            </h1>
            <p className="text-gray-500 mt-1">Smarter, deeper analysis of your medical documents.</p>
          </div>
        </div>

        {!explanation ? (
          <Card className="p-12 border-dashed border-2 border-gray-200 hover:border-blue-400 transition-colors bg-white/50 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                <UploadIcon className="w-10 h-10 text-blue-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-800">Analyze any medical report</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Upload blood tests, ultrasounds, X-rays or any health document to get a detailed layout of your results.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-4 pt-4">
                  <div className="flex items-center space-x-3 bg-blue-50/50 px-6 py-3 rounded-2xl border border-blue-100">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <span className="text-base font-semibold text-gray-700 truncate max-w-[250px]">
                      {selectedFile.name}
                    </span>
                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <Button
                    onClick={handleUpload}
                    loading={loading}
                    className="w-full max-w-xs shadow-xl shadow-blue-200/50 h-12 text-lg"
                    icon={<Sparkles className="w-5 h-5" />}
                  >
                    Analyze Report
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full max-w-xs border-blue-200 text-blue-600 hover:bg-blue-50 h-12 text-lg rounded-xl"
                >
                  Select Report File
                </Button>
              )}

              {error && <ErrorMessage message={error} className="mt-4" />}

              <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-50">
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <Search className="w-6 h-6 text-indigo-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600 text-center">Deep Scan</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <Info className="w-6 h-6 text-blue-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600 text-center">Simple View</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <Activity className="w-6 h-6 text-amber-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600 text-center">Metrics</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600 text-center">Lifestyle</span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <Button
              variant="ghost"
              onClick={reset}
              className="text-gray-500 hover:text-blue-600 -ml-2"
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Analyze another report
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden border-none shadow-xl">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Sparkles className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                          <FileText className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-bold">{explanation.reportType}</h2>
                      </div>
                      <p className="text-blue-50 text-lg opacity-90 max-w-xl">
                        {explanation.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 space-y-8 bg-white">
                    {/* Test Results Table */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <Activity className="w-6 h-6 text-blue-500" />
                        <span>Test Analysis</span>
                      </h3>
                      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Test Name</th>
                              <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Value</th>
                              <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {explanation.tests.map((test, idx) => (
                              <React.Fragment key={idx}>
                                <tr className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-gray-800">{test.name}</div>
                                    <div className="text-xs text-gray-400 font-medium whitespace-nowrap">Range: {test.range}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-lg font-bold text-indigo-600 whitespace-nowrap">{test.value}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusColor(test.status)}`}>
                                      {getStatusIcon(test.status)}
                                      <span>{test.status}</span>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="px-6 py-3 bg-gray-50/20">
                                    <p className="text-sm text-gray-600 font-medium flex items-center space-x-2">
                                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                      <span>{test.simpleExplanation}</span>
                                    </p>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <Info className="w-6 h-6 text-indigo-500" />
                        <span>Health Explanation</span>
                      </h3>
                      <div className="p-6 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                        <p className="text-lg text-gray-700 leading-relaxed font-medium">
                          {explanation.healthExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar content */}
              <div className="space-y-6">
                {/* Important Findings */}
                <Card className="p-6 space-y-4 shadow-lg border-none">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span>Key Findings</span>
                  </h3>
                  <div className="space-y-3">
                    {explanation.importantFindings.map((finding, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-red-50/30 text-red-700 border border-red-100/50 font-bold text-sm">
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Lifestyle Suggestions */}
                <Card className="p-6 space-y-5 shadow-lg border-none">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <HeartIcon className="w-5 h-5 text-pink-500" />
                    <span>Lifestyle Tips</span>
                  </h3>

                  <div className="space-y-4">
                    <LifestyleItem
                      icon={<Utensils className="w-4 h-4" />}
                      title="Diet"
                      items={explanation.lifestyleSuggestions.diet}
                      color="blue"
                    />
                    <LifestyleItem
                      icon={<Activity className="w-4 h-4" />}
                      title="Exercise"
                      items={explanation.lifestyleSuggestions.exercise}
                      color="amber"
                    />
                    <LifestyleItem
                      icon={<Droplets className="w-4 h-4" />}
                      title="Hydration"
                      items={explanation.lifestyleSuggestions.hydration}
                      color="indigo"
                    />
                    <LifestyleItem
                      icon={<Moon className="w-4 h-4" />}
                      title="Sleep"
                      items={explanation.lifestyleSuggestions.sleep}
                      color="purple"
                    />
                  </div>
                </Card>

                {/* Disclaimer */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      This analysis is provided by AI for informational purposes only and is **NOT a clinical diagnosis**. Always verify results with a medical professional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const LifestyleItem: React.FC<{
  icon: React.ReactNode,
  title: string,
  items: string[],
  color: string
}> = ({ icon, title, items, color }) => {
  if (!items || items.length === 0) return null

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center space-x-2 text-sm font-bold ${colorMap[color].split(' ')[1]}`}>
        <div className={`p-1.5 rounded-lg ${colorMap[color].split(' ')[0]}`}>
          {icon}
        </div>
        <span>{title}</span>
      </div>
      <ul className="space-y-1 ml-9">
        {items.map((item, idx) => (
          <li key={idx} className="text-xs text-gray-600 font-medium list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const HeartIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

export default KnowYourReport
