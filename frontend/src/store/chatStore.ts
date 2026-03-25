import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MedicalRecord } from '../services/api'

interface ChatState {
  activeChatToken: string | null
  senderId: 'patient' | 'doctor' | null
  senderName: string | null
  chatWith: string | null
  lastNotificationToken: string | null
  lastNotificationSender: string | null
  sharedRecords: MedicalRecord[]
  isOpen: boolean
  unreadTotal: number

  // Actions
  openChat: (token: string, senderId: 'patient' | 'doctor', myName: string, theirName: string, records?: MedicalRecord[]) => void
  closeChat: () => void
  incrementUnreadTotal: (token: string, senderName: string) => void
  clearUnreadTotal: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      activeChatToken: null,
      senderId: null,
      senderName: null,
      chatWith: null,
      lastNotificationToken: null,
      lastNotificationSender: null,
      sharedRecords: [],
      isOpen: false,
      unreadTotal: 0,

      openChat: (token, senderId, myName, theirName, records = []) => {
        set({
          activeChatToken: token,
          senderId,
          senderName: myName,
          chatWith: theirName,
          sharedRecords: records,
          isOpen: true,
          unreadTotal: 0
        })
      },

      closeChat: () => {
        set({
          activeChatToken: null,
          senderId: null,
          senderName: null,
          chatWith: null,
          isOpen: false
        })
      },

      incrementUnreadTotal: (token: string, senderName: string) => {
        set((state) => ({ 
          unreadTotal: state.unreadTotal + 1,
          lastNotificationToken: token,
          lastNotificationSender: senderName
        }))
      },

      clearUnreadTotal: () => {
        set({ unreadTotal: 0 })
      }
    }),
    {
      name: 'chat-storage',
    }
  )
)
