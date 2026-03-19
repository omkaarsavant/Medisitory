import React from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'

const Metrics: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState('Blood Sugar')
  const [selectedTimeRange, setSelectedTimeRange] = React.useState('1 month')
  const [selectedChartType, setSelectedChartType] = React.useState('line')

  const categories = [
    { id: 1, name: 'Blood Sugar', color: 'blue' },
    { id: 2, name: 'Blood Pressure', color: 'green' },
    { id: 3, name: 'Cholesterol', color: 'orange' },
    { id: 4, name: 'Thyroid', color: 'pink' },
    { id: 5, name: 'Heart Rate', color: 'purple' },
    { id: 6, name: 'BMI', color: 'gray' }
  ]

  const timeRanges = [
    { id: 1, name: '1 week', days: 7 },
    { id: 2, name: '1 month', days: 30 },
    { id: 3, name: '3 months', days: 90 },
    { id: 4, name: '6 months', days: 180 },
    { id: 5, name: '1 year', days: 365 },
    { id: 6, name: 'Custom', days: 0 }
  ]

  const chartTypes = [
    { id: 1, name: 'Line Chart', icon: 'line', type: 'line' },
    { id: 2, name: 'Bar Chart', icon: 'bar', type: 'bar' },
    { id: 3, name: 'Area Chart', icon: 'area', type: 'area' },
    { id: 4, name: 'Scatter Plot', icon: 'scatter', type: 'scatter' }
  ]

  const mockData = [
    { date: 'Mar 1', value: 120, unit: 'mg/dL', status: 'normal' },
    { date: 'Mar 2', value: 118, unit: 'mg/dL', status: 'normal' },
    { date: 'Mar 3', value: 125, unit: 'mg/dL', status: 'high' },
    { date: 'Mar 4', value: 115, unit: 'mg/dL', status: 'normal' },
    { date: 'Mar 5', value: 130, unit: 'mg/dL', status: 'high' },
    { date: 'Mar 6', value: 122, unit: 'mg/dL', status: 'normal' },
    { date: 'Mar 7', value: 128, unit: 'mg/dL', status: 'high' },
    { date: 'Mar 8', value: 119, unit: 'mg/dL', status: 'normal' },
    { date: 'Mar 9', value: 124, unit: 'mg/dL', status: 'high' },
    { date: 'Mar 10', value: 117, unit: 'mg/dL', status: 'normal' }
  ]

  const getChartPlaceholder = () => {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-500">Chart will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Health Metrics</h1>

        {/* Category Selector */}
        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Metric</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  selectedCategory === cat.name
                    ? `bg-${cat.color}-600 text-white`
                    : `bg-gray-100 text-gray-700 hover:bg-gray-200`
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Time Range Selector */}
        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Range</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setSelectedTimeRange(range.name)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  selectedTimeRange === range.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Chart Area */}
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Trend Chart</h3>
            <div className="flex space-x-2">
              {chartTypes.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => setSelectedChartType(chart.type)}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                    selectedChartType === chart.type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {chart.name}
                </button>
              ))}
            </div>
          </div>
          {getChartPlaceholder()}
        </Card>

        {/* Metrics Table */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Metrics</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Refresh
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Export CSV
              </Button>
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700">
                Export PDF
              </Button>
            </div>
          </div>

          {mockData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 00-2 2H6a2 2 0 00-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414a1 1 0 00-.707-.293H4z" />
              </svg>
              <p className="text-sm">No data available for this time range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockData.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={data.status === "normal" ? "success" : data.status === "high" ? "warning" : "error"}>
                          {data.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.status === "high" ? "Above normal range" : "Within normal range"}
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

export default Metrics