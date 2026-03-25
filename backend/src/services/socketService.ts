// === backend/src/services/socketService.ts ===

import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import Message from '../models/Message'

export class SocketService {
  private io: Server

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // In production, restrict this to your frontend URL
        methods: ['GET', 'POST']
      }
    })

    this.initialize()
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log('New client connected:', socket.id)

      // Join a chat room based on the share token
      socket.on('join_chat', (shareToken: string) => {
        socket.join(shareToken)
        console.log(`Socket ${socket.id} joined room ${shareToken}`)
      })

      // Handle sending messages
      socket.on('send_message', async (data: {
        shareToken: string
        senderId: 'patient' | 'doctor'
        senderName: string
        content: string
        contextRecordId?: string
      }) => {
        try {
          // Save message to database
          const newMessage = new Message({
            shareToken: data.shareToken,
            senderId: data.senderId,
            senderName: data.senderName,
            content: data.content,
            contextRecordId: data.contextRecordId
          })
          await newMessage.save()

          // Broadcast message to everyone in the room
          this.io.to(data.shareToken).emit('receive_message', newMessage)
          
          // Emit a notification event for the recipient
          this.io.emit('new_notification', {
            shareToken: data.shareToken,
            senderName: data.senderName,
            senderRole: data.senderId,
            type: 'message'
          })
        } catch (error) {
          console.error('Error sending message:', error)
        }
      })

      socket.on('end_chat', async (data: string | { shareToken: string, senderName: string, senderRole: string }) => {
        const shareToken = typeof data === 'string' ? data : data.shareToken
        const senderName = typeof data === 'string' ? 'Another participant' : data.senderName
        const senderRole = typeof data === 'string' ? 'unknown' : (data.senderRole || 'unknown')

        try {
          // Save persistent end chat event
          const endMessage = new Message({
            shareToken,
            senderId: 'system',
            senderName: 'System',
            content: `Consultation Concluded by ${senderName}`,
            type: 'event'
          })
          await endMessage.save()

          this.io.to(shareToken).emit('chat_ended', { senderName, senderRole })
          
          // Sync history for everyone
          this.io.to(shareToken).emit('receive_message', endMessage)
        } catch (err) {
          console.error('Error ending chat:', err)
        }
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  public getIO() {
    return this.io
  }
}

let socketServiceInstance: SocketService | null = null

export const initializeSocket = (server: HttpServer) => {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketService(server)
  }
  return socketServiceInstance
}

export const getSocketService = () => {
  if (!socketServiceInstance) {
    throw new Error('SocketService not initialized')
  }
  return socketServiceInstance
}
