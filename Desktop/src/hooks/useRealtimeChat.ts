'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface TypingUser {
  user_id: string;
  display_name: string;
}

export function useRealtimeChat(conversationId: string, currentUserId: string) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load historical messages with profiles
  const loadMessages = useCallback(async () => {
    setLoading(true);
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
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, supabase]);

  // Setup realtime subscription
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    loadMessages();

    const channel = supabase.channel(`conversation:${conversationId}`, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // Handle new messages via Broadcast
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      const newMessage = payload as Message;
      setMessages((prev) => [...prev, newMessage]);
    });

    // Handle typing indicators
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { user_id, display_name, is_typing } = payload;
      setTypingUsers((prev) => {
        if (!is_typing) {
          return prev.filter((u) => u.user_id !== user_id);
        }
        if (!prev.find((u) => u.user_id === user_id)) {
          return [...prev, { user_id, display_name }];
        }
        return prev;
      });
    });

    // Handle presence (online users)
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const online = Object.keys(presenceState);
      setOnlineUsers(online);
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase, loadMessages]);

  // Send message via Broadcast
  const sendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      user_id: currentUserId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', currentUserId)
        .single();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: currentUserId,
          content: content.trim(),
        })
        .select(`
          *,
          profiles!user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Broadcast to other clients
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'message',
        payload: data,
      });

      // Replace optimistic message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, is_typing: isTyping },
    });
  }, [currentUserId]);

  const startTyping = useCallback(() => {
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1500);
  }, [sendTyping]);

  return {
    messages,
    loading,
    sendMessage,
    typingUsers,
    onlineUsers,
    startTyping,
  };
}
