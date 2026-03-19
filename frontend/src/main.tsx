// === frontend/src/main.tsx ===

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'

// Create React Query client for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000
    }
  }
})

// Root application component with error boundaries
const Root = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              zIndex: 9999
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<React.StrictMode><Root /></React.StrictMode>)