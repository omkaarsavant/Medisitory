import React, { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Message, getChatHistory } from '../services/doctorAccessService'
import { X, Send, Paperclip, MessageSquare, Shield, Clock, Minus, ExternalLink } from 'lucide-react'
import { MedicalRecord } from '../services/api'
import { useChatStore } from '../store/chatStore'
import { useDoctorStore } from '../store/doctorStore'

interface ChatWindowProps {
  shareToken: string
  senderId: 'patient' | 'doctor'
  senderName: string
  sharedRecords: MedicalRecord[]
  onClose: () => void
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  shareToken, 
  senderId, 
  senderName, 
  sharedRecords,
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedContextId, setSelectedContextId] = useState<string | undefined>(undefined)
  const [showContextSelector, setShowContextSelector] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  
  const { activeChatToken, senderId: chatStoreSenderId, senderName: chatStoreSenderName, chatWith, closeChat, isOpen, clearUnreadTotal } = useChatStore()
  const { clearUnread } = useDoctorStore()

  // Clear unread counts whenever chat is open and active
  useEffect(() => {
    if (!isMinimized) {
      clearUnreadTotal()
      clearUnread(shareToken)
    }
  }, [isMinimized, shareToken, clearUnreadTotal, clearUnread])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isMinimized])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(shareToken)
        setMessages(history)
      } catch (err) {
        console.error('Failed to load chat history:', err)
      }
    }
    loadHistory()

    const newSocket = io('http://localhost:5000')
    setSocket(newSocket)
    newSocket.emit('join_chat', shareToken)

    newSocket.on('receive_message', (message: Message) => {
      setMessages(prev => [...prev, message])
      if (isMinimized) setHasUnread(true)
    })

    newSocket.on('chat_ended', (_data?: { senderName: string }) => {
      // No longer needs to set global isEnded, divider will come via receive_message
    })

    return () => {
      newSocket.disconnect()
    }
  }, [shareToken, isMinimized, onClose])

  // Click outside to minimize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (windowRef.current && !windowRef.current.contains(event.target as Node) && !isMinimized) {
        setIsMinimized(true)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMinimized])

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() && !selectedContextId || !socket) return

    const messageData = {
      shareToken,
      senderId,
      senderName,
      content: newMessage,
      contextRecordId: selectedContextId
    }

    socket.emit('send_message', messageData)
    setNewMessage('')
    setSelectedContextId(undefined)
    setShowContextSelector(false)
  }

  const handleEndChat = () => {
    const isAlreadyConcluded = messages.length > 0 && messages[messages.length - 1].senderId === 'system'
    const hasMessages = messages.length > 0

    if (isAlreadyConcluded || !hasMessages) {
      // Immediate closure without asking/notifying
      onClose()
      return
    }
    setShowEndConfirm(true)
  }

  const confirmEndChat = () => {
    socket?.emit('end_chat', { shareToken, senderName, senderRole: senderId })
    setShowEndConfirm(false)
  }

  const getRecordName = (id: string) => {
    const record = sharedRecords.find(r => r._id === id || r.id === id)
    return record ? record.category.replace(/_/g, ' ') : 'Report'
  }

  if (isMinimized) {
    return (
      <button 
        onClick={() => {
          setIsMinimized(false)
          setHasUnread(false)
        }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-in zoom-in group"
      >
        <MessageSquare className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 border-2 border-white rounded-full animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <div 
      ref={windowRef}
      className="fixed bottom-6 right-6 z-50 w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500"
    >
      {/* Premium Header */}
      <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.2em] leading-tight mb-0.5 italic">Live Chat</h3>
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest opacity-80">
              {senderId === 'patient' ? `Clinician: ${chatWith}` : `Patient: ${chatWith}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 relative z-10">
          <button 
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
            title="Minimize"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button 
            type="button"
            onClick={handleEndChat}
            className="p-2.5 bg-red-500/20 hover:bg-red-500 text-red-100 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 group"
            title="End Consultation"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
        
        <Shield className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-white/5 rotate-[15deg]" />
      </div>

      {/* Message Stream */}
      <div className="flex-1 h-[400px] max-h-[400px] overflow-y-auto p-6 space-y-8 bg-gray-50/50 custom-scrollbar scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
            <div className="w-20 h-20 bg-gray-200 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
              <Clock className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Observation Hub Active</p>
            <p className="text-[10px] font-bold text-gray-400 italic">Discussion is optimized for shared clinical reports.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          if (msg.senderId === 'system') {
            return (
              <div key={idx} className="flex items-center gap-4 py-8 animate-in fade-in duration-700">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <div className="flex items-center gap-2 grayscale opacity-60">
                  <Shield className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap italic">
                    {msg.content}
                  </span>
                </div>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>
            )
          }
          const isMe = msg.senderId === senderId
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-600' : 'text-gray-400'}`}>{isMe ? 'You' : msg.senderName}</span>
                <span className="text-[8px] font-bold text-gray-300 uppercase italic">{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className={`
                max-w-[88%] px-6 py-4 rounded-[1.8rem] text-[13px] font-bold shadow-xl transition-all leading-relaxed
                ${isMe 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100/50' 
                  : 'bg-white text-gray-800 border-2 border-gray-100/80 rounded-tl-none shadow-gray-200/20'}
              `}>
                {msg.contextRecordId && (
                  <div className={`
                    mb-3 p-3 rounded-xl flex items-center gap-3 border text-[10px] font-black uppercase tracking-widest
                    ${isMe ? 'bg-indigo-700/50 border-white/20 text-indigo-100 shadow-inner' : 'bg-gray-50 border-gray-100 text-indigo-600'}
                  `}>
                    <ExternalLink className="w-4 h-4" />
                    <span>Reference: {getRecordName(msg.contextRecordId)}</span>
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          )
        })}


        {showEndConfirm && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 text-center scale-100 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transform -rotate-6">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-3 uppercase italic">End the conversation?</h3>
              <p className="text-gray-500 font-bold text-[10px] leading-relaxed uppercase tracking-widest mb-10 px-4">
                This will end the conversation. Chat history will remain.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowEndConfirm(false)}
                  className="py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmEndChat}
                  className="py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-red-100"
                >
                  End
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Contextual Input Hub */}
      <div className={`p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.03)] ${showEndConfirm ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        {showContextSelector && (
          <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Report</label>
              <button 
                type="button"
                onClick={() => setShowContextSelector(false)} 
                className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
              >
                Done
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
              {sharedRecords.map(record => (
                <button 
                  type="button"
                  key={record._id || record.id}
                  onClick={() => {
                    setSelectedContextId(record._id || record.id)
                    setShowContextSelector(false) // Auto-focus on input
                  }}
                  className={`
                    px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all group relative overflow-hidden
                    ${selectedContextId === (record._id || record.id) 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100/50 scale-105' 
                      : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-400 hover:text-indigo-600 hover:scale-105'}
                  `}
                >
                  <span className="relative z-10">{record.category.replace(/_/g, ' ')}</span>
                  {selectedContextId === (record._id || record.id) && <Shield className="absolute right-[-8px] top-[-8px] w-10 h-10 text-white/10 rotate-12" />}
                </button>
              ))}
              {sharedRecords.length === 0 && (
                <div className="w-full py-6 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  No verifiable reports in shared scope
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
          <button 
            type="button"
            onClick={() => setShowContextSelector(!showContextSelector)}
            className={`
              w-14 h-14 rounded-2xl transition-all border-2 flex items-center justify-center flex-shrink-0 group relative
              ${showContextSelector 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100/50' 
                : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-white'}
              ${selectedContextId ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''}
            `}
            title="Attach Clinical Context"
          >
            <Paperclip className={`w-6 h-6 transition-transform duration-500 ${selectedContextId ? 'rotate-45' : 'group-hover:rotate-12'}`} />
            {selectedContextId && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white animate-in zoom-in" />}
          </button>
          
          <div className="flex-1 relative group">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder=""
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:ring-8 focus:ring-indigo-50/50 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-inner"
            />
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim() && !selectedContextId}
            className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-100/50 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center flex-shrink-0 group"
          >
            <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow
