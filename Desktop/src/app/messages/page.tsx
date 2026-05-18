'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/dashboard/helpers'
import { 
  Loader2, MessageCircle, Search, ArrowLeft, 
  Users, UserPlus, Send, Check, X, MoreVertical,
  Phone, Video, Info, Smile, Paperclip, Mic,
  CheckCheck, Clock, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  bio?: string
  last_seen?: string
  online?: boolean
}

interface Conversation {
  id: string
  other_user: Profile
  last_message: {
    id: string
    content: string
    created_at: string
    user_id: string
    is_read: boolean
  } | null
  unread_count: number
  updated_at: string
}

interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
  is_read: boolean
  profiles?: {
    display_name: string
    username: string
    avatar_url: string | null
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [allies, setAllies] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAllies, setLoadingAllies] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(new Map())
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUserProfile(profile)
    }
    getUser()
  }, [supabase, router])

  // Fetch data
  useEffect(() => {
    if (currentUserId) {
      fetchConversations()
      fetchAllies()
      subscribeToMessages()
    }
  }, [currentUserId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markConversationAsRead(selectedConversation.id)
      // Close mobile menu when conversation selected
      setIsMobileMenuOpen(false)
    }
  }, [selectedConversation])

  // Subscribe to real-time messages
  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          // Fetch full message with profile
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id (
                display_name,
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (newMessage) {
            // Update messages if in current conversation
            if (selectedConversation?.id === newMessage.conversation_id) {
              setMessages(prev => [...prev, newMessage])
            }
            
            // Update conversation list
            setConversations(prev => prev.map(conv => 
              conv.id === newMessage.conversation_id
                ? {
                    ...conv,
                    last_message: {
                      id: newMessage.id,
                      content: newMessage.content,
                      created_at: newMessage.created_at,
                      user_id: newMessage.user_id,
                      is_read: false
                    },
                    updated_at: newMessage.created_at,
                    unread_count: conv.unread_count + (newMessage.user_id !== currentUserId ? 1 : 0)
                  }
                : conv
            ))
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }

  const fetchAllies = async () => {
    if (!currentUserId) return
    
    setLoadingAllies(true)
    try {
      const { data: followingData } = await supabase
        .from('allies')
        .select('following_id')
        .eq('follower_id', currentUserId)

      const { data: followersData } = await supabase
        .from('allies')
        .select('follower_id')
        .eq('following_id', currentUserId)

      const userIds = new Set<string>()
      
      followingData?.forEach((f: any) => {
        if (f.following_id && f.following_id !== currentUserId) {
          userIds.add(f.following_id)
        }
      })
      
      followersData?.forEach((f: any) => {
        if (f.follower_id && f.follower_id !== currentUserId) {
          userIds.add(f.follower_id)
        }
      })

      if (userIds.size === 0) {
        setAllies([])
        return
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .in('id', Array.from(userIds))

      setAllies(profilesData || [])
    } catch (error) {
      console.error('Failed to fetch allies:', error)
    } finally {
      setLoadingAllies(false)
    }
  }

  const fetchConversations = async () => {
    if (!currentUserId) return
    
    setLoading(true)
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      if (!participants || participants.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      const conversationIds = participants.map(p => p.conversation_id)
      
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          messages (
            id,
            content,
            created_at,
            user_id,
            is_read
          )
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })

      const formatted: Conversation[] = []
      
      for (const conv of conversationsData || []) {
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)
          .neq('user_id', currentUserId)

        if (!otherParticipants || otherParticipants.length === 0) continue

        const otherUserId = otherParticipants[0].user_id
        
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, bio')
          .eq('id', otherUserId)
          .single()

        if (!otherProfile) continue

        const messages = conv.messages || []
        const lastMessage = messages[0] || null
        const unreadCount = messages.filter((m: any) => m.user_id !== currentUserId && !m.is_read).length

        formatted.push({
          id: conv.id,
          other_user: otherProfile,
          last_message: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            user_id: lastMessage.user_id,
            is_read: lastMessage.is_read,
          } : null,
          unread_count: unreadCount,
          updated_at: conv.updated_at,
        })
      }

      setConversations(formatted)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOrCreateConversation = async (otherUserId: string) => {
    if (!currentUserId) return null

    try {
      const { data: existingParticipant } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const conversationIds = existingParticipant?.map(p => p.conversation_id) || []

      if (conversationIds.length > 0) {
        const { data: match } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds)
          .maybeSingle()

        if (match) {
          return match.conversation_id
        }
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ type: 'direct', updated_at: new Date().toISOString() })
        .select()
        .single()

      if (convError) throw convError

      await supabase.from('conversation_participants').insert([
        { conversation_id: conversation.id, user_id: currentUserId },
        { conversation_id: conversation.id, user_id: otherUserId },
      ])

      return conversation.id
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return null
    }
  }

  const startConversation = async (ally: Profile) => {
    const conversationId = await getOrCreateConversation(ally.id)
    if (conversationId) {
      const existingConv = conversations.find(c => c.id === conversationId)
      if (existingConv) {
        setSelectedConversation(existingConv)
      } else {
        const newConv: Conversation = {
          id: conversationId,
          other_user: ally,
          last_message: null,
          unread_count: 0,
          updated_at: new Date().toISOString(),
        }
        setConversations(prev => [newConv, ...prev])
        setSelectedConversation(newConv)
      }
      setShowNewChat(false)
      setSearchQuery('')
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages(data || [])
      
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('user_id', currentUserId)
        .is('is_read', false)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const markConversationAsRead = (conversationId: string) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, unread_count: 0 } : c
    ))
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId || sending) return
    
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      user_id: currentUserId,
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
      profiles: {
        display_name: currentUserProfile?.display_name || 'You',
        username: currentUserProfile?.username || 'you',
        avatar_url: currentUserProfile?.avatar_url,
      }
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          user_id: currentUserId,
          content: messageInput.trim(),
          is_read: false
        })
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      
      // Update conversation list
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { 
              ...c, 
              last_message: {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                user_id: data.user_id,
                is_read: false
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

  const filteredAllies = allies.filter(ally =>
    ally.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ally.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!currentUserId) return null

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()} 
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Chats</h1>
            </div>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <MessageCircle className="h-5 w-5 text-orange-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Panel - Conversations List */}
        <div className={`
          ${selectedConversation && isMobileMenuOpen ? 'hidden' : 'flex'} 
          md:flex md:w-96 flex-col bg-white border-r border-gray-200
          w-full absolute md:relative inset-0 z-10 md:z-auto
        `}>
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* New Chat Panel */}
          {showNewChat && (
            <div className="border-b border-gray-100 max-h-80 overflow-y-auto bg-orange-50/20">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Contacts</h3>
                  <button 
                    onClick={() => setShowNewChat(false)} 
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                {loadingAllies ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : filteredAllies.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No contacts found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredAllies.map((ally) => {
                      const existingConv = conversations.find(c => c.other_user.id === ally.id)
                      return (
                        <button
                          key={ally.id}
                          onClick={() => existingConv ? setSelectedConversation(existingConv) : startConversation(ally)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                        >
                          <Avatar className="h-12 w-12">
                            {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white font-medium">
                              {ally.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">{ally.display_name}</p>
                            <p className="text-xs text-gray-400">@{ally.username}</p>
                          </div>
                          {existingConv ? (
                            <span className="text-xs text-orange-500">Message</span>
                          ) : (
                            <Send className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Start a conversation with someone</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full p-3 flex gap-3 hover:bg-gray-50 transition-all border-b border-gray-50 ${
                    selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <Avatar className="h-14 w-14">
                    {conv.other_user.avatar_url && <AvatarImage src={conv.other_user.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-base font-bold">
                      {conv.other_user.display_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conv.other_user.display_name}
                      </h3>
                      {conv.last_message && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {timeAgo(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                      {conv.last_message?.user_id === currentUserId && (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      )}
                      {conv.last_message?.content || 'Start a conversation'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unread_count}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          ${!selectedConversation ? 'hidden md:flex' : 'flex'} 
          flex-1 flex-col bg-gray-50
          absolute md:relative inset-0 md:inset-auto z-20 md:z-auto
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedConversation(null)
                      setIsMobileMenuOpen(true)
                    }}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <Link href={`/profile/${selectedConversation.other_user.username}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80">
                      {selectedConversation.other_user.avatar_url && <AvatarImage src={selectedConversation.other_user.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                        {selectedConversation.other_user.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href={`/profile/${selectedConversation.other_user.username}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-orange-600">
                        {selectedConversation.other_user.display_name}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-400">
                      {onlineStatus.get(selectedConversation.other_user.id) ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        `@${selectedConversation.other_user.username}`
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition">
                    <Phone className="h-5 w-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition">
                    <Video className="h-5 w-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition">
                    <Info className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.user_id === currentUserId
                    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.user_id !== message.user_id)
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8 mb-1">
                            {message.profiles?.avatar_url && <AvatarImage src={message.profiles.avatar_url} />}
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-xs">
                              {message.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? 'bg-orange-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOwn ? 'text-orange-100' : 'text-gray-400'}`}>
                            {timeAgo(message.created_at)}
                            {isOwn && (
                              message.is_read ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition">
                    <Smile className="h-5 w-5 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition">
                    <Paperclip className="h-5 w-5 text-gray-500" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition md:hidden">
                    <Mic className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-500 max-w-sm">
                Select a conversation from the list or start a new chat
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white font-medium rounded-full hover:shadow-lg transition"
              >
                Start a new chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
