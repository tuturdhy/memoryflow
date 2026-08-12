import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiMessageCircle, FiSend, FiMenu, FiPlus, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  memoriesRetrieved?: number;
  memoriesCreated?: string[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string>('New Conversation');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNotification, setShowNotification] = useState<{
    type: 'memory_saved' | 'memory_retrieved';
    count: number;
  } | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load conversations on mount
  useEffect(() => {
    if (session?.user?.id) {
      loadConversations();
    }
  }, [session?.user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    if (!session?.user?.id) return;

    const initConversation = async () => {
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          console.error('Failed to create conversation');
          return;
        }

        const data = await response.json();
        const newConvId = data.conversation?.id || '';
        setConversationId(newConvId);
        setCurrentConversationTitle('New Conversation');
        setMessages([]);

        // Reload conversations list
        loadConversations();
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };

    initConversation();
  }, [session?.user?.id]);

  // Load conversations from API
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('Failed to load conversations');
        return;
      }

      const data = await response.json();
      console.log('📦 Loaded conversations from API:', data.conversations);
      
      // Keep titles exactly as they are in the database
      const validConversations = (data.conversations || []).map((conv: any) => ({
        id: conv.id,
        title: conv.title || 'New Conversation',
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      }));

      console.log('✅ Valid conversations:', validConversations);
      setConversations(validConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Load a specific conversation
  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('Failed to load conversation');
        return;
      }

      const data = await response.json();
      setConversationId(convId);
      setCurrentConversationTitle(data.conversation?.title || 'New Conversation');

      // Convert DB messages to Message format
      const formattedMessages = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
      setInput('');
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !session?.user?.id) return;

    const messageContent = input;
    const isFirstMessage = messages.length === 0;
    const shouldUpdateTitle = isFirstMessage && currentConversationTitle === 'New Conversation';

    console.log('=== SEND MESSAGE DEBUG ===');
    console.log('messageContent:', messageContent);
    console.log('isFirstMessage:', isFirstMessage);
    console.log('currentConversationTitle:', currentConversationTitle);
    console.log('shouldUpdateTitle:', shouldUpdateTitle);
    console.log('conversationId:', conversationId);

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationId: conversationId || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        memoriesRetrieved: data.memoriesRetrieved?.length || 0,
        memoriesCreated: data.memoriesCreated || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 🔧 Update conversation title on first message
      if (shouldUpdateTitle) {
        console.log('🔧 UPDATING TITLE FOR FIRST MESSAGE...');

        const messagePreview = messageContent
          .substring(0, 60)
          .split('\n')[0]
          .trim();

        console.log('messagePreview:', messagePreview);

        if (messagePreview.length > 0) {
          const newTitle = messagePreview.length > 57 ? messagePreview + '...' : messagePreview;

          console.log('newTitle:', newTitle);
          console.log('conversationId:', conversationId);

          try {
            const updateResponse = await fetch('/api/conversations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId,
                title: newTitle,
              }),
            });

            console.log('updateResponse.status:', updateResponse.status);

            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              console.log('✅ Title updated in database:', updateData);

              // Update local state immediately
              setCurrentConversationTitle(newTitle);

              // Reload conversations after a short delay to ensure DB is updated
              setTimeout(async () => {
                console.log('📍 Reloading conversations list...');
                await loadConversations();
                console.log('✅ Conversations list reloaded');
              }, 200);
            } else {
              const errorData = await updateResponse.json();
              console.error('❌ Failed to update title:', errorData);
            }
          } catch (error) {
            console.error('❌ Error updating title:', error);
          }
        }
      }

      // Show notifications
      if (data.memoriesCreated?.length > 0) {
        setShowNotification({
          type: 'memory_saved',
          count: data.memoriesCreated.length,
        });
        setTimeout(() => setShowNotification(null), 3000);
      }

      if (data.memoriesRetrieved?.length > 0) {
        setShowNotification({
          type: 'memory_retrieved',
          count: data.memoriesRetrieved.length,
        });
        setTimeout(() => setShowNotification(null), 3000);
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_e`,
        role: 'assistant',
        content: 'Sorry, an error occurred while processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Start new chat
  const startNewChat = async () => {
    setMessages([]);
    setInput('');
    setCurrentConversationTitle('New Conversation');

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation?.id || '');
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      });

      if (response.ok) {
        loadConversations();
        if (convId === conversationId) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin">
            <FiMessageCircle size={48} className="text-blue-600" />
          </div>
          <p className="mt-4 text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            You must sign in first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FiMessageCircle className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoryFlow
            </span>
          </Link>
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold"
          >
            <FiPlus size={20} />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-sm text-gray-600 text-center py-8">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                whileHover={{ x: 4 }}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between group ${
                  conversationId === conv.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-sm truncate flex-1 font-medium">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-red-600"
                >
                  <FiTrash2 size={16} />
                </button>
              </motion.button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition text-center font-semibold text-gray-700"
          >
            Memory Dashboard
          </Link>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 font-semibold transition"
          >
            <FiLogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MemoryFlow Chat</h1>
            <p className="text-sm text-gray-600 mt-1">{currentConversationTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-semibold">{session.user?.name}</span>
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <FiMenu size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiMessageCircle size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">
                  Welcome to MemoryFlow
                </h2>
                <p className="text-gray-600 max-w-sm text-lg">
                  Start a conversation. I'll remember your preferences, goals, and context across sessions using persistent memory.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm md:text-base">{message.content}</p>

                {message.role === 'assistant' &&
                  message.memoriesRetrieved &&
                  message.memoriesRetrieved > 0 && (
                    <p className="text-xs mt-2 opacity-70">
                      📚 Retrieved {message.memoriesRetrieved} relevant memories
                    </p>
                  )}

                {message.role === 'assistant' &&
                  message.memoriesCreated &&
                  message.memoriesCreated.length > 0 && (
                    <p className="text-xs mt-2 opacity-70">
                      💾 Saved {message.memoriesCreated.length} new memories
                    </p>
                  )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Tell me about yourself or ask a question..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
            >
              <FiSend size={20} />
            </button>
          </div>
        </div>

        {/* Notification */}
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold"
          >
            {showNotification.type === 'memory_saved' ? '💾' : '📚'}{' '}
            {showNotification.count}{' '}
            {showNotification.type === 'memory_saved'
              ? 'memories saved'
              : 'memories retrieved'}
          </motion.div>
        )}
      </div>
    </div>
  );
}