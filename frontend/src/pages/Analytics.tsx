// === frontend/src/pages/Analytics.tsx ===

import React, { useState, useEffect } from 'react'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell, PieChart, Pie
} from 'recharts'
import { Activity, Thermometer, Droplets, Heart, AlertCircle, Info, Calendar, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, ErrorMessage } from '../components'
import { getAnalyticsData } from '../services/api'

const COLORS = {
  normal: '#10b981', // green-500
  high: '#ef4444',   // red-500
  low: '#3b82f6',    // blue-500
  abnormal: '#f59e0b' // amber-500
}

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blood_sugar' | 'bp' | 'cholesterol' | 'thyroid'>('blood_sugar')
  const [timeRange, setTimeRange] = useState(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await getAnalyticsData(activeTab, timeRange)
        if (response.success) {
          setData(response.data)
        } else {
          setError('Failed to load analytics data')
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError('Failed to load analytics data. Please make sure you have uploaded records with this category.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, timeRange])

  const tabs = [
    { id: 'blood_sugar', label: 'Blood Sugar', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'bp', label: 'Blood Pressure', icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'cholesterol', label: 'Cholesterol', icon: Heart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'thyroid', label: 'Thyroid', icon: Thermometer, color: 'text-purple-600', bg: 'bg-purple-50' },
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
    const isSignificant = Math.abs(percentChange) > 5

    return (
      <Card className="p-4 border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{metricName.replace(/_/g, ' ')} Avg</p>
            <h4 className="text-2xl font-black text-gray-900">{currentAvg}</h4>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-black ${
            percentChange === 0 ? 'bg-gray-100 text-gray-600' :
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

  const renderDistributionChart = (metricName: string) => {
    const distData = data.distributions?.find((d: any) => d.name === metricName)
    if (!distData) return null

    const chartData = [
      { name: 'Normal', value: distData.normal, fill: COLORS.normal },
      { name: 'High', value: distData.high, fill: COLORS.high },
      { name: 'Low', value: distData.low, fill: COLORS.low },
      { name: 'Abnormal', value: distData.abnormal, fill: COLORS.abnormal }
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
    
    // Glucose data might have multiple types like 'fasting', 'post_meal'
    const fastingData = data.timeseries['fasting'] || data.timeseries['random'] || []
    const hba1cData = data.timeseries['hba1c'] || []
    
    return (
      <div className="space-y-6">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderComparisonCard('fasting')}
          {renderComparisonCard('post_meal')}
          {renderComparisonCard('random')}
          {renderComparisonCard('hba1c')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Droplets className="w-5 h-5 mr-2 text-blue-500" />
                Glucose Trends (mg/dL)
              </h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fastingData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis} 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    name="Glucose"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {renderDistributionChart('fasting')}
        </div>

        {hba1cData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">HbA1c Long-term Trend (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hba1cData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="HbA1c" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            {renderDistributionChart('hba1c')}
          </div>
        )}
      </div>
    )
  }

  const renderBPAnalytics = () => {
    const ts = data?.timeseries
    if (!ts || (!ts['systolic'] && !ts['diastolic'])) return <EmptyState category="Blood Pressure" />

    // Combine systolic and diastolic for chart
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
          <Card className="p-6 col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                BP Trends (Systolic / Diastolic)
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[40, 200]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36}/>
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

  const renderOtherAnalytics = (category: string) => {
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
              <Card className="p-6">
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

  const EmptyState = ({ category }: { category: string }) => (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <Info className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Data for {category}</h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        We couldn't find any {category.toLowerCase()} records in the last {timeRange} days. Please upload medical reports to see your health trends.
      </p>
      <Button onClick={() => window.location.href = '/upload'} variant="primary">
        Upload Records
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Health Analytics</h1>
            <p className="text-gray-600">Advanced monitoring and comparative health insights</p>
          </div>
          <div className="flex items-center space-x-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            {[30, 90, 180, 365].map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  timeRange === days 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {days === 365 ? '1 Year' : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-4 mb-8 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? `${tab.bg} border-2 border-transparent shadow-lg transform scale-105` 
                  : 'bg-white border-2 border-transparent hover:border-gray-100 text-gray-500'
              }`}
            >
              <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} />
              </div>
              <span className={`font-extrabold ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Analytics Content */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'blood_sugar' && renderSugarAnalytics()}
            {activeTab === 'bp' && renderBPAnalytics()}
            {(activeTab === 'cholesterol' || activeTab === 'thyroid') && renderOtherAnalytics(activeTab)}
          </div>
        )}

        {/* Export Footer */}
        <div className="mt-12 flex justify-center">
          <Button variant="outline" icon={<Download size={16} />} className="bg-white hover:bg-gray-50 transition-colors">
            Export Comprehensive Report (PDF)
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Analytics
