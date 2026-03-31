// === frontend/src/pages/Analytics.tsx ===

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell, PieChart, Pie
} from 'recharts'
import {
  Activity, Thermometer, Droplets, Heart, AlertCircle, Info, Calendar, Download,
  TrendingUp, TrendingDown, Minus, Bell, Shield, FileText, ChevronRight,
  Search, MessageSquare, Plus, ExternalLink, Trash2, Edit3, X, Save,
  CheckCircle, Loader2, Play, Home, Brain
} from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getAnalyticsData } from '../services/api'
import { getMyRequests } from '../services/doctorAccessService'
import { useRecordStore } from '../store/recordStore'
import { useChatStore } from '../store/chatStore'

const COLORS = {
  primary: '#0055c9',
  secondary: '#006c4f',
  error: '#ba1a1a',
  background: '#f8f9fa',
  surface: '#ffffff',
  outline: '#717786'
}

const patientImage = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150"

const Analytics: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'blood_sugar' | 'blood_pressure' | 'other'>('blood_sugar')
  const [subCategory, setSubCategory] = useState<'cholesterol' | 'thyroid'>('cholesterol')
  const [timeRange, setTimeRange] = useState(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [allRequests, setAllRequests] = useState<any[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const { records } = useRecordStore()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        let targetCategory = activeTab === 'blood_sugar' ? 'blood_sugar' :
          activeTab === 'blood_pressure' ? 'bp' :
            subCategory

        // Fetch both analytics and doctor requests for the notification bell
        const [response, requestsData] = await Promise.all([
          getAnalyticsData(targetCategory, timeRange, Date.now()),
          import('../services/doctorAccessService').then(m => m.getMyRequests())
        ])

        if (response.success) {
          setData(response.data)
        } else {
          setError('Failed to load analytics data')
        }
        setAllRequests(requestsData)
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError('Failed to load analytics data. Please make sure you have uploaded records.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, subCategory, timeRange, records])

  const handleExportPDF = async () => {
    if (!contentRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
        logging: false
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      // Header
      pdf.setFillColor(37, 99, 235)
      pdf.rect(0, 0, pageW, 20, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      const tabLabel = activeTab === 'blood_sugar' ? 'Blood Sugar' : activeTab === 'blood_pressure' ? 'Blood Pressure' : (subCategory.charAt(0).toUpperCase() + subCategory.slice(1))
      pdf.text(`Health Analytics — ${tabLabel} (${timeRange} Days)`, 10, 13)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text('MedVault — Generated ' + new Date().toLocaleString('en-GB'), pageW - 10, 13, { align: 'right' })

      // Charts image below header
      const headerH = 22
      const availH = pageH - headerH - 5
      const imgAspect = canvas.height / canvas.width
      const imgW = pageW - 10
      const imgH = Math.min(imgW * imgAspect, availH)
      pdf.addImage(imgData, 'JPEG', 5, headerH, imgW, imgH)

      // If image is taller than one page, add additional pages
      if (imgW * imgAspect > availH) {
        let yOffset = availH
        const remainingH = imgW * imgAspect - availH
        let pages = Math.ceil(remainingH / (pageH - 5))
        for (let i = 0; i < pages; i++) {
          pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 5, -(headerH + yOffset), imgW, imgW * imgAspect)
          yOffset += pageH - 5
        }
      }

      const fileName = `analytics_${tabLabel.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(fileName)
    } finally {
      setExporting(false)
    }
  }

  const tabs = [
    { id: 'blood_sugar', label: 'Sugar', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'blood_pressure', label: 'Blood Pressure', icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'other', label: 'Other Health', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const formatXAxis = (tickItem: any) => {
    return new Date(tickItem).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-lg">
          <p className="text-xs text-gray-400 mb-2">{new Date(label).toLocaleString()}</p>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <p className="text-sm font-bold text-gray-900">
                {item.value} <span className="text-xs font-normal text-gray-500">{item.payload.unit || ''}</span>
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{item.name}</p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const renderComparisonCard = (metricName: string) => {
    const comparison = data.comparisons?.[metricName]
    if (!comparison) return null

    const { currentAvg, percentChange } = comparison
    const isIncrease = percentChange > 0

    return (
      <Card className="p-4 border-l-4 border-blue-500 bg-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{metricName.replace(/_/g, ' ')} Avg</p>
            <h4 className="text-2xl font-black text-gray-900">{currentAvg}</h4>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-black ${percentChange === 0 ? 'bg-gray-100 text-gray-600' :
            isIncrease ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}>
            {percentChange === 0 ? <Minus size={12} /> :
              isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(percentChange)}%</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">vs previous {timeRange} days</p>
      </Card>
    )
  }

  const renderDesktopSugar = () => {
    if (!data?.timeseries || Object.keys(data.timeseries).length === 0) return <EmptyState category="Blood Sugar" />

    const fastingData = data.timeseries['fasting'] || data.timeseries['random'] || []
    const postMealData = data.timeseries['post_meal'] || []
    const hba1cData = data.timeseries['hba1c'] || []

    const totalReadings = fastingData.length + postMealData.length
    const rangeStats = [
      { name: 'Normal (70-140)', value: fastingData.filter((d: any) => d.value >= 70 && d.value <= 100).length + postMealData.filter((d: any) => d.value >= 70 && d.value <= 140).length, color: '#10b981' },
      { name: 'Elevated', value: fastingData.filter((d: any) => d.value > 100).length + postMealData.filter((d: any) => d.value > 140).length, color: '#f59e0b' },
    ].filter(d => d.value > 0)

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderComparisonCard('fasting')}
          {renderComparisonCard('post_meal')}
          {renderComparisonCard('random')}
          {renderComparisonCard('hba1c')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2 bg-white">
            <h3 className="text-lg font-bold text-gray-900 flex items-center mb-6">
              <Droplets className="w-5 h-5 mr-2 text-blue-500" />
              Glucose Trends Over Time (mg/dL)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fastingData}>
                  <defs>
                    <linearGradient id="colorValuePC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Glucose" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValuePC)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h3 className="text-sm font-bold text-gray-900 mb-6">Status Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rangeStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rangeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">Total of {totalReadings} readings reviewed</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Post-Meal Spike Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postMealData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Post-Meal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-6">HbA1c Variance (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hba1cData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[4, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="step" dataKey="value" name="HbA1c" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const renderDesktopBP = () => {
    const ts = data?.timeseries
    if (!ts || (!ts['systolic'] && !ts['diastolic'])) return <EmptyState category="Blood Pressure" />

    const combinedData = (ts['systolic'] || []).map((s: any, idx: number) => ({
      date: s.date,
      systolic: s.value,
      diastolic: ts['diastolic']?.[idx]?.value || (ts['diastolic']?.find((d: any) => d.date === s.date)?.value) || 0,
      unit: s.unit
    }))

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderComparisonCard('systolic')}
          {renderComparisonCard('diastolic')}
          {renderComparisonCard('pulse')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2 bg-white">
            <h3 className="text-lg font-bold text-gray-900 flex items-center mb-6">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              Blood Pressure Trends (Systolic / Diastolic)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[40, 200]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {renderDistributionChart('systolic')}
        </div>
      </div>
    )
  }

  const renderDesktopOther = (category: string) => {
    const ts = data?.timeseries
    if (!ts || Object.keys(ts).length === 0) return <EmptyState category={category} />

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.keys(ts).map(name => renderComparisonCard(name))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(ts).map(metricName => (
            <div key={metricName} className="space-y-4">
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-6 capitalize">{metricName.replace(/_/g, ' ')} Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ts[metricName]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              {renderDistributionChart(metricName)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDistributionChart = (metricName: string) => {
    const distData = data.distributions?.find((d: any) => d.name === metricName)
    if (!distData) return null

    const chartData = [
      { name: 'Normal', value: distData.normal, fill: '#10b981' },
      { name: 'High', value: distData.high, fill: '#ef4444' },
      { name: 'Low', value: distData.low, fill: '#3b82f6' },
      { name: 'Abnormal', value: distData.abnormal, fill: '#f59e0b' }
    ].filter(d => d.value > 0)

    return (
      <Card className="p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center justify-between">
          <span>Readings Distribution</span>
          <Info size={14} className="text-gray-300" />
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} />
              <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    )
  }

  const renderSugarAnalytics = () => {
    if (!data?.timeseries || Object.keys(data.timeseries).length === 0) return <EmptyState category="Blood Sugar" />

    const fastingData = data.timeseries['fasting'] || data.timeseries['random'] || []
    const postMealData = data.timeseries['post_meal'] || []
    const hba1cData = data.timeseries['hba1c'] || []

    const totalReadings = fastingData.length + postMealData.length
    const rangeStats = [
      { name: 'Normal (70-140)', value: fastingData.filter((d: any) => d.value >= 70 && d.value <= 100).length + postMealData.filter((d: any) => d.value >= 70 && d.value <= 140).length, color: COLORS.secondary },
      { name: 'Elevated', value: fastingData.filter((d: any) => d.value > 100).length + postMealData.filter((d: any) => d.value > 140).length, color: COLORS.primary },
    ].filter(d => d.value > 0)

    const renderGridCard = (metricId: string, label: string, unit: string) => {
      const comp = data.comparisons?.[metricId]
      if (!comp) return null
      const { currentAvg, percentChange } = comp
      const isIncrease = percentChange > 0

      return (
        <div className="bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_10px_30px_rgba(25,28,29,0.04)] border border-white/50">
          <p className="text-[10px] font-black text-[#717786] uppercase tracking-[0.15em] mb-2">{label} Avg</p>
          <div className="flex items-baseline gap-1">
            <span className="font-headline font-black text-2xl text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>{currentAvg}</span>
            <span className="text-[10px] text-[#717786] font-bold opacity-60">{unit}</span>
          </div>
          <div className={`mt-3 flex items-center gap-1 font-black text-[10px] uppercase tracking-wider ${percentChange === 0 ? 'text-[#717786] opacity-40' :
            isIncrease ? 'text-[#ba1a1a]' : 'text-[#006c4f]'
            }`}>
            {percentChange === 0 ? <Minus size={12} /> : isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(percentChange)}%
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8 pb-12">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-4">
          {renderGridCard('fasting', 'Fasting', 'mg/dL')}
          {renderGridCard('post_meal', 'Post Meal', 'mg/dL')}
          {renderGridCard('random', 'Random', 'mg/dL')}
          {renderGridCard('hba1c', 'HbA1c', '%')}
        </div>

        {/* Main Chart: Glucose Trends */}
        <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(25,28,29,0.06)] border border-white/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-black text-lg text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>Glucose Trends Over Time</h3>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <Info size={16} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fastingData}>
                <defs>
                  <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f2" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  stroke="#717786"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#717786"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.primary}
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#glucoseGrad)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Secondary Charts Container */}
        <div className="space-y-6">
          {/* Status Breakdown (Donut) */}
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-white/50">
            <h3 className="font-headline font-black text-center text-sm uppercase tracking-widest text-[#717786] mb-8" style={{ fontFamily: 'Manrope' }}>Status Breakdown</h3>
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-48 h-48 group">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rangeStats}
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {rangeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center transition-transform group-hover:scale-110">
                  <span className="font-headline font-black text-3xl text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>{totalReadings}</span>
                  <span className="text-[10px] font-black text-[#717786] uppercase tracking-widest italic opacity-60">Readings</span>
                </div>
              </div>
              <div className="flex justify-center gap-6 w-full">
                {rangeStats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#717786] uppercase tracking-widest opacity-60">{stat.name.split(' ')[0]}</span>
                      <span className="text-xs font-black text-[#191c1d]">{Math.round((stat.value / totalReadings) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post-Meal Spike (Bar Chart) */}
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-white/50">
            <h3 className="font-headline font-black text-sm uppercase tracking-widest text-[#717786] mb-8" style={{ fontFamily: 'Manrope' }}>Post-Meal Spike Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postMealData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f2" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { weekday: 'short' }).toUpperCase()}
                    stroke="#717786"
                    fontSize={10}
                    fontWeight="black"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 85, 201, 0.05)' }} />
                  <Bar
                    dataKey="value"
                    fill={COLORS.secondary}
                    radius={[10, 10, 0, 0]}
                    barSize={30}
                    animationDuration={2000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* HbA1c Variance (Step Line) */}
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-white/50">
            <h3 className="font-headline font-black text-sm uppercase tracking-widest text-[#717786] mb-8" style={{ fontFamily: 'Manrope' }}>HbA1c Variance (%)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hba1cData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f2" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { month: 'short' }).toUpperCase()}
                    stroke="#717786"
                    fontSize={10}
                    fontWeight="black"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={[4, 12]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="step"
                    dataKey="value"
                    stroke={COLORS.secondary}
                    strokeWidth={4}
                    dot={{ r: 4, fill: COLORS.secondary, strokeWidth: 2, stroke: '#fff' }}
                    animationDuration={2500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBloodPressureAnalytics = () => {
    const ts = data?.timeseries
    if (!ts || (!ts['systolic'] && !ts['diastolic'])) return <EmptyState category="Blood Pressure" />

    const combinedData = (ts['systolic'] || []).map((s: any, idx: number) => ({
      date: s.date,
      systolic: s.value,
      diastolic: ts['diastolic']?.[idx]?.value || (ts['diastolic']?.find((d: any) => d.date === s.date)?.value) || 0,
      unit: s.unit
    }))

    const renderBPMetric = (metricId: string, label: string) => {
      const comp = data.comparisons?.[metricId]
      if (!comp) return null
      const { currentAvg, percentChange } = comp
      return (
        <div className="bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-white/50">
          <p className="text-[10px] font-black text-[#717786] uppercase tracking-[0.15em] mb-2">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-headline font-black text-2xl text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>{currentAvg}</span>
            <span className="text-[10px] text-[#717786] font-bold opacity-60">mmHg</span>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8 pb-12">
        <div className="grid grid-cols-2 gap-4">
          {renderBPMetric('systolic', 'Systolic Avg')}
          {renderBPMetric('diastolic', 'Diastolic Avg')}
          {renderBPMetric('pulse', 'Pulse Avg')}
        </div>

        <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/50">
          <h3 className="font-headline font-black text-lg text-[#191c1d] mb-8" style={{ fontFamily: 'Manrope' }}>Blood Pressure Trends</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f2" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  stroke="#717786" fontSize={10} fontWeight="bold"
                  tickLine={false} axisLine={false}
                />
                <YAxis stroke="#717786" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} domain={[40, 200]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke={COLORS.error} strokeWidth={4} dot={{ r: 4, fill: COLORS.error }} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke={COLORS.primary} strokeWidth={4} dot={{ r: 4, fill: COLORS.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6">
          {renderDistributionChart('systolic')}
        </div>
      </div>
    )
  }

  const renderOtherAnalytics = (category: string) => {
    const ts = data?.timeseries
    if (!ts || Object.keys(ts).length === 0) return <EmptyState category={category} />

    return (
      <div className="space-y-8 pb-12">
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(ts).map(name => {
            const comp = data.comparisons?.[name]
            if (!comp) return null
            return (
              <div key={name} className="bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-white/50">
                <p className="text-[10px] font-black text-[#717786] uppercase tracking-[0.15em] mb-2">{name.replace(/_/g, ' ')}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline font-black text-2xl text-[#191c1d]" style={{ fontFamily: 'Manrope' }}>{comp.currentAvg}</span>
                  <span className="text-[10px] text-[#717786] font-bold opacity-60">unit</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-6">
          {Object.keys(ts).map(metricName => (
            <div key={metricName} className="space-y-6">
              <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/50">
                <h3 className="font-headline font-black text-lg text-[#191c1d] mb-8 capitalize" style={{ fontFamily: 'Manrope' }}>{metricName.replace(/_/g, ' ')} Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ts[metricName]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f2" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxis}
                        stroke="#717786" fontSize={10} fontWeight="bold"
                        tickLine={false} axisLine={false}
                      />
                      <YAxis stroke="#717786" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={4} dot={{ r: 4, fill: COLORS.primary }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
              {renderDistributionChart(metricName)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const EmptyState = ({ category }: { category: string }) => (
    <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-dashed border-[#edeeef] text-center shadow-sm">
      <div className="w-24 h-24 bg-[#f8f9fa] rounded-full flex items-center justify-center mb-6 shadow-inner">
        <Info className="w-10 h-10 text-[#717786] opacity-20" />
      </div>
      <h3 className="font-headline font-black text-xl text-[#191c1d] mb-3" style={{ fontFamily: 'Manrope' }}>No Data for {category}</h3>
      <p className="text-[#414754] text-xs font-medium opacity-60 max-w-xs mb-8 leading-relaxed">
        We couldn't find any {category.toLowerCase()} records in the last {timeRange} days. Please upload medical reports to see your health trends.
      </p>
      <button
        onClick={() => navigate('/upload')}
        className="px-8 py-4 bg-[#0055c9] text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
      >
        Upload Records
      </button>
    </div>
  )

  return (
    <div className="bg-[#f8f9fa] font-body text-[#191c1d] antialiased pb-0">
      {/* Top App Bar - Exact Match from Medical Portal */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#dae2ff] flex items-center justify-center neon-glow-primary overflow-hidden cursor-pointer" onClick={() => navigate('/records')}>
            <img alt="JD" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATG4FiDS-jjh7NE4b_y8jPQIqZspwUtwSNv6E9UWe9P-t7QkR3ouJa9YnG5ipTLap4wae7ACX3XP5uDEPxgVOgYVgZFcKAuqLEjwmvKF054anKe3PRdBTtd41podwzrQLrzcgn0gG1cjeXoyK7xB8VKT9gbsP7ZOM16xp3GBDGCxhoBsuT_g4dBjZcAS1mfdVo3Qaf6kN60o2HptPsNFqjmtgmzMfdd04RwfDYUnphLMS7nK9Ao-mYiuh2BHFVOTyavvidHbsHqy4" />
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

      {/* Notification Tray Overlay - Mirroring Medical Portal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="p-6 flex justify-between items-center border-b border-slate-100">
            <h2 className="text-xl font-black text-[#191c1d] tracking-tight" style={{ fontFamily: 'Manrope' }}>Notifications</h2>
            <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
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
                <p className="text-[10px] font-black text-[#0055c9] uppercase tracking-widest mb-4">Pending Requests</p>
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
                    <button onClick={() => navigate('/manage-shares')} className="text-[#0055c9] hover:bg-slate-50 p-2 rounded-full transition-colors">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="absolute bottom-10 left-0 w-full px-6">
            <button onClick={() => setShowNotifications(false)} className="w-full py-5 bg-[#191c1d] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-black/10 active:scale-95 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="pt-10 px-5 space-y-5 pb-[10px]">
        {/* Global Header & Action Row */}
        <div className="flex flex-col gap-3 m-0 p-0">
          <div className="flex justify-between items-end mb-2 !mt-0">
            <div className="m-0 p-0">
              <h2 className="m-0 p-0 !mt-0 font-headline font-black text-2xl text-[#191c1d] tracking-tight leading-none" style={{ fontFamily: 'Manrope' }}>Health Analytics</h2>
              <p className="text-[#414754] text-xs font-medium opacity-60">Personal health insights & trends</p>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={exporting || loading}
              className="bg-white text-[#0055c9] px-4 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm border border-slate-100 active:scale-95 transition-all">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
          </div>

          {/* Responsive Selectors */}
          <div className="flex bg-[#edeeef] rounded-full p-1 gap-1 max-w-xl">
            {[30, 90, 180, 365].map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${timeRange === days ? 'bg-white shadow-sm text-[#0055c9]' : 'text-[#414754] opacity-60 hover:bg-white/50'
                  }`}>
                {days === 365 ? '1 Year' : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Category Tabs */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => setActiveTab('blood_sugar')}
            className={`flex-none px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'blood_sugar' ? 'bg-[#0055c9] text-white shadow-lg shadow-blue-900/20' : 'bg-white text-[#414754] border border-slate-100'
              }`}>Sugar</button>
          <button
            onClick={() => setActiveTab('blood_pressure')}
            className={`flex-none px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'blood_pressure' ? 'bg-[#0055c9] text-white shadow-lg shadow-blue-900/20' : 'bg-white text-[#414754] border border-slate-100'
              }`}>Blood Pressure</button>
          <button
            onClick={() => setActiveTab('other')}
            className={`flex-none px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'other' ? 'bg-[#0055c9] text-white shadow-lg shadow-blue-900/20' : 'bg-white text-[#414754] border border-slate-100'
              }`}>Others</button>
        </div>

        {/* Conditional Layout Content */}
        <div ref={contentRef}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#0055c9] animate-spin mb-4" />
              <p className="text-[10px] font-black text-[#717786] uppercase tracking-widest">Processing Data...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 p-8 rounded-3xl text-center border border-rose-100">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
              <p className="text-sm font-bold text-rose-900 mb-2">Analysis Failed</p>
              <p className="text-xs text-rose-600 opacity-80">{error}</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {/* Mobile View Layer */}
              <div className="md:hidden">
                {activeTab === 'blood_sugar' && renderSugarAnalytics()}
                {activeTab === 'blood_pressure' && renderBloodPressureAnalytics()}
                {activeTab === 'other' && (
                  <div className="space-y-6">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'cholesterol', label: 'Cholesterol' },
                        { id: 'thyroid', label: 'Thyroid' }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setSubCategory(sub.id as any)}
                          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${subCategory === sub.id ? 'bg-[#191c1d] text-white border-[#191c1d]' : 'bg-white text-[#414754] border-slate-100'
                            }`}>
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    {renderOtherAnalytics(subCategory)}
                  </div>
                )}
              </div>

              {/* Desktop View Layer */}
              <div className="hidden md:block">
                <div className="container mx-auto">
                  <div className="mb-6">
                    {activeTab === 'other' && (
                      <div className="flex space-x-2 animate-in slide-in-from-top-2 duration-300 mb-8">
                        {[
                          { id: 'cholesterol', label: 'Cholesterol' },
                          { id: 'thyroid', label: 'Thyroid' }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setSubCategory(sub.id as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${subCategory === sub.id
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeTab === 'blood_sugar' && renderDesktopSugar()}
                  {activeTab === 'blood_pressure' && renderDesktopBP()}
                  {activeTab === 'other' && renderDesktopOther(subCategory)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Standardized Bottom NavBar */}
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
        <div onClick={() => navigate('/analytics')} className="flex flex-col items-center justify-center bg-[#0055c9]/10 text-[#0055c9] rounded-full px-5 py-2 active:scale-90 duration-200 cursor-pointer">
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

export default Analytics
