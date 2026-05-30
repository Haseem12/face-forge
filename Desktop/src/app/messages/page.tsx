// app/messages/page.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/dashboard/helpers'
import {
  Loader2, MessageCircle, Search, ArrowLeft,
  Users, Send, Check, X, MoreVertical,
  Phone, Video, Info, Smile, Paperclip, Mic,
  CheckCheck, Clock, Reply, Plus, Camera,
  Music, File, Edit2, Image as ImageIcon,
  Download, Trash2, ExternalLink, Crown,
  Shield, UserMinus, Pencil, CameraIcon,
  Megaphone, Volume2, VolumeX, Play, Pause,
  FolderPlus, ArrowRight
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
  cover_url: string | null
  created_by: string
  is_private: boolean
  invite_code: string
  member_count: number
  created_at: string
}

interface GroupMember {
  user_id: string
  role: 'admin' | 'member'
  profiles: Profile
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
  const [loading, setLoading] = useState(true)
  const [loadingAllies, setLoadingAllies] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string } | null>(null)
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // New group state
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Group settings state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [groupDescription, setGroupDescription] = useState('')
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false)
  const [uploadingGroupCover, setUploadingGroupCover] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const groupAvatarInputRef = useRef<HTMLInputElement>(null)
  const groupCoverInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sentMessageIds = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm })
  }

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
    }
  }, [currentUserId])

  // Real-time subscription
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
      if (selectedChat.type === 'group') {
        checkAdminStatus(selectedChat.id)
        fetchGroupMembers(selectedChat.id)
      }
    }
  }, [selectedChat])

  const fetchChats = async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const directChats: ChatItem[] = []

      if (participants?.length) {
        for (const p of participants) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
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
                const { data: messages } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('conversation_id', conv.id)
                  .order('created_at', { ascending: false })
                  .limit(1)

                const lastMessage = messages?.[0] || null

                const { count: unreadCount } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('conversation_id', conv.id)
                  .neq('user_id', currentUserId)
                  .is('is_read', false)

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
                  unread_count: unreadCount || 0,
                  updated_at: conv.updated_at || conv.created_at
                })
              }
            }
          }
        }
      }

      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', currentUserId)

      const groupChats: ChatItem[] = (groupMemberships || []).map((gm: any) => ({
        id: gm.group_id,
        type: 'group',
        name: gm.groups?.name || 'Unknown Group',
        avatar_url: gm.groups?.avatar_url,
        group: gm.groups,
        last_message: null,
        unread_count: 0,
        updated_at: gm.groups?.updated_at || new Date().toISOString()
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

  const checkAdminStatus = async (groupId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single()
    setIsCurrentUserAdmin(data?.role === 'admin')
  }

  const fetchGroupMembers = async (groupId: string) => {
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('group_id', groupId)

    if (membersError) {
      console.error('Failed to fetch group members:', membersError)
      return
    }

    if (!members || members.length === 0) {
      setGroupMembers([])
      const { data: groupData } = await supabase
        .from('groups')
        .select('description')
        .eq('id', groupId)
        .single()
      setGroupDescription(groupData?.description || '')
      return
    }

    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds)

    const combinedMembers: GroupMember[] = members.map(member => ({
      user_id: member.user_id,
      role: member.role,
      profiles: profiles?.find(p => p.id === member.user_id) || {
        id: member.user_id,
        display_name: 'Unknown',
        username: 'unknown',
        avatar_url: null
      }
    }))

    setGroupMembers(combinedMembers)

    const { data: groupData } = await supabase
      .from('groups')
      .select('description')
      .eq('id', groupId)
      .single()
    setGroupDescription(groupData?.description || '')
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
    if (!currentUserId || !newGroupName.trim() || newGroupMembers.length === 0) return

    setCreatingGroup(true)
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: currentUserId,
          invite_code: inviteCode,
          member_count: newGroupMembers.length + 1
        })
        .select()
        .single()

      if (groupError) throw groupError

      const members = [...newGroupMembers, currentUserId].map(userId => ({
        group_id: group.id,
        user_id: userId,
        role: userId === currentUserId ? 'admin' : 'member'
      }))

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(members)

      if (membersError) throw membersError

      setShowNewGroupModal(false)
      setNewGroupName('')
      setNewGroupMembers([])
      await fetchChats()
      showToast('Group created successfully!', 'success')
    } catch (error) {
      console.error('Failed to create group:', error)
      showToast('Failed to create group', 'error')
    } finally {
      setCreatingGroup(false)
    }
  }

  const updateGroupAvatar = async (file: File) => {
    if (!selectedChat?.id) return
    setUploadingGroupAvatar(true)
    try {
      const fileName = `group-avatars/${selectedChat.id}/${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('chat_media').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName)

      await supabase.from('groups').update({ avatar_url: publicUrl }).eq('id', selectedChat.id)
      fetchChats()
      setSelectedChat(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      showToast('Group avatar updated!', 'success')
    } catch (error) {
      console.error('Failed to update avatar:', error)
      showToast('Failed to update avatar', 'error')
    } finally {
      setUploadingGroupAvatar(false)
    }
  }

  const updateGroupCover = async (file: File) => {
    if (!selectedChat?.id) return
    setUploadingGroupCover(true)
    try {
      const fileName = `group-covers/${selectedChat.id}/${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('chat_media').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName)

      await supabase.from('groups').update({ cover_url: publicUrl }).eq('id', selectedChat.id)
      fetchChats()
      showToast('Group cover updated!', 'success')
    } catch (error) {
      console.error('Failed to update cover:', error)
      showToast('Failed to update cover', 'error')
    } finally {
      setUploadingGroupCover(false)
    }
  }

  const updateGroupDescription = async () => {
    if (!selectedChat?.id) return
    try {
      await supabase.from('groups').update({ description: groupDescription }).eq('id', selectedChat.id)
      showToast('Group description updated!', 'success')
    } catch (error) {
      console.error('Failed to update description:', error)
      showToast('Failed to update description', 'error')
    }
  }

  const removeMember = async (userId: string) => {
    if (!selectedChat?.id || !isCurrentUserAdmin) return
    showConfirm('Remove this member from the group?', async () => {
      try {
        await supabase.from('group_members').delete().eq('group_id', selectedChat.id).eq('user_id', userId)
        fetchGroupMembers(selectedChat.id)
        fetchChats()
        showToast('Member removed', 'success')
      } catch (error) {
        console.error('Failed to remove member:', error)
        showToast('Failed to remove member', 'error')
      }
    })
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
        types.push(
          file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' :
          file.type.startsWith('audio/') ? 'audio' : 'file'
        )
      }
    }

    return { urls, types }
  }

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      window.open(url, '_blank')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType })
        const fileName = `voice_${Date.now()}.webm`
        const audioFile = new File([audioBlob], fileName, { type: mimeType })

        if (selectedChat) {
          const { urls } = await uploadMedia([audioFile])
          if (urls[0]) {
            await sendMediaMessage(urls[0], 'audio')
          }
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
      showToast('Microphone access denied', 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) {
      setSelectedMedia(prev => [...prev, ...files])
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
      showToast('Failed to send media', 'error')
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
      showToast('Failed to send message', 'error')
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
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden fixed inset-0">
      {/* ── CHAT LIST ── */}
      <div className={`flex flex-col bg-white h-full ${selectedChat ? 'hidden md:flex md:w-[380px] md:flex-shrink-0 md:border-r md:border-gray-200' : 'flex flex-1'}`}>
        {/* Header */}
        <div className="px-4 pt-14 pb-2 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-900" />
              </button>
              <span className="text-gray-900 text-xl font-bold tracking-tight">
                {currentUserProfile?.username || 'Messages'}
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-300 transition"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center pt-16">
              <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold mb-1">No messages yet</p>
              <p className="text-sm text-gray-500">Start a conversation with someone</p>
            </div>
          ) : (
            <div className="pt-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors active:bg-gray-50 ${
                    selectedChat?.id === chat.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className={`relative flex-shrink-0 ${chat.unread_count > 0 ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white rounded-full' : ''}`}>
                    <Avatar className="h-14 w-14">
                      {chat.avatar_url && <AvatarImage src={chat.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-lg font-bold">
                        {chat.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {chat.type === 'group' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${chat.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                        {chat.name}
                      </span>
                      {chat.last_message && (
                        <span className={`text-[11px] flex-shrink-0 ${chat.unread_count > 0 ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>
                          {timeAgo(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-sm truncate flex items-center gap-1 ${chat.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {chat.last_message?.user_id === currentUserId && (
                          <CheckCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        )}
                        {chat.last_message?.content || 'No messages yet'}
                      </p>
                      {chat.unread_count > 0 && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {chat.unread_count > 9 ? '9+' : chat.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT VIEW ── */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedChat ? 'hidden md:flex' : 'flex absolute md:relative inset-0 z-20 md:z-auto'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-3 pt-12 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors mr-1"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-900" />
                </button>

                <Link href={selectedChat.type === 'direct' ? `/profile/${selectedChat.other_user?.username}` : '#'} className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    {selectedChat.avatar_url && <AvatarImage src={selectedChat.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-sm font-bold">
                      {selectedChat.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                      {selectedChat.name}
                      {selectedChat.type === 'group' && (
                        <span className="text-xs text-gray-400 font-normal ml-1">
                          · {selectedChat.group?.member_count || 0} members
                        </span>
                      )}
                    </p>
                    {selectedChat.type === 'direct' && selectedChat.other_user && (
                      <p className="text-[11px] text-gray-400 truncate">@{selectedChat.other_user.username}</p>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors">
                    <Phone className="h-[18px] w-[18px] text-gray-900" />
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors">
                    <Video className="h-[18px] w-[18px] text-gray-900" />
                  </button>
                  {selectedChat.type === 'group' && isCurrentUserAdmin && (
                    <button
                      onClick={() => setShowGroupSettingsModal(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="h-[18px] w-[18px] text-gray-900" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #fff 100%)' }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center pb-10">
                  <Avatar className="h-20 w-20 mb-4">
                    {selectedChat.avatar_url && <AvatarImage src={selectedChat.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-2xl font-bold">
                      {selectedChat.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-gray-900 font-bold text-lg">{selectedChat.name}</p>
                  {selectedChat.type === 'direct' && selectedChat.other_user && (
                    <p className="text-gray-500 text-sm mt-1">@{selectedChat.other_user.username}</p>
                  )}
                  <p className="text-gray-400 text-sm mt-4">Say hello 👋</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.user_id === currentUserId
                  const prevMsg = messages[index - 1]
                  const nextMsg = messages[index + 1]
                  const isFirst = !prevMsg || prevMsg.user_id !== message.user_id
                  const isLast = !nextMsg || nextMsg.user_id !== message.user_id

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${nextMsg?.user_id === message.user_id ? 'mb-0.5' : 'mb-1'}`}
                    >
                      {!isOwn && (
                        <div className="w-7 flex-shrink-0 mb-1">
                          {isLast ? (
                            <Avatar className="h-7 w-7">
                              {message.profiles?.avatar_url && <AvatarImage src={message.profiles.avatar_url} />}
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-[10px] font-bold">
                                {message.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                        </div>
                      )}

                      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwn && isFirst && selectedChat.type === 'group' && (
                          <span className="text-[11px] text-gray-400 font-medium mb-1 ml-3">
                            {message.profiles?.display_name}
                          </span>
                        )}

                        {message.reply_to && (
                          <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 border-blue-500 max-w-full ${isOwn ? 'bg-blue-50 text-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                            <span className="font-medium text-blue-500">
                              {message.reply_to.profiles?.display_name}
                            </span>
                            <p className="truncate mt-0.5">{message.reply_to.content.substring(0, 60)}</p>
                          </div>
                        )}

                        <div
                          className={`relative px-3 py-2 ${
                            isOwn
                              ? `bg-blue-500 text-white ${
                                  isFirst && isLast ? 'rounded-2xl rounded-br-md'
                                  : isFirst ? 'rounded-2xl rounded-br-md rounded-br-sm'
                                  : isLast ? 'rounded-2xl rounded-tr-sm rounded-br-md'
                                  : 'rounded-2xl rounded-r-sm'
                                }`
                              : `bg-gray-100 text-gray-900 ${
                                  isFirst && isLast ? 'rounded-2xl rounded-bl-md'
                                  : isFirst ? 'rounded-2xl rounded-bl-md rounded-bl-sm'
                                  : isLast ? 'rounded-2xl rounded-tl-sm rounded-bl-md'
                                  : 'rounded-2xl rounded-l-sm'
                                }`
                          }`}
                        >
                          {message.media_urls?.map((url, i) => (
                            <div key={i} className="mb-1 relative group">
                              {message.media_types[i] === 'image' ? (
                                <button
                                  onClick={() => setMediaViewer({ url, type: 'image' })}
                                  className="block"
                                >
                                  <Image
                                    src={url} alt="Image"
                                    width={220} height={220}
                                    className="rounded-xl max-w-full object-cover cursor-pointer"
                                    unoptimized
                                  />
                                </button>
                              ) : message.media_types[i] === 'video' ? (
                                <div className="relative">
                                  <video
                                    src={url}
                                    className="rounded-xl max-w-full max-h-56 cursor-pointer"
                                    onClick={() => setMediaViewer({ url, type: 'video' })}
                                  />
                                  <button
                                    onClick={() => setMediaViewer({ url, type: 'video' })}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl"
                                  >
                                    <Play className="h-10 w-10 text-white fill-white" />
                                  </button>
                                </div>
                              ) : message.media_types[i] === 'audio' ? (
                                <div className="flex items-center gap-3 bg-gray-200/80 rounded-xl px-3 py-2 min-w-[200px]">
                                  <button
                                    onClick={() => {
                                      if (audioPlaying === url) {
                                        audioRef.current?.pause()
                                        setAudioPlaying(null)
                                      } else {
                                        if (audioRef.current) {
                                          audioRef.current.pause()
                                        }
                                        const audio = new Audio(url)
                                        audioRef.current = audio
                                        audio.play()
                                        setAudioPlaying(url)
                                        audio.onended = () => setAudioPlaying(null)
                                      }
                                    }}
                                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm"
                                  >
                                    {audioPlaying === url ? (
                                      <Pause className="h-4 w-4 text-gray-900" />
                                    ) : (
                                      <Play className="h-4 w-4 text-gray-900 ml-0.5" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="h-1 bg-gray-300 rounded-full">
                                      <div
                                        className={`h-full bg-blue-500 rounded-full ${audioPlaying === url ? 'animate-pulse' : ''}`}
                                        style={{ width: audioPlaying === url ? '100%' : '0%' }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-0.5">Voice message</span>
                                  </div>
                                </div>
                              ) : (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 text-sm">
                                  <File className="h-4 w-4 flex-shrink-0" />
                                  <span className="underline truncate">View file</span>
                                </a>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadMedia(url, `media_${Date.now()}`)
                                }}
                                className="absolute top-1 right-1 w-7 h-7 bg-gray-100/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Download className="h-3.5 w-3.5 text-gray-700" />
                              </button>
                            </div>
                          ))}

                          {message.content && (
                            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}

                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isOwn ? 'text-blue-100/70' : 'text-gray-400'}`}>
                              {timeAgo(message.created_at)}
                            </span>
                            {isOwn && (
                              message.is_read
                                ? <CheckCheck className="h-3 w-3 text-blue-100/70" />
                                : <Clock className="h-3 w-3 text-blue-100/40" />
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setReplyingTo(message)}
                          className="opacity-0 hover:opacity-100 mt-0.5 px-2 py-0.5 rounded-full text-[10px] text-gray-400 active:bg-gray-100 transition-all flex items-center gap-1"
                        >
                          <Reply className="h-3 w-3" /> Reply
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Recording indicator */}
            {recording && (
              <div className="flex-shrink-0 bg-red-500/90 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">Recording {formatDuration(recordingTime)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3.5 py-1.5 bg-white text-red-500 rounded-full text-xs font-bold active:bg-red-50"
                >
                  Stop & Send
                </button>
              </div>
            )}

            {/* Reply preview bar */}
            {replyingTo && (
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center gap-3">
                <div className="w-0.5 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-blue-500 font-medium">
                    {replyingTo.profiles?.display_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{replyingTo.content.substring(0, 60)}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 active:bg-gray-300 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Media preview */}
            {selectedMedia.length > 0 && (
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedMedia.map((file, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {file.type.startsWith('image/') ? (
                        <Image src={URL.createObjectURL(file)} alt="Preview" fill className="object-cover" />
                      ) : file.type.startsWith('video/') ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Video className="h-5 w-5 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <File className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedMedia(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-gray-100/80 rounded-full flex items-center justify-center"
                      >
                        <X className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-3 py-2 pb-safe">
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-0.5 pb-1 flex-shrink-0">
                  <button className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors">
                    <Smile className="h-[22px] w-[22px] text-gray-400" />
                  </button>
                  <button
                    onClick={handleFileSelect}
                    className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
                  >
                    <Paperclip className="h-[22px] w-[22px] text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2.5 min-h-[42px] flex items-end">
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Message..."
                    className="w-full resize-none bg-transparent text-gray-900 placeholder-gray-400 text-[15px] leading-relaxed focus:outline-none max-h-[120px]"
                    rows={1}
                  />
                </div>

                <div className="pb-1 flex-shrink-0">
                  {messageInput.trim() || selectedMedia.length > 0 ? (
                    <button
                      onClick={sendMessage}
                      disabled={sending}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 active:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {sending
                        ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                        : <Send className="h-4 w-4 text-white" />
                      }
                    </button>
                  ) : (
                    <button
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${recording ? 'bg-red-500' : 'active:bg-gray-100'}`}
                    >
                      <Mic className={`h-[22px] w-[22px] ${recording ? 'text-white' : 'text-gray-400'}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-gray-900 text-xl font-bold mb-2">Your Messages</h3>
            <p className="text-gray-500 text-sm max-w-xs">Send private messages to a friend or group</p>
          </div>
        )}
      </div>

      {/* Floating Action Buttons - Mobile */}
      {!selectedChat && (
        <div className="fixed bottom-24 right-4 z-30 flex flex-col gap-3 md:hidden">
          <button
            onClick={() => setShowNewGroupModal(true)}
            className="w-14 h-14 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center active:bg-gray-50 transition-all"
          >
            <FolderPlus className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-14 h-14 rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center active:bg-blue-600 transition-all"
          >
            <Plus className="h-7 w-7 text-white" />
          </button>
        </div>
      )}

      {/* Floating Action Buttons - Desktop */}
      {!selectedChat && (
        <div className="hidden md:flex fixed bottom-8 right-8 z-30 flex-col gap-3">
          <button
            onClick={() => setShowNewGroupModal(true)}
            className="w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all"
          >
            <FolderPlus className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-12 h-12 rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center hover:bg-blue-600 transition-all"
          >
            <Plus className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* ── NEW CHAT MODAL ── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="px-4 pt-14 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-900" />
              </button>
              <span className="text-gray-900 text-lg font-bold">New Message</span>
              <div className="w-8" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {loadingAllies ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredAllies.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No contacts found</p>
            ) : (
              <div className="space-y-0.5 py-2">
                {filteredAllies.map((ally) => {
                  const existingConv = chats.find(c => c.type === 'direct' && c.other_user?.id === ally.id)
                  return (
                    <button
                      key={ally.id}
                      onClick={() => {
                        if (existingConv) {
                          setSelectedChat(existingConv)
                          setShowNewChatModal(false)
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
                            setShowNewChatModal(false)
                          })
                        }
                      }}
                      className="w-full flex items-center gap-3 px-2 py-3 rounded-xl active:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-sm font-bold">
                          {ally.display_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{ally.display_name}</p>
                        <p className="text-xs text-gray-500 truncate">@{ally.username}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW GROUP MODAL ── */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="px-4 pt-14 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => { setShowNewGroupModal(false); setNewGroupName(''); setNewGroupMembers([]) }}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-900" />
              </button>
              <span className="text-gray-900 text-lg font-bold">New Group</span>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || newGroupMembers.length === 0 || creatingGroup}
                className="text-blue-500 font-semibold text-sm disabled:opacity-40 active:text-blue-400"
              >
                {creatingGroup ? 'Creating...' : 'Create'}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Camera className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 text-lg placeholder-gray-400 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search people to add"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none"
              />
            </div>
            {newGroupMembers.length > 0 && (
              <p className="text-xs text-blue-500 px-1">{newGroupMembers.length} member{newGroupMembers.length > 1 ? 's' : ''} selected</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {loadingAllies ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredAllies.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No contacts found</p>
            ) : (
              <div className="space-y-0.5 py-2">
                {filteredAllies.map((ally) => (
                  <button
                    key={ally.id}
                    onClick={() => {
                      if (newGroupMembers.includes(ally.id)) {
                        setNewGroupMembers(prev => prev.filter(id => id !== ally.id))
                      } else {
                        setNewGroupMembers(prev => [...prev, ally.id])
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-colors ${
                      newGroupMembers.includes(ally.id) ? 'bg-blue-50' : 'active:bg-gray-50'
                    }`}
                  >
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      {ally.avatar_url && <AvatarImage src={ally.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-sm font-bold">
                        {ally.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ally.display_name}</p>
                      <p className="text-xs text-gray-500 truncate">@{ally.username}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      newGroupMembers.includes(ally.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {newGroupMembers.includes(ally.id) && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUP SETTINGS MODAL ── */}
      {showGroupSettingsModal && selectedChat?.type === 'group' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="px-4 pt-14 pb-2 flex-shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowGroupSettingsModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-900" />
              </button>
              <span className="text-gray-900 text-lg font-bold">Group Settings</span>
              <div className="w-8" />
            </div>

            {/* Cover Photo */}
            <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden mb-4 group">
              {selectedChat.group?.cover_url ? (
                <Image src={selectedChat.group.cover_url} alt="Cover" fill className="object-cover" />
              ) : null}
              <button
                onClick={() => groupCoverInputRef.current?.click()}
                className="absolute inset-0 bg-gray-100/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <CameraIcon className="h-6 w-6 text-gray-700" />
                <span className="text-gray-700 text-sm ml-2">Change Cover</span>
              </button>
              {uploadingGroupCover && (
                <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="relative -mt-12 ml-4 mb-4">
              <div className="relative w-20 h-20 rounded-full border-4 border-white overflow-hidden group">
                <Avatar className="w-full h-full">
                  {selectedChat.avatar_url && <AvatarImage src={selectedChat.avatar_url} />}
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-xl font-bold">
                    {selectedChat.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="absolute inset-0 bg-gray-100/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <CameraIcon className="h-5 w-5 text-gray-700" />
                </button>
                {uploadingGroupAvatar && (
                  <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Group Name */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Group Name</p>
              <p className="text-gray-900 font-semibold text-lg">{selectedChat.name}</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">About</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="flex-1 bg-gray-100 text-gray-900 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
                <button
                  onClick={updateGroupDescription}
                  className="px-3 py-2 bg-blue-500 text-white text-sm rounded-xl active:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="pb-8">
              <p className="text-sm text-gray-400 mb-2">Members ({groupMembers.length})</p>
              <div className="space-y-1">
                {groupMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      {member.profiles?.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white text-xs font-bold">
                        {member.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-900 truncate">{member.profiles?.display_name}</p>
                        {member.role === 'admin' && (
                          <Crown className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">@{member.profiles?.username}</p>
                    </div>
                    {isCurrentUserAdmin && member.user_id !== currentUserId && (
                      <button
                        onClick={() => removeMember(member.user_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
                      >
                        <UserMinus className="h-4 w-4 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <input
            ref={groupAvatarInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) updateGroupAvatar(file)
              e.target.value = ''
            }}
            className="hidden"
          />
          <input
            ref={groupCoverInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) updateGroupCover(file)
              e.target.value = ''
            }}
            className="hidden"
          />
        </div>
      )}

      {/* ── MEDIA VIEWER MODAL ── */}
      {mediaViewer && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          <button
            onClick={() => setMediaViewer(null)}
            className="absolute top-6 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => downloadMedia(mediaViewer.url, `media_${Date.now()}`)}
            className="absolute top-6 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center z-10"
          >
            <Download className="h-5 w-5 text-white" />
          </button>
          {mediaViewer.type === 'image' ? (
            <Image
              src={mediaViewer.url}
              alt="Media viewer"
              fill
              className="object-contain"
              unoptimized
            />
          ) : mediaViewer.type === 'video' ? (
            <video
              src={mediaViewer.url}
              controls
              className="max-w-full max-h-full"
              autoPlay
            />
          ) : null}
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-2 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'success' ? 'bg-green-500 text-white' :
            'bg-gray-800 text-white'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-900 text-sm font-medium text-center mb-4">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm()
                  setConfirmDialog(null)
                }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-full text-sm font-semibold active:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
