import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSharedRecords, SharedPatientData } from '../../services/doctorAccessService'
import SharedPatientView from '../../components/SharedPatientView'
import Upload from '../Upload'
import { FilePlus } from 'lucide-react'

const DoctorPatientView: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<SharedPatientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const loadData = async () => {
    if (!token) {
      navigate('/doctor')
      return
    }
    setLoading(true)
    try {
      const result = await getSharedRecords(token, true)
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load patient')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, navigate])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC]">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC] p-6 text-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Error</h2>
          <p className="text-red-500 font-bold mb-6">{error}</p>
          <button 
            onClick={() => navigate('/doctor')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full">
      <SharedPatientView data={data} onBack={() => navigate('/doctor')} />
    </div>
  )
}

export default DoctorPatientView
