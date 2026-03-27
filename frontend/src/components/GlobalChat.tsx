import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useDoctorStore } from '../store/doctorStore'
import ChatWindow from './ChatWindow'
import { io } from 'socket.io-client'

const GlobalChat: React.FC = () => {
  const { activeChatToken, senderId, senderName, sharedRecords, isOpen, closeChat, incrementUnreadTotal } = useChatStore()
  const { incrementUnread, savedPatients } = useDoctorStore()
  const location = useLocation()

  const savedPatientsRef = useRef(savedPatients)
  useEffect(() => {
    savedPatientsRef.current = savedPatients
  }, [savedPatients])

  // Auto-close chat when switching between patient/doctor portals
  const prevPortalRef = useRef<'doctor' | 'patient' | null>(null)
  useEffect(() => {
    const isDoctorPortal = location.pathname.startsWith('/doctor')
    const currentPortal = isDoctorPortal ? 'doctor' : 'patient'

    if (prevPortalRef.current !== null && prevPortalRef.current !== currentPortal && isOpen) {
      closeChat()
    }
    prevPortalRef.current = currentPortal
  }, [location.pathname])

  // Also guard: don't show a patient-opened chat on doctor portal or vice versa
  const isDoctorPortal = location.pathname.startsWith('/doctor')
  const chatBelongsToCurrentPortal = senderId === null || 
    (isDoctorPortal && senderId === 'doctor') || 
    (!isDoctorPortal && senderId === 'patient')

  useEffect(() => {
    const socket = io('http://localhost:5000')

    socket.on('new_notification', (data: { shareToken: string, senderName: string, senderRole: string, type: string }) => {
      console.log('GlobalChat: Notification received', data)
      
      const isDoctorView = window.location.pathname.startsWith('/doctor')
      const currentRole = isDoctorView ? 'doctor' : 'patient'
      
      if (data.senderRole === currentRole) {
        return
      }

      // Route notification correctly
      const isForDoctor = isDoctorView && savedPatientsRef.current.some(p => p.shareToken === data.shareToken)
      
      if (isForDoctor) {
        console.log('GlobalChat: Incrementing doctor unread', data.shareToken)
        incrementUnread(data.shareToken)
      } else if (!isDoctorView) {
        console.log('GlobalChat: Incrementing patient unread total')
        incrementUnreadTotal(data.shareToken, data.senderName)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [incrementUnread, incrementUnreadTotal])

  if (!isOpen || !activeChatToken || !senderId || !senderName || !chatBelongsToCurrentPortal) {
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
