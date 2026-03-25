import React, { useState, useRef } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { explainReport, ReportExplanation } from '../services/api'
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
  TrendingUp
} from 'lucide-react'

const KnowYourReport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<ReportExplanation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  <Heart className="w-5 h-5 text-pink-500" />
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

// Add Heart icon import since it's used in lifestyle
const Heart = (props: any) => (
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
