import path from 'path'
import dotenv from 'dotenv'
// Load environment variables immediately from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') })

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { connectDatabase } from './config/database'
import { initializeCloudinary } from './services/cloudinaryService'
import routes from './routes'

// Initialize services
initializeCloudinary()

import http from 'http'
import { initializeSocket } from './services/socketService'

// Initialize Express app
const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

// Initialize Socket.io
initializeSocket(server)

// Middleware setup
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Connect to database
connectDatabase().catch(error => {
  console.error('Failed to connect to database:', error)
  process.exit(1)
})

// API routes
app.use('/', routes)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'MedVault backend is running'
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 MedVault backend server running on port ${PORT}`)
  console.log(`📍 Backend URL: http://localhost:${PORT}`)
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default server