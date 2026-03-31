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
import Calendar from './pages/Calendar'
import ManageShares from './pages/ManageShares'
import DoctorDetail from './pages/DoctorDetail'
import NotFound from './pages/NotFound'
import DoctorLayout from './pages/doctor/DoctorLayout'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorScan from './pages/doctor/DoctorScan'
import DoctorPatientView from './pages/doctor/DoctorPatientView'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import GlobalChat from './components/GlobalChat'

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path='/doctor' element={<DoctorLayout />}>
          <Route index element={<DoctorDashboard />} />
          <Route path='scan' element={<DoctorScan />} />
          <Route path='appointments' element={<DoctorAppointments />} />
          <Route path='patient/:token' element={<DoctorPatientView />} />
        </Route>
        <Route path='/' element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path='records' element={<Records />} />
          <Route path='records/:id' element={<RecordDetails />} />
          <Route path='upload' element={<Upload />} />
          <Route path='analytics' element={<Analytics />} />
          <Route path='know-your-report' element={<KnowYourReport />} />
          <Route path='calendar' element={<Calendar />} />
          <Route path='manage-shares' element={<ManageShares />} />
          <Route path='manage-shares/:token' element={<DoctorDetail />} />
          <Route path='*' element={<NotFound />} />
        </Route>
      </Routes>
      <GlobalChat />
    </>
  )
}

export default App