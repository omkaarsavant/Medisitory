import React from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'

const Sharing: React.FC = () => {
  const [activeShares, setActiveShares] = React.useState([
    { id: 1, doctorEmail: 'dr.jane@example.com', categories: 'Blood Sugar, Blood Pressure', created: 'Mar 10, 2026', expires: 'Apr 10, 2026', status: 'active' },
    { id: 2, doctorEmail: 'dr.patel@example.com', categories: 'Thyroid', created: 'Mar 8, 2026', expires: 'Apr 8, 2026', status: 'active' },
    { id: 3, doctorEmail: 'dr.garcia@example.com', categories: 'Cholesterol', created: 'Mar 5, 2026', expires: 'Apr 5, 2026', status: 'active' }
  ])

  const [accessLogs, setAccessLogs] = React.useState([
    { id: 1, timestamp: 'Mar 15, 2026 10:30 AM', action: 'Viewed', doctorEmail: 'dr.jane@example.com', categories: 'Blood Sugar' },
    { id: 2, timestamp: 'Mar 14, 2026 2:15 PM', action: 'Downloaded', doctorEmail: 'dr.patel@example.com', categories: 'Thyroid' },
    { id: 3, timestamp: 'Mar 13, 2026 9:45 AM', action: 'Viewed', doctorEmail: 'dr.garcia@example.com', categories: 'Cholesterol' },
    { id: 4, timestamp: 'Mar 12, 2026 4:20 PM', action: 'Viewed', doctorEmail: 'dr.jane@example.com', categories: 'Blood Pressure' }
  ])

  const handleRevokeShare = (shareId: number) => {
    setActiveShares(activeShares.filter(share => share.id !== shareId))
    console.log('Share revoked:', shareId)
  }

  const handleViewLogs = (doctorEmail: string) => {
    console.log('Viewing logs for:', doctorEmail)
    // In a real app, this would open a modal or navigate to logs
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Doctor Access & Sharing</h1>

        {/* Active Shares */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Shares</h3>
            <Badge color="blue">{activeShares.length} active</Badge>
          </div>

          {activeShares.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M11 20h2a2 2 0 002-2v-2a3 3 0 00-4 0v2a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No active shares</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">{share.doctorEmail}</h4>
                      <Badge color="green">{share.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{share.categories}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created: {share.created}</span>
                      <span>Expires: {share.expires}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewLogs(share.doctorEmail)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View Logs
                    </button>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Create Share Button */}
        <Button onClick={() => console.log('Open create share modal')} className="w-full mb-8">
          Create New Share
        </Button>

        {/* Access Logs */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Access Logs</h3>
            <Badge color="blue">{accessLogs.length} entries</Badge>
          </div>

          {accessLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.55 6 8.583 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1c2.238-.632 3.944-1.756 4.894-3.246 1.413-1.757 2.133-4.095 2.133-6.871 0-7.627-7.389-11-11-11H5a2 2 0 00-2 2v5a2 2 0 002 2h2a2 2 0 002-2v1a3 3 0 006 0v-1h2a2 2 0 002 2h2a2 2 0 002-2zm0-8v4a2 2 0 114 0v-4a2 2 0 11-4 0z" />
              </svg>
              <p className="text-sm">No access logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categories
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={log.action === "Viewed" ? "blue" : "green"}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.doctorEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.categories}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default Sharing