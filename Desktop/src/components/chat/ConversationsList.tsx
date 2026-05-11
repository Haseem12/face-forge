'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { timeAgo } from '@/lib/dashboard/helpers';

interface Conversation {
  id: string;
  other_user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  };
  unread_count: number;
}

export default function ConversationsList({ 
  currentUserId, 
  onSelectConversation 
}: { 
  currentUserId: string;
  onSelectConversation: (conversationId: string, otherUser: any) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('user-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const fetchConversations = async () => {
    setLoading(true);
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
              content,
              created_at,
              user_id
            )
          )
        `)
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false, foreignTable: 'conversations' });

      if (error) throw error;

      // Process and format conversations
      const formatted = await Promise.all(
        (participants || []).map(async (p) => {
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
            .single();

          const messages = p.conversations?.messages || [];
          const lastMessage = messages[0];

          return {
            id: p.conversation_id,
            other_user: otherParticipant?.profiles,
            last_message: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
            } : null,
            unread_count: messages.filter((m: any) => m.user_id !== currentUserId).length,
          };
        })
      );

      setConversations(formatted.filter(c => c.other_user));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Messages</h2>
        <p className="text-xs text-gray-500">Chat with creators</p>
      </div>

      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start a chat from someone's profile</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id, conv.other_user)}
              className="w-full p-4 flex gap-3 hover:bg-gray-50 transition text-left"
            >
              <Avatar className="h-12 w-12">
                {conv.other_user.avatar_url && <AvatarImage src={conv.other_user.avatar_url} />}
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
                  {conv.other_user.display_name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conv.other_user.display_name}
                  </h3>
                  {conv.last_message && (
                    <span className="text-[10px] text-gray-400">
                      {timeAgo(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conv.last_message?.content || 'Start a conversation'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {conv.unread_count}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
