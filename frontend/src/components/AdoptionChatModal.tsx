import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { useGetChatMessages, useSendChatMessage, useGetCallerUserProfile } from '../hooks/useQueries';
import { useAdoptionChat } from '../hooks/useSocket';
import { toast } from 'sonner';

interface AdoptionChatModalProps {
  adoptionRecordId: number;
  petName: string;
  otherUserName: string;
  otherUserEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AdoptionChatModal: React.FC<AdoptionChatModalProps> = ({
  adoptionRecordId,
  petName,
  otherUserName,
  otherUserEmail,
  isOpen,
  onClose,
}) => {
  const { data: currentUser } = useGetCallerUserProfile();
  const { joinChat, leaveChat, sendMessage, onNewMessage, onUserJoined } = useAdoptionChat(adoptionRecordId);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Load initial messages from API
  useEffect(() => {
    if (!isOpen || isInitializedRef.current) return;

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/${adoptionRecordId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          isInitializedRef.current = true;
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [isOpen, adoptionRecordId]);

  // Join chat and set up socket listeners
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    joinChat(currentUser.id);

    // Listen for new messages
    onNewMessage((message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for user joined
    onUserJoined(() => {
      console.log('Other user is now online');
    });

    return () => {
      leaveChat();
    };
  }, [isOpen, currentUser, joinChat, leaveChat, onNewMessage, onUserJoined]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (messageText.trim().length === 0) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    setIsSending(true);

    try {
      sendMessage(currentUser.id, messageText);
      setMessageText('');
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl flex flex-col h-[90vh] w-[90vw] max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageCircle size={24} />
            <div>
              <h2 className="font-bold text-lg">Chat - {petName}</h2>
              <p className="text-sm text-blue-100">with {otherUserName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-2 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.senderId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-300 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="break-words">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrentUser ? 'text-blue-100' : 'text-gray-600'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t p-4 bg-white rounded-b-lg">
          <div className="flex gap-2">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={isSending || messageText.trim().length === 0}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white p-3 rounded-lg transition flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
