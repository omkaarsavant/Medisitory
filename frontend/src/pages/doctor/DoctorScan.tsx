import React, { useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { getSharedRecords } from '../../services/doctorAccessService'
import { useDoctorStore } from '../../store/doctorStore'
import { Search, QrCode, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DoctorScan: React.FC = () => {
  const [shareCode, setShareCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const { addPatient } = useDoctorStore()
  const navigate = useNavigate()

  const handleAccessRecords = async (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await getSharedRecords(code.trim())
      addPatient(data, code.trim())
      navigate(`/doctor/patient/${code.trim()}`)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Invalid or expired access code')
    } finally {
      setLoading(false)
    }
  }

  const startScanning = () => {
    setIsScanning(true)
    setError('')
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render((decodedText) => {
        scanner.clear()
        setIsScanning(false)
        setShareCode(decodedText)
        handleAccessRecords(decodedText)
      }, (err) => {
        // Just ignore scan errors to avoid spamming the console
      })
    }, 100)
  }

  const stopScanning = () => {
    setIsScanning(false)
  }

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-to-br from-[#F8FAFC] to-indigo-50/30 flex items-center justify-center">
      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">Patient Access</h2>
          <p className="text-gray-500 text-sm sm:text-base font-medium max-w-md mx-auto">
            Securely access shared patient medical records using an encrypted transmission code or QR scan.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/60 p-8 sm:p-12 relative overflow-hidden">
          
          {/* Decorative background flare */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />

          {isScanning ? (
            <div className="animate-in zoom-in-95 duration-300 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Scan QR Code</h3>
                <button onClick={stopScanning} className="text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest px-4 py-2 bg-gray-100 rounded-full flex items-center gap-2">
                  <X className="w-3 h-3"/> Cancel
                </button>
              </div>
              <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border-2 border-indigo-100"></div>
              <p className="text-[10px] text-center text-gray-400 mt-4 uppercase tracking-[0.2em] font-black">Position QR code within frame</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in zoom-in-95 duration-300 relative z-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-indigo-500 uppercase tracking-widest pl-2">Access Token</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={shareCode}
                    onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X9K2M"
                    className="w-full pl-6 pr-12 py-5 bg-gray-50 border-none rounded-2xl text-2xl font-black text-gray-900 tracking-[0.2em] placeholder:text-gray-300 focus:ring-4 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none uppercase shadow-inner"
                    onKeyDown={(e) => e.key === 'Enter' && handleAccessRecords(shareCode)}
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                </div>
                {error && <p className="text-sm font-bold text-red-500 pl-2 mt-2 flex items-center"><X className="w-4 h-4 mr-1"/> {error}</p>}
              </div>

              <button 
                onClick={() => handleAccessRecords(shareCode)}
                disabled={loading || !shareCode.trim()}
                className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? 'Verifying Access...' : 'Connect to Patient Space'}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button 
                onClick={startScanning}
                className="w-full py-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 border border-indigo-100"
              >
                <QrCode className="w-5 h-5" />
                Scan Patient QR 
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorScan
