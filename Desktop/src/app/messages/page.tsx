'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/dashboard/helpers'
import { 
  Loader2, MessageCircle, Search, ArrowLeft, 
  Users, UserPlus, Send, Check
} from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  bio?: string
}

interface Conversation {
  id: string
  other_user: Profile
  last_message: {
    id: string
    content: string
    created_at: string
    user_id: string
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
  profiles?: {
    display_name: string
    username: string
    avatar_url: string | null
  }
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [allies, setAllies] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAllies, setLoadingAllies] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedAlly, setSelectedAlly] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const router = useRouter()
  const supabase = createClient()

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

  // Fetch conversations and allies after user is set
  useEffect(() => {
    if (currentUserId) {
      fetchConversations()
      fetchAllies()
    }
  }, [currentUserId])

  // Fetch all allies (followers and following)
  const fetchAllies = async () => {
    if (!currentUserId) return
    
    setLoadingAllies(true)
    try {
      // Get users that the current user follows
      const { data: following } = await supabase
        .from('allies')
        .select(`
          following_id,
          profiles:following_id (
            id,
            display_name,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', currentUserId)

      // Get users that follow the current user
      const { data: followers } = await supabase
        .from('allies')
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            display_name,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', currentUserId)

      // Combine and deduplicate
      const alliesMap = new Map<string, Profile>()
      
      following?.forEach((f: any) => {
        if (f.profiles && f.profiles.id !== currentUserId) {
          alliesMap.set(f.profiles.id, f.profiles)
        }
      })
      
      followers?.forEach((f: any) => {
        if (f.profiles && f.profiles.id !== currentUserId) {
          alliesMap.set(f.profiles.id, f.profiles)
        }
      })

      setAllies(Array.from(alliesMap.values()))
    } catch (error) {
      console.error('Failed to fetch allies:', error)
    } finally {
      setLoadingAllies(false)
    }
  }

  // Fetch conversations
  const fetchConversations = async () => {
    if (!currentUserId) return
    
    setLoading(true)
    try {
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

      const formatted: Conversation[] = []
      
      for (const p of participants || []) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            profiles!user_id (
              id,
              display_name,
              username,
              avatar_url,
              bio
            )
          `)
          .eq('conversation_id', p.conversation_id)
          .neq('user_id', currentUserId)
          .single()

        if (!otherParticipant?.profiles) continue

        const messages = p.conversations?.messages || []
        const lastMessage = messages[0] || null
        const unreadCount = messages.filter((m: any) => m.user_id !== currentUserId).length

        formatted.push({
          id: p.conversation_id,
          other_user: {
            id: otherParticipant.user_id,
            display_name: otherParticipant.profiles.display_name,
            username: otherParticipant.profiles.username,
            avatar_url: otherParticipant.profiles.avatar_url,
            bio: otherParticipant.profiles.bio,
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

  // Create or get existing conversation with an ally
  const getOrCreateConversation = async (otherUserId: string) => {
    if (!currentUserId) return null

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const conversationIds = existing?.map(c => c.conversation_id) || []

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

      // Create new conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({ type: 'direct' })
        .select()
        .single()

      if (error) throw error

      // Add participants
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

  // Start conversation with an ally
  const startConversation = async (ally: Profile) => {
    const conversationId = await getOrCreateConversation(ally.id)
    if (conversationId) {
      // Check if conversation already exists in list
      const existingConv = conversations.find(c => c.id === conversationId)
      if (existingConv) {
        setSelectedConversation(existingConv)
      } else {
        // Add to conversations list and select
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
      setSelectedAlly(null)
      setShowNewChat(false)
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
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markConversationAsRead(selectedConversation.id)
    }
  }, [selectedConversation])

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

  // Filter conversations by search
  const filteredConversations = conversations.filter(c =>
    c.other_user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter allies by search
  const filteredAllies = allies.filter(ally =>
    ally.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ally.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!currentUserId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-black text-gray-900">Messages</h1>
            </div>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium rounded-full hover:shadow-lg transition"
            >
              <UserPlus className="h-4 w-4" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Panel - Conversations & Allies */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages or allies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition"
                />
              </div>
            </div>

            {/* New Chat Panel */}
            {showNewChat && (
              <div className="border-b border-gray-100 max-h-64 overflow-y-auto">
                <div className="p-3 bg-orange-50/30">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    Your Allies
                  </h3>
                  {loadingAllies ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    </div>
                  ) : filteredAllies.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No allies found. Follow more creators to chat with them.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredAllies.map((ally) => {
                        const existingConv = conversations.find(c => c.other_user.id === ally.id)
                        return (
                          <button
                            key={ally.id}
                            onClick={() => existingConv ? setSelectedConversation(existingConv) : startConversation(ally)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white transition text-left"
                          >
                            <Avatar className="h-10 w-10">
                              {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-xs">
                                {ally.display_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {ally.display_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">@{ally.username}</p>
                            </div>
                            {existingConv ? (
                              <span className="text-xs text-orange-500">Chat</span>
                            ) : (
                              <Send className="h-3.5 w-3.5 text-gray-400" />
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
            <div className="divide-y divide-gray-50 max-h-[calc(100vh-250px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
                </div>
              ) : filteredConversations.length === 0 && !showNewChat ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Click "New Chat" to start a conversation</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      setShowNewChat(false)
                      setSearchQuery('')
                    }}
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
                      <div className="min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
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
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-180px)]">
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
                    </p>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
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
                                : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                            }`}
                          >
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
                      placeholder={`Message @${selectedConversation.other_user.username}...`}
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
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-[calc(100vh-180px)] text-center p-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Select a conversation from the list or click "New Chat" to message an ally
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium rounded-full hover:shadow-lg transition"
                >
                  Start a new chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
