// === frontend/src/App.tsx ===

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import RecordDetails from './pages/RecordDetails'
import Upload from './pages/Upload'
import Analytics from './pages/Analytics'
import KnowYourReport from './pages/KnowYourReport'
import NotFound from './pages/NotFound'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path='records' element={<Records />} />
        <Route path='records/:id' element={<RecordDetails />} />
        <Route path='upload' element={<Upload />} />
        <Route path='analytics' element={<Analytics />} />
        <Route path='know-your-report' element={<KnowYourReport />} />
        <Route path='*' element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App