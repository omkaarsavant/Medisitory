import React, { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { useDoctorStore } from '../store/doctorStore'
import ChatWindow from './ChatWindow'
import { io } from 'socket.io-client'

const GlobalChat: React.FC = () => {
  const { activeChatToken, senderId, senderName, sharedRecords, isOpen, closeChat, incrementUnreadTotal } = useChatStore()
  const { incrementUnread, savedPatients } = useDoctorStore()

  const savedPatientsRef = useRef(savedPatients)
  useEffect(() => {
    savedPatientsRef.current = savedPatients
  }, [savedPatients])

  useEffect(() => {
    const socket = io('http://localhost:5000')

    socket.on('new_notification', (data: { shareToken: string, senderName: string, senderRole: string, type: string }) => {
      console.log('GlobalChat: Notification received', data)
      
      const isDoctorPortal = window.location.pathname.includes('/doctor/')
      const currentRole = isDoctorPortal ? 'doctor' : 'patient'
      
      if (data.senderRole === currentRole) {
        return
      }

      // Route notification correctly
      const isForDoctor = isDoctorPortal && savedPatientsRef.current.some(p => p.shareToken === data.shareToken)
      
      if (isForDoctor) {
        console.log('GlobalChat: Incrementing doctor unread', data.shareToken)
        incrementUnread(data.shareToken)
      } else if (!isDoctorPortal) {
        console.log('GlobalChat: Incrementing patient unread total')
        incrementUnreadTotal(data.shareToken, data.senderName)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [incrementUnread, incrementUnreadTotal])

  if (!isOpen || !activeChatToken || !senderId || !senderName) {
    return null
  }

  return (
    <ChatWindow 
      shareToken={activeChatToken}
      senderId={senderId}
      senderName={senderName}
      sharedRecords={sharedRecords}
      onClose={closeChat}
    />
  )
}

export default GlobalChat
