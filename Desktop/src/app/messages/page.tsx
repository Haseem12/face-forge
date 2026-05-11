'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/dashboard/helpers'
import { Loader2, MessageCircle, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Conversation {
  id: string
  other_user: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
  }
  last_message: {
    id: string
    content: string
    created_at: string
    user_id: string
  } | null
  unread_count: number
  updated_at: string
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const router = useRouter()
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)
    }
    getUser()
  }, [supabase, router])

  // Fetch conversations list
  const fetchConversations = async () => {
    if (!currentUserId) return
    
    setLoading(true)
    try {
      // Get all conversations for current user
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            updated_at,
            messages (
              id,
              content,
              created_at,
              user_id
            )
          )
        `)
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false, foreignTable: 'conversations' })

      if (error) throw error

      // Process and format conversations
      const formatted: Conversation[] = []
      
      for (const p of participants || []) {
        // Get the other participant
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            profiles!user_id (
              id,
              display_name,
              username,
              avatar_url
            )
          `)
          .eq('conversation_id', p.conversation_id)
          .neq('user_id', currentUserId)
          .single()

        if (!otherParticipant?.profiles) continue

        const messages = p.conversations?.messages || []
        const lastMessage = messages[0] || null
        
        // Count unread messages
        const unreadCount = messages.filter((m: any) => m.user_id !== currentUserId).length

        formatted.push({
          id: p.conversation_id,
          other_user: {
            id: otherParticipant.user_id,
            display_name: otherParticipant.profiles.display_name,
            username: otherParticipant.profiles.username,
            avatar_url: otherParticipant.profiles.avatar_url,
          },
          last_message: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            user_id: lastMessage.user_id,
          } : null,
          unread_count: unreadCount,
          updated_at: p.conversations?.updated_at || new Date().toISOString(),
        })
      }

      setConversations(formatted)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages(data || [])
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversation && currentUserId) {
      fetchMessages(selectedConversation.id)
      // Mark unread messages as read
      markAsRead(selectedConversation.id)
    }
  }, [selectedConversation, currentUserId])

  const markAsRead = async (conversationId: string) => {
    // Update local state
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, unread_count: 0 } : c
    ))
    // Optionally call API to mark as read on server
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId || sending) return
    
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      user_id: currentUserId,
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        display_name: 'You',
        username: 'you',
        avatar_url: null,
      }
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          user_id: currentUserId,
          content: messageInput.trim(),
        })
        .select(`
          *,
          profiles!user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      
      // Replace optimistic message
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      
      // Update conversation list with new last message
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { 
              ...c, 
              last_message: {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                user_id: data.user_id,
              },
              updated_at: data.created_at
            }
          : c
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.other_user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return
    
    const channel = supabase
      .channel(`chat:${selectedConversation.id}`)
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = Object.keys(state)
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [selectedConversation, supabase, currentUserId])

  if (!currentUserId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-black text-gray-900">Messages</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Conversations List */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition"
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-[calc(100vh-200px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation from someone's profile</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 flex gap-3 hover:bg-gray-50 transition text-left ${
                      selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      {conv.other_user.avatar_url && <AvatarImage src={conv.other_user.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-sm font-bold">
                        {conv.other_user.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.other_user.display_name}
                        </h3>
                        {conv.last_message && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                            {timeAgo(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {conv.last_message?.content || 'Start a conversation'}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {conv.unread_count}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2">
            {selectedConversation ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-200px)]">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-white/95">
                  <Link href={`/profile/${selectedConversation.other_user.username}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition">
                      {selectedConversation.other_user.avatar_url && <AvatarImage src={selectedConversation.other_user.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                        {selectedConversation.other_user.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link href={`/profile/${selectedConversation.other_user.username}`}>
                      <h3 className="font-bold text-gray-900 hover:text-orange-600 transition">
                        {selectedConversation.other_user.display_name}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-400">
                      @{selectedConversation.other_user.username}
                      {onlineUsers.includes(selectedConversation.other_user.id) && (
                        <span className="text-green-500 ml-2">● Online</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs mt-1">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.user_id === currentUserId
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-semibold opacity-75 mb-1">
                                {message.profiles?.display_name}
                              </p>
                            )}
                            <p className="text-sm break-words">{message.content}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                              {timeAgo(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-100 p-3 bg-white">
                  <div className="flex gap-2">
                    <textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
                      rows={1}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || sending}
                      className="px-4 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <MessageCircle className="h-16 w-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Your Messages</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Select a conversation from the list or start a new one from someone's profile
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
