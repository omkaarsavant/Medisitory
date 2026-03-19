// === frontend/src/pages/Dashboard.tsx ===

import React, { useState, useEffect } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { useRecordStore } from '../store/recordStore'
import { getRecords } from '../services/api'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState([
    { title: "Latest Readings", value: "0", change: "0", changeType: "neutral", unit: "today" },
    { title: "Recent Uploads", value: "0", change: "0", changeType: "neutral", unit: "this week" },
    { title: "Active Shares", value: "0", change: "0", changeType: "neutral", unit: "current" },
    { title: "Total Records", value: "0", change: "0", changeType: "neutral", unit: "all time" }
  ])
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const [healthAlerts, setHealthAlerts] = useState<any[]>([])
  const [recentShares, setRecentShares] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { records, setRecords } = useRecordStore()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get records to calculate stats
        const filters = { limit: 10 }
        const response = await getRecords(filters)
        const records = response.data.records
        setRecords(records)

        // Calculate stats
        const totalRecords = response.data.total
        const recentUploadsCount = records.filter(r =>
          new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
        const processedCount = records.filter(r => r.status === 'processed').length
        const errorCount = records.filter(r => r.status === 'error').length

        setStats([
          { title: "Latest Readings", value: processedCount.toString(), change: `+${processedCount}`, changeType: "increase", unit: "processed" },
          { title: "Recent Uploads", value: recentUploadsCount.toString(), change: `+${recentUploadsCount}`, changeType: "increase", unit: "this week" },
          { title: "Active Shares", value: "0", change: "0", changeType: "neutral", unit: "current" },
          { title: "Total Records", value: totalRecords.toString(), change: `+${totalRecords}`, changeType: "increase", unit: "all time" }
        ])

        // Set recent uploads
        setRecentUploads(records.slice(0, 4).map(record => ({
          id: record._id || record.id,
          category: record.category,
          patientName: record.patientName || 'Unknown',
          date: new Date(record.createdAt).toLocaleDateString(),
          doctor: record.doctor || 'Unknown',
          status: record.status
        })))

        // Set health alerts (example alerts)
        setHealthAlerts([
          { type: "warning", title: "High Blood Pressure", description: "Readings above normal range" },
          { type: "info", title: "Missing Follow-up", description: "Schedule check-up with specialist" }
        ])

        // Set recent shares (example data)
        setRecentShares([
          { doctor: "Dr. Patel", categories: "Blood Sugar, BP", date: "Mar 10, 2026" },
          { doctor: "Dr. Garcia", categories: "Thyroid", date: "Mar 8, 2026" }
        ])

      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{stat.title}</h3>
              <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
              <div className="mt-2 text-xs">
                {stat.changeType === "increase" && (
                  <span className="text-green-600 font-medium">↑ {stat.change} {stat.unit}</span>
                )}
                {stat.changeType === "decrease" && (
                  <span className="text-red-600 font-medium">↓ {stat.change} {stat.unit}</span>
                )}
                {stat.changeType === "neutral" && (
                  <span className="text-gray-500 font-medium">{stat.change} {stat.unit}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Recent Uploads</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="p-6">
              {recentUploads.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm">No uploads yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentUploads.map((upload, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/records/${upload.id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        <Badge color={['completed', 'active', 'processed'].includes((upload.status || '').toLowerCase()) ? "green" : (upload.status || '').toLowerCase() === "pending" ? "yellow" : "red"}>
                          {upload.category} - {upload.patientName}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{upload.date}</p>
                          <p className="text-xs text-gray-500">{upload.doctor}</p>
                        </div>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider">
                        {upload.status === "Completed" || upload.status === "Active" ? (
                          <span className="text-green-600">Saved</span>
                        ) : upload.status === "Pending" ? (
                          <span className="text-yellow-600">Pending</span>
                        ) : (
                          <span className="text-red-600">Error</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Health Alerts */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Health Alerts</h2>
            </div>
            <div className="p-6 space-y-4">
              {healthAlerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg flex items-start space-x-3 ${alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-100' : 'bg-blue-50 border border-blue-100'}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {alert.type === "warning" ? (
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${alert.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'}`}>
                      {alert.title}
                    </h3>
                    <p className={`text-xs mt-1 ${alert.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'}`}>
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Shares */}
          <Card>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Dr. Shares</h2>
              <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Manage</button>
            </div>
            <div className="p-6">
              {recentShares.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-xs">No active shares</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentShares.map((share, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{share.doctor}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{share.categories}</p>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {share.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard