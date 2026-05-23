// app/dashboard/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell, Sparkles, Users, TrendingUp, MessageCircle, Hash,
  Plus, Send, Image as ImageIcon, Smile, X, Clock,
  Eye, Heart, Share2, MoreVertical, Pin, Flame,
  Crown, Zap, Lock, Globe, ChevronRight, Repeat
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import StoryViewer from '@/components/dashboard/stories/story-viewer'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import ThreeCurveFab from '@/components/dashboard/layout/three-curve-fab'

// Types
interface Channel {
  id: string
  name: string
  description: string
  avatar_url: string
  channel_type: 'public' | 'private' | 'announcement'
  member_count: number
  message_count: number
  settings: {
    ephemeral_messages?: boolean
    message_expiry_hours?: number
    allow_media?: boolean
  }
  last_message?: {
    content: string
    created_at: string
    user: {
      display_name: string
    }
  }
  unread_count?: number
}

interface ChannelMessage {
  id: string
  content: string
  media_urls: string[]
  created_at: string
  expires_at: string | null
  user_id: string
  reactions: Record<string, string[]>
  view_count: number
  profiles: {
    display_name: string
    username: string
    avatar_url: string
  }
}

interface Update {
  id: string
  type: 'story' | 'channel_message' | 'channel_join' | 'trending' | 'announcement'
  title: string
  content: string
  created_at: string
  read: boolean
  channel_id?: string
  channel_name?: string
  user?: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  media_url?: string
  actionLink?: string
  views?: number
  likes?: number
  comments?: number
}

export default function UpdatesPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'updates' | 'channels'>('updates')
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfiles, setUserProfiles] = useState<any[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user)
    }
    getUser()
  }, [supabase])

  // Fetch user profiles for stories
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentUser) return
      
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .limit(20)
      
      setUserProfiles(data || [])
    }
    fetchProfiles()
  }, [supabase, currentUser])

  // Fetch user's channels
  const fetchChannels = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at, role')
        .eq('user_id', currentUser.id)
      
      if (!memberships?.length) {
        setChannels([])
        return
      }
      
      const channelIds = memberships.map(m => m.channel_id)
      
      const { data: channelsData } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds)
        .eq('is_archived', false)
      
      // Get last message for each channel
      const channelsWithLastMsg = await Promise.all(
        (channelsData || []).map(async (channel) => {
          const { data: lastMsg } = await supabase
            .from('channel_messages')
            .select(`
              content,
              created_at,
              user_id,
              profiles:user_id (display_name)
            `)
            .eq('channel_id', channel.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          const membership = memberships.find(m => m.channel_id === channel.id)
          const unreadCount = lastMsg && membership?.last_read_at 
            ? new Date(lastMsg.created_at) > new Date(membership.last_read_at) ? 1 : 0
            : 0
          
          return {
            ...channel,
            last_message: lastMsg ? {
              content: lastMsg.content,
              created_at: lastMsg.created_at,
              user: lastMsg.profiles
            } : undefined,
            unread_count: unreadCount
          }
        })
      )
      
      setChannels(channelsWithLastMsg.sort((a, b) => 
        new Date(b.last_message?.created_at || 0).getTime() - new Date(a.last_message?.created_at || 0).getTime()
      ))
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }, [supabase, currentUser])

  // Fetch updates feed
  const fetchUpdates = useCallback(async () => {
    if (!currentUser) return
    
    try {
      // Fetch recent channel messages from joined channels
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', currentUser.id)
      
      const channelIds = memberships?.map(m => m.channel_id) || []
      
      let recentMessages: any[] = []
      if (channelIds.length) {
        const { data } = await supabase
          .from('channel_messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            channel_id,
            channels!inner (name),
            profiles:user_id (display_name, username, avatar_url)
          `)
          .in('channel_id', channelIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20)
        
        recentMessages = data || []
      }
      
      // Transform to updates format
      const updatesList: Update[] = recentMessages.map(msg => ({
        id: `msg_${msg.id}`,
        type: 'channel_message',
        title: msg.channels?.name || 'Channel',
        content: msg.content,
        created_at: msg.created_at,
        read: false,
        channel_id: msg.channel_id,
        channel_name: msg.channels?.name,
        user: {
          id: msg.user_id,
          name: msg.profiles?.display_name || 'User',
          username: msg.profiles?.username || '',
          avatar: msg.profiles?.avatar_url
        }
      }))
      
      setUpdates(updatesList)
    } catch (error) {
      console.error('Error fetching updates:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentUser])

  // Fetch messages for selected channel
  const fetchMessages = useCallback(async () => {
    if (!selectedChannel || !currentUser) return
    
    try {
      const { data } = await supabase
        .from('channel_messages')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('channel_id', selectedChannel.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)
      
      setMessages(data || [])
      
      // Update last_read_at
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', selectedChannel.id)
        .eq('user_id', currentUser.id)
      
      // Update unread count in channels list
      setChannels(prev => prev.map(ch => 
        ch.id === selectedChannel.id ? { ...ch, unread_count: 0 } : ch
      ))
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [supabase, selectedChannel, currentUser])

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedChannel) return
    
    const subscription = supabase
      .channel(`channel_messages_${selectedChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        async (payload: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single()
          
          const newMessage = {
            ...payload.new,
            profiles: profile
          }
          
          setMessages(prev => [...prev, newMessage])
          
          // Update last_read_at if channel is open
          if (currentUser) {
            await supabase
              .from('channel_members')
              .update({ last_read_at: new Date().toISOString() })
              .eq('channel_id', selectedChannel.id)
              .eq('user_id', currentUser.id)
          }
          
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, selectedChannel, currentUser])

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChannel || !currentUser || sending) return
    
    setSending(true)
    try {
      const messageData: any = {
        channel_id: selectedChannel.id,
        user_id: currentUser.id,
        content: newMessage.trim()
      }
      
      // Add ephemeral expiry if enabled
      if (selectedChannel.settings?.ephemeral_messages) {
        const expiryHours = selectedChannel.settings.message_expiry_hours || 24
        messageData.expires_at = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
      }
      
      const { error } = await supabase
        .from('channel_messages')
        .insert(messageData)
      
      if (error) throw error
      
      setNewMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Create channel
  const createChannel = async (channelData: any) => {
    if (!currentUser) return
    
    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          ...channelData,
          creator_id: currentUser.id,
          join_code: Math.random().toString(36).substring(2, 8).toUpperCase()
        })
        .select()
        .single()
      
      if (error) throw error
      
      await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: currentUser.id,
          role: 'owner'
        })
      
      setShowCreateChannel(false)
      fetchChannels()
      setSelectedChannel(channel)
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  // Join channel
  const joinChannel = async (channelId: string) => {
    if (!currentUser) return
    
    try {
      await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: currentUser.id
        })
      
      fetchChannels()
    } catch (error) {
      console.error('Error joining channel:', error)
    }
  }

  // Add reaction to message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return
    
    const message = messages.find(m => m.id === messageId)
    const reactions = message?.reactions || {}
    const userReactions = reactions[currentUser.id] || []
    
    const updatedReactions = {
      ...reactions,
      [currentUser.id]: userReactions.includes(emoji)
        ? userReactions.filter((e: string) => e !== emoji)
        : [...userReactions, emoji]
    }
    
    await supabase
      .from('channel_messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId)
    
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, reactions: updatedReactions } : m
    ))
  }

  // Delete message (if user owns it or is admin)
  const deleteMessage = async (messageId: string) => {
    await supabase
      .from('channel_messages')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', messageId)
    
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  // Load data
  useEffect(() => {
    if (currentUser) {
      fetchChannels()
      fetchUpdates()
    }
  }, [currentUser, fetchChannels, fetchUpdates])

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages()
    }
  }, [selectedChannel, fetchMessages])

  // Auto-refresh updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'updates') {
        fetchUpdates()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [activeTab, fetchUpdates])

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Updates</h1>
            <p className="text-sm text-gray-500">Channels, messages, and activity</p>
          </div>
          <button
            onClick={() => setShowCreateChannel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            New Channel
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === 'updates'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bell className="h-4 w-4" />
            Activity Feed
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === 'channels'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Channels
            {channels.filter(c => c.unread_count).length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-orange-500 rounded-full">
                {channels.filter(c => c.unread_count).length}
              </span>
            )}
          </button>
        </div>
        
        {/* Updates Feed View */}
        {activeTab === 'updates' && (
          <div className="max-w-2xl mx-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-48" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : updates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">No updates yet</h3>
                <p className="text-sm text-gray-500">Join channels to see activity here</p>
                <button
                  onClick={() => setActiveTab('channels')}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium rounded-full"
                >
                  Browse Channels
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => {
                      if (update.channel_id) {
                        const channel = channels.find(c => c.id === update.channel_id)
                        if (channel) setSelectedChannel(channel)
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {update.user?.avatar ? (
                          <Image
                            src={update.user.avatar}
                            alt={update.user.name}
                            width={44}
                            height={44}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {update.channel_name?.[0]?.toUpperCase() || update.user?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {update.channel_name || update.user?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                          </span>
                          {update.type === 'channel_message' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              Channel
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{update.content}</p>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Channels View - WhatsApp Style */}
        {activeTab === 'channels' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Channels List */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search channels..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {channels.length === 0 ? (
                  <div className="p-8 text-center">
                    <Hash className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No channels yet</p>
                    <button
                      onClick={() => setShowCreateChannel(true)}
                      className="mt-3 text-sm text-orange-500 font-medium"
                    >
                      Create a channel
                    </button>
                  </div>
                ) : (
                  channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition text-left ${
                        selectedChannel?.id === channel.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {channel.name[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {channel.name}
                            {channel.channel_type === 'private' && (
                              <Lock className="h-3 w-3 text-gray-400 inline ml-1" />
                            )}
                            {channel.channel_type === 'announcement' && (
                              <Crown className="h-3 w-3 text-yellow-500 inline ml-1" />
                            )}
                          </h3>
                          {channel.last_message && (
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(channel.last_message.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {channel.last_message && (
                          <p className="text-xs text-gray-500 truncate">
                            {channel.last_message.user?.display_name}: {channel.last_message.content}
                          </p>
                        )}
                        {!channel.last_message && (
                          <p className="text-xs text-gray-400">No messages yet</p>
                        )}
                      </div>
                      {channel.unread_count ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{channel.unread_count}</span>
                        </div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
              {!selectedChannel ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="font-bold text-gray-900 mb-1">Select a channel</h3>
                  <p className="text-sm text-gray-500">Choose a channel to start chatting</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold">
                        {selectedChannel.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedChannel.name}</h2>
                        <p className="text-[10px] text-gray-500">
                          {selectedChannel.member_count} members · 
                          {selectedChannel.settings?.ephemeral_messages ? (
                            <span className="text-orange-500 flex items-center gap-1 inline-flex ml-1">
                              <Clock className="h-3 w-3" /> Ephemeral
                            </span>
                          ) : (
                            <span className="text-gray-500"> Standard</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition">
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message) => {
                      const isOwn = message.user_id === currentUser?.id
                      const isExpiring = message.expires_at && 
                        new Date(message.expires_at) < new Date(Date.now() + 3600000)
                      const messageReactions = Object.values(message.reactions || {})
                        .flat()
                        .filter((v, i, a) => a.indexOf(v) === i)
                      
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && (
                              <div className="flex items-center gap-2 mb-1 ml-2">
                                <span className="text-xs font-medium text-gray-700">
                                  {message.profiles?.display_name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {format(new Date(message.created_at), 'h:mm a')}
                                </span>
                                {isExpiring && (
                                  <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" /> expiring
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              } ${!isOwn ? 'rounded-tl-none' : 'rounded-tr-none'}`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              {message.media_urls?.map((url, i) => (
                                <Image
                                  key={i}
                                  src={url}
                                  alt="Media"
                                  width={200}
                                  height={200}
                                  className="rounded-lg mt-2 max-w-full"
                                />
                              ))}
                            </div>
                            
                            {/* Reactions */}
                            {messageReactions.length > 0 && (
                              <div className="flex gap-0.5 mt-1 ml-2">
                                {messageReactions.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReaction(message.id, emoji)}
                                    className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded-full hover:bg-gray-50"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input Area */}
                  <form onSubmit={sendMessage} className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={
                          selectedChannel.settings?.ephemeral_messages
                            ? `Ephemeral message (disappears in ${selectedChannel.settings.message_expiry_hours || 24}h)`
                            : "Type a message..."
                        }
                        className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-2 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full text-white disabled:opacity-50 transition"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* FAB */}
      <ThreeCurveFab />
      
      {/* Create Channel Modal */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreate={createChannel}
        />
      )}
      
      {/* Story Viewer */}
      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}
    </div>
  )
}

// Create Channel Modal Component
function CreateChannelModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [channelData, setChannelData] = useState({
    name: '',
    description: '',
    channel_type: 'public',
    settings: {
      allow_messages: true,
      allow_media: true,
      ephemeral_messages: false,
      message_expiry_hours: 24
    }
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(channelData)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create a Channel</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name
              </label>
              <input
                type="text"
                required
                value={channelData.name}
                onChange={(e) => setChannelData({ ...channelData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300"
                placeholder="e.g., Design Talks"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={channelData.description}
                onChange={(e) => setChannelData({ ...channelData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300"
                rows={3}
                placeholder="What's this channel about?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privacy
              </label>
              <select
                value={channelData.channel_type}
                onChange={(e) => setChannelData({ ...channelData, channel_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300"
              >
                <option value="public">🌍 Public - Anyone can join</option>
                <option value="private">🔒 Private - Invite only</option>
                <option value="announcement">📢 Announcement - Only admins can post</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Ephemeral Messages
                </label>
                <p className="text-[10px] text-gray-500">Messages disappear after set time</p>
              </div>
              <input
                type="checkbox"
                checked={channelData.settings.ephemeral_messages}
                onChange={(e) => setChannelData({
                  ...channelData,
                  settings: { ...channelData.settings, ephemeral_messages: e.target.checked }
                })}
                className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
              />
            </div>
            
            {channelData.settings.ephemeral_messages && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Expiry (hours)
                </label>
                <select
                  value={channelData.settings.message_expiry_hours}
                  onChange={(e) => setChannelData({
                    ...channelData,
                    settings: { ...channelData.settings, message_expiry_hours: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>3 days</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Search icon component
function Search(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
