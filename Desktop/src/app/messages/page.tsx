// app/messages/page.tsx
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
  CheckCheck, Clock, ArrowRight, Plus, Camera,
  Music, File, Trash2, Edit2, Copy, Reply,
  Volume2, Camera, FolderPlus, AtSign, Link2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Types
interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  bio?: string
}

interface Group {
  id: string
  name: string
  description: string
  avatar_url: string | null
  created_by: string
  is_private: boolean
  invite_code: string
  member_count: number
  created_at: string
}

interface ChatItem {
  id: string
  type: 'direct' | 'group'
  name: string
  avatar_url: string | null
  last_message: {
    id: string
    content: string
    created_at: string
    user_id: string
    is_read: boolean
  } | null
  unread_count: number
  updated_at: string
  other_user?: Profile
  group?: Group
}

interface Message {
  id: string
  conversation_id?: string
  group_id?: string
  user_id: string
  content: string
  media_urls: string[]
  media_types: string[]
  created_at: string
  is_read: boolean
  is_deleted: boolean
  reply_to_id?: string
  profiles?: {
    display_name: string
    username: string
    avatar_url: string | null
  }
  reply_to?: Message
}

export default function MessagesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // State
  const [chats, setChats] = useState<ChatItem[]>([])
  const [allies, setAllies] = useState<Profile[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAllies, setLoadingAllies] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // New group state
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sentMessageIds = useRef<Set<string>>(new Set())

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

  // Fetch data when user is loaded
  useEffect(() => {
    if (currentUserId) {
      fetchChats()
      fetchAllies()
      fetchGroups()
    }
  }, [currentUserId])

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUserId) return

    const subscription = supabase
      .channel('messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          if (sentMessageIds.current.has(payload.new.id)) return
          
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id (
                display_name,
                username,
                avatar_url
              ),
              reply_to:reply_to_id (
                *,
                profiles:user_id (display_name, username, avatar_url)
              )
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (newMessage) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id)
              if (exists) return prev
              if (selectedChat?.id === newMessage.conversation_id || selectedChat?.id === newMessage.group_id) {
                return [...prev, newMessage]
              }
              return prev
            })
            fetchChats()
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [currentUserId, selectedChat?.id])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch messages when chat changes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat)
      markChatAsRead(selectedChat.id)
      setIsMobileMenuOpen(false)
    }
  }, [selectedChat])

  const fetchChats = async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      // Fetch direct conversations
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const directChats: ChatItem[] = []
      
      if (participants?.length) {
        for (const p of participants) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*, messages(*)')
            .eq('id', p.conversation_id)
            .single()
          
          if (conv) {
            const { data: otherParticipants } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', currentUserId)
            
            if (otherParticipants?.length) {
              const { data: otherUser } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherParticipants[0].user_id)
                .single()
              
              if (otherUser) {
                const messages = conv.messages || []
                const lastMessage = messages.sort((a: any, b: any) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]
                const unreadCount = messages.filter((m: any) => 
                  m.user_id !== currentUserId && !m.is_read
                ).length
                
                directChats.push({
                  id: conv.id,
                  type: 'direct',
                  name: otherUser.display_name,
                  avatar_url: otherUser.avatar_url,
                  other_user: otherUser,
                  last_message: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    created_at: lastMessage.created_at,
                    user_id: lastMessage.user_id,
                    is_read: lastMessage.is_read
                  } : null,
                  unread_count: unreadCount,
                  updated_at: conv.updated_at
                })
              }
            }
          }
        }
      }
      
      // Fetch group chats
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', currentUserId)
      
      const groupChats: ChatItem[] = (groupMemberships || []).map((gm: any) => ({
        id: gm.group_id,
        type: 'group',
        name: gm.groups.name,
        avatar_url: gm.groups.avatar_url,
        group: gm.groups,
        last_message: null,
        unread_count: 0,
        updated_at: gm.groups.updated_at
      }))
      
      const allChats = [...directChats, ...groupChats].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      
      setChats(allChats)
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllies = async () => {
    if (!currentUserId) return
    setLoadingAllies(true)
    try {
      const { data: following } = await supabase
        .from('allies')
        .select('following_id')
        .eq('follower_id', currentUserId)

      const { data: followers } = await supabase
        .from('allies')
        .select('follower_id')
        .eq('following_id', currentUserId)

      const userIds = new Set<string>()
      following?.forEach((f: any) => { if (f.following_id !== currentUserId) userIds.add(f.following_id) })
      followers?.forEach((f: any) => { if (f.follower_id !== currentUserId) userIds.add(f.follower_id) })

      if (userIds.size) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(userIds))
        setAllies(profiles || [])
      }
    } catch (error) {
      console.error('Failed to fetch allies:', error)
    } finally {
      setLoadingAllies(false)
    }
  }

  const fetchGroups = async () => {
    if (!currentUserId) return
    try {
      const { data } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', currentUserId)
      setGroups((data || []).map((d: any) => d.groups))
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    }
  }

  const fetchMessages = async (chat: ChatItem) => {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          ),
          reply_to:reply_to_id (
            *,
            profiles:user_id (display_name, username, avatar_url)
          )
        `)
        .order('created_at', { ascending: true })
        .limit(100)
      
      if (chat.type === 'direct') {
        query = query.eq('conversation_id', chat.id)
      } else {
        query = query.eq('group_id', chat.id)
      }
      
      const { data, error } = await query
      if (error) throw error
      setMessages(data || [])
      
      // Mark as read
      if (data?.length) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq(chat.type === 'direct' ? 'conversation_id' : 'group_id', chat.id)
          .neq('user_id', currentUserId)
          .is('is_read', false)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const markChatAsRead = (chatId: string) => {
    setChats(prev => prev.map(c => 
      c.id === chatId ? { ...c, unread_count: 0 } : c
    ))
  }

  const getOrCreateConversation = async (otherUserId: string) => {
    if (!currentUserId) return null
    try {
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const convIds = existing?.map(p => p.conversation_id) || []
      
      if (convIds.length) {
        const { data: match } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', convIds)
          .maybeSingle()
        
        if (match) return match.conversation_id
      }
      
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({ type: 'direct', updated_at: new Date().toISOString() })
        .select()
        .single()
      
      if (conversation) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: conversation.id, user_id: currentUserId },
          { conversation_id: conversation.id, user_id: otherUserId }
        ])
        return conversation.id
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
    return null
  }

  const createGroup = async () => {
    if (!currentUserId || !newGroupName.trim() || selectedMembers.length === 0) return
    
    setCreatingGroup(true)
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: currentUserId,
          invite_code: inviteCode,
          member_count: selectedMembers.length + 1
        })
        .select()
        .single()
      
      if (groupError) throw groupError
      
      const members = [...selectedMembers, currentUserId].map(userId => ({
        group_id: group.id,
        user_id: userId,
        role: userId === currentUserId ? 'admin' : 'member'
      }))
      
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(members)
      
      if (membersError) throw membersError
      
      setShowNewGroup(false)
      setNewGroupName('')
      setSelectedMembers([])
      await fetchChats()
    } catch (error) {
      console.error('Failed to create group:', error)
      alert('Failed to create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  const uploadMedia = async (files: File[]): Promise<{ urls: string[], types: string[] }> => {
    const urls: string[] = []
    const types: string[] = []
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUserId}/${Date.now()}_${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(fileName, file)
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat_media')
          .getPublicUrl(fileName)
        urls.push(publicUrl)
        types.push(file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file')
      }
    }
    
    return { urls, types }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const { urls } = await uploadMedia([audioFile])
        if (urls[0] && selectedChat) {
          await sendMediaMessage(urls[0], 'audio')
        }
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length && selectedChat) {
      const { urls, types } = await uploadMedia(files)
      for (let i = 0; i < urls.length; i++) {
        await sendMediaMessage(urls[i], types[i])
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendMediaMessage = async (mediaUrl: string, mediaType: string) => {
    if (!selectedChat || !currentUserId) return
    
    setSending(true)
    try {
      const messageData: any = {
        user_id: currentUserId,
        content: '',
        media_urls: [mediaUrl],
        media_types: [mediaType],
        is_read: false
      }
      
      if (selectedChat.type === 'direct') {
        messageData.conversation_id = selectedChat.id
      } else {
        messageData.group_id = selectedChat.id
      }
      
      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()
      
      if (error) throw error
      
      sentMessageIds.current.add(data.id)
      setReplyingTo(null)
      fetchChats()
    } catch (error) {
      console.error('Failed to send media:', error)
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async () => {
    if ((!messageInput.trim() && selectedMedia.length === 0) || !selectedChat || !currentUserId || sending) return
    
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const messageContent = messageInput.trim()
    
    setMessageInput('')
    
    let mediaUrls: string[] = []
    let mediaTypes: string[] = []
    
    if (selectedMedia.length) {
      const result = await uploadMedia(selectedMedia)
      mediaUrls = result.urls
      mediaTypes = result.types
      setSelectedMedia([])
    }
    
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: selectedChat.type === 'direct' ? selectedChat.id : undefined,
      group_id: selectedChat.type === 'group' ? selectedChat.id : undefined,
      user_id: currentUserId,
      content: messageContent,
      media_urls: mediaUrls,
      media_types: mediaTypes,
      created_at: new Date().toISOString(),
      is_read: false,
      is_deleted: false,
      profiles: {
        display_name: currentUserProfile?.display_name || 'You',
        username: currentUserProfile?.username || 'you',
        avatar_url: currentUserProfile?.avatar_url,
      }
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    
    try {
      const messageData: any = {
        user_id: currentUserId,
        content: messageContent,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        is_read: false
      }
      
      if (selectedChat.type === 'direct') {
        messageData.conversation_id = selectedChat.id
      } else {
        messageData.group_id = selectedChat.id
      }
      
      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          ),
          reply_to:reply_to_id (
            *,
            profiles:user_id (display_name, username, avatar_url)
          )
        `)
        .single()

      if (error) throw error
      
      sentMessageIds.current.add(data.id)
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      setReplyingTo(null)
      fetchChats()
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setMessageInput(messageContent)
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAllies = allies.filter(ally =>
    ally.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ally.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!currentUserId) return null

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition active:scale-95">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Chats</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewGroup(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition active:scale-95"
              >
                <FolderPlus className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="p-2 hover:bg-gray-100 rounded-full transition active:scale-95"
              >
                <MessageCircle className="h-5 w-5 text-orange-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Panel - Chats List */}
        <div className={`
          ${selectedChat && isMobileMenuOpen ? 'hidden' : 'flex'} 
          md:flex md:w-96 flex-col bg-white border-r border-gray-200
          w-full absolute md:relative inset-0 z-10 md:z-auto
        `}>
          {/* Search */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* New Chat Panel */}
          {(showNewChat || showNewGroup) && (
            <div className="border-b border-gray-100 max-h-96 overflow-y-auto bg-orange-50/20 flex-shrink-0">
              <div className="p-3">
                {showNewGroup ? (
                  // Create Group UI
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Create Group</h3>
                      <button onClick={() => { setShowNewGroup(false); setSelectedMembers([]); setNewGroupName('') }} className="p-1 hover:bg-gray-200 rounded-full">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                    />
                    <p className="text-xs text-gray-500 mb-2">Select members ({selectedMembers.length})</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allies.map((ally) => (
                        <button
                          key={ally.id}
                          onClick={() => {
                            if (selectedMembers.includes(ally.id)) {
                              setSelectedMembers(prev => prev.filter(id => id !== ally.id))
                            } else {
                              setSelectedMembers(prev => [...prev, ally.id])
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl transition ${selectedMembers.includes(ally.id) ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                        >
                          <Avatar className="h-10 w-10">
                            {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                              {ally.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">{ally.display_name}</p>
                            <p className="text-xs text-gray-400">@{ally.username}</p>
                          </div>
                          {selectedMembers.includes(ally.id) && <Check className="h-4 w-4 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={createGroup}
                      disabled={!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup}
                      className="w-full mt-3 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium disabled:opacity-50 active:scale-95 transition"
                    >
                      {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Group'}
                    </button>
                  </>
                ) : (
                  // New Chat UI
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Contacts</h3>
                      <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-gray-200 rounded-full">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    {loadingAllies ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                    ) : filteredAllies.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No contacts found</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredAllies.map((ally) => {
                          const existingConv = chats.find(c => c.type === 'direct' && c.other_user?.id === ally.id)
                          return (
                            <button
                              key={ally.id}
                              onClick={() => {
                                if (existingConv) {
                                  setSelectedChat(existingConv)
                                  setShowNewChat(false)
                                } else {
                                  getOrCreateConversation(ally.id).then(convId => {
                                    if (convId) fetchChats()
                                    setSelectedChat({
                                      id: convId!,
                                      type: 'direct',
                                      name: ally.display_name,
                                      avatar_url: ally.avatar_url,
                                      other_user: ally,
                                      last_message: null,
                                      unread_count: 0,
                                      updated_at: new Date().toISOString()
                                    })
                                    setShowNewChat(false)
                                  })
                                }
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition active:bg-gray-100"
                            >
                              <Avatar className="h-12 w-12">
                                {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                                  {ally.display_name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900">{ally.display_name}</p>
                                <p className="text-xs text-gray-400">@{ally.username}</p>
                              </div>
                              {existingConv ? <ArrowRight className="h-4 w-4 text-gray-400" /> : <Send className="h-4 w-4 text-gray-400" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Start a conversation</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => { setSelectedChat(chat); setIsMobileMenuOpen(false); setShowNewChat(false); setShowNewGroup(false); }}
                  className={`w-full p-3 flex gap-3 hover:bg-gray-50 transition-all border-b border-gray-50 active:bg-gray-100 ${
                    selectedChat?.id === chat.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <Avatar className="h-14 w-14">
                    {chat.avatar_url && <AvatarImage src={chat.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-base font-bold">
                      {chat.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {chat.type === 'group' && <Users className="h-3 w-3 text-gray-400" />}
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                      </div>
                      {chat.last_message && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {timeAgo(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                      {chat.last_message?.user_id === currentUserId && <CheckCheck className="h-3 w-3 text-blue-500" />}
                      {chat.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {chat.unread_count}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          ${!selectedChat ? 'hidden md:flex' : 'flex'} 
          flex-1 flex-col bg-gray-50
          absolute md:relative inset-0 md:inset-auto z-20 md:z-auto
        `}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedChat(null); setIsMobileMenuOpen(true); }} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full active:bg-gray-200">
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <Link href={selectedChat.type === 'direct' ? `/profile/${selectedChat.other_user?.username}` : '#'}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80">
                      {selectedChat.avatar_url && <AvatarImage src={selectedChat.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                        {selectedChat.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href={selectedChat.type === 'direct' ? `/profile/${selectedChat.other_user?.username}` : '#'}>
                      <h3 className="font-semibold text-gray-900 hover:text-orange-600">
                        {selectedChat.name}
                        {selectedChat.type === 'group' && <span className="text-xs text-gray-400 ml-1">({selectedChat.group?.member_count || 0})</span>}
                      </h3>
                    </Link>
                    {selectedChat.type === 'direct' && selectedChat.other_user && (
                      <p className="text-xs text-gray-400">@{selectedChat.other_user.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition active:bg-gray-200">
                    <Phone className="h-5 w-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition active:bg-gray-200">
                    <Video className="h-5 w-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition active:bg-gray-200">
                    <Info className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Reply indicator */}
                {replyingTo && (
                  <div className="bg-gray-100 rounded-lg p-2 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Reply className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Replying to {replyingTo.profiles?.display_name}</span>
                      <span className="text-gray-400 text-xs line-clamp-1">"{replyingTo.content.substring(0, 50)}"</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                )}
                
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Send a message to start</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.user_id === currentUserId
                    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.user_id !== message.user_id)
                    
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8 mb-1 flex-shrink-0">
                            {message.profiles?.avatar_url && <AvatarImage src={message.profiles.avatar_url} />}
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-xs">
                              {message.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}
                        
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isOwn ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                        }`}>
                          {/* Reply reference */}
                          {message.reply_to && (
                            <div className="text-xs opacity-70 mb-1 pb-1 border-b border-current border-opacity-20">
                              <span className="font-medium">↩️ Replying to {message.reply_to.profiles?.display_name}</span>
                              <p className="truncate">{message.reply_to.content.substring(0, 50)}</p>
                            </div>
                          )}
                          
                          {/* Media content */}
                          {message.media_urls?.map((url, i) => (
                            <div key={i} className="mb-2">
                              {message.media_types[i] === 'image' ? (
                                <Image src={url} alt="Image" width={200} height={200} className="rounded-lg max-w-full cursor-pointer" unoptimized />
                              ) : message.media_types[i] === 'video' ? (
                                <video src={url} controls className="rounded-lg max-w-full max-h-64" />
                              ) : message.media_types[i] === 'audio' ? (
                                <audio src={url} controls className="w-full" />
                              ) : (
                                <a href={url} target="_blank" className="flex items-center gap-2 text-blue-500 underline">
                                  <File className="h-4 w-4" /> View file
                                </a>
                              )}
                            </div>
                          ))}
                          
                          {/* Text content */}
                          {message.content && <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>}
                          
                          {/* Message actions */}
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <button onClick={() => setReplyingTo(message)} className="opacity-0 group-hover:opacity-100 transition">
                              <Reply className="h-3 w-3 text-gray-400 hover:text-orange-500" />
                            </button>
                            <p className={`text-[10px] flex items-center gap-1 ${isOwn ? 'text-orange-100' : 'text-gray-400'}`}>
                              {timeAgo(message.created_at)}
                              {isOwn && (message.is_read ? <CheckCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Recording indicator */}
              {recording && (
                <div className="bg-red-500 text-white p-3 text-center flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  Recording voice note... {formatDuration(recordingTime)}
                  <button onClick={stopRecording} className="px-3 py-1 bg-white text-red-500 rounded-full text-xs font-bold">
                    Stop
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
                {/* Selected media preview */}
                {selectedMedia.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {selectedMedia.map((file, i) => (
                      <div key={i} className="relative w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        {file.type.startsWith('image/') ? (
                          <Image src={URL.createObjectURL(file)} alt="Preview" width={64} height={64} className="object-cover rounded-lg" />
                        ) : (
                          <File className="h-8 w-8 text-gray-400" />
                        )}
                        <button onClick={() => setSelectedMedia(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full">
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0 active:bg-gray-200">
                    <Smile className="h-5 w-5 text-gray-500" />
                  </button>
                  <button onClick={handleFileSelect} className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0 active:bg-gray-200">
                    <Paperclip className="h-5 w-5 text-gray-500" />
                  </button>
                  <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0 active:bg-gray-200">
                    <Mic className="h-5 w-5 text-gray-500" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition min-h-[44px] max-h-[120px]"
                    rows={1}
                    style={{ height: 'auto' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!messageInput.trim() && selectedMedia.length === 0) || sending}
                    className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition flex-shrink-0 active:scale-95"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                
                <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" multiple onChange={handleFileChange} className="hidden" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-500 max-w-sm">Select a conversation or start a new chat</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNewChat(true)} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white font-medium rounded-full active:scale-95 transition">
                  New Chat
                </button>
                <button onClick={() => setShowNewGroup(true)} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-full active:scale-95 transition">
                  New Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
