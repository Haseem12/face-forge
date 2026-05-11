'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, CheckCheck } from 'lucide-react';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { timeAgo } from '@/lib/dashboard/helpers';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  onClose?: () => void;
}

export default function ChatWindow({ 
  conversationId, 
  currentUserId, 
  otherUser, 
  onClose 
}: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { 
    messages, 
    loading, 
    sendMessage, 
    typingUsers, 
    onlineUsers, 
    startTyping 
  } = useRealtimeChat(conversationId, currentUserId);

  const isOtherUserOnline = otherUser ? onlineUsers.includes(otherUser.id) : false;
  const isTyping = typingUsers.some(u => u.user_id !== currentUserId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    setIsSending(true);
    await sendMessage(inputMessage);
    setInputMessage('');
    setIsSending(false);
    
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white">
              {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-gray-900">{otherUser?.display_name || 'Chat'}</h3>
            <p className="text-xs flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              {isOtherUserOnline ? 'Online' : 'Offline'}
              {isTyping && (
                <span className="text-orange-500 animate-pulse ml-2">typing...</span>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user_id === currentUserId;
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
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 p-3 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={startTyping}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isSending}
            className="px-4 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
