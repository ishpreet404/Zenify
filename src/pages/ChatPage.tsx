import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import storage from '../utils/storage';
import chatService from '../utils/chat';
import { ChatMessage as ChatMessageType, Conversation } from '../types';
import { MessageCircle, Clock, PlusCircle, Trash2 } from 'lucide-react';

const ChatPage: React.FC = () => {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = React.useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load conversations
  React.useEffect(() => {
    const loadedConversations = storage.getConversations();
    setConversations(loadedConversations);

    // Create a new conversation if none exists
    if (loadedConversations.length === 0) {
      const newConversation = storage.createConversation('New Conversation');
      setConversations([newConversation]);
      setActiveConversation(newConversation);
    } else {
      // Set the most recent conversation as active
      setActiveConversation(loadedConversations[loadedConversations.length - 1]);
    }
  }, []);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSendMessage = async (message: string) => {
    if (!activeConversation) return;

    setIsLoading(true);

    try {
      const updatedConversation = await chatService.sendMessage(activeConversation.id, message);

      if (updatedConversation) {
        // Update the conversations list
        setConversations((prevConversations) =>
          prevConversations.map((convo) =>
            convo.id === updatedConversation.id ? updatedConversation : convo
          )
        );

        // Update the active conversation
        setActiveConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newConversation = storage.createConversation();
    setConversations([...conversations, newConversation]);
    setActiveConversation(newConversation);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleClearChat = () => {
    if (!activeConversation) return;

    // Clear messages in the active conversation
    const clearedConversation = { ...activeConversation, messages: [] };
    setActiveConversation(clearedConversation);

    // Update the conversations list
    setConversations((prevConversations) =>
      prevConversations.map((convo) =>
        convo.id === clearedConversation.id ? clearedConversation : convo
      )
    );

    // Persist the cleared conversation to storage
    storage.updateConversation(clearedConversation);
  };

  // Filter out system messages for display
  const getDisplayMessages = (messages: ChatMessageType[]) => {
    return messages.filter((msg) => msg.role !== 'system');
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row">
      {/* Conversations sidebar - hidden on mobile */}
      <div className="hidden md:block w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <PlusCircle size={16} />
            New Chat
          </button>
        </div>

        <div className="overflow-y-auto">
          <AnimatePresence>
            {conversations.map((convo) => (
              <motion.div
                key={convo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => handleSelectConversation(convo)}
                  className={`
                    w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${activeConversation?.id === convo.id ? 'bg-gray-100' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-gray-500" />
                    <span className="truncate font-medium">{convo.title}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{new Date(convo.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile conversation selector */}
        <div className="md:hidden p-2 bg-white border-b">
          <select
            value={activeConversation?.id}
            onChange={(e) => {
              const selectedConvo = conversations.find((c) => c.id === e.target.value);
              if (selectedConvo) handleSelectConversation(selectedConvo);
            }}
            className="w-full p-2 border rounded"
          >
            {conversations.map((convo) => (
              <option key={convo.id} value={convo.id}>
                {convo.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleNewConversation}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <PlusCircle size={16} />
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeConversation && (
            <div>
              {getDisplayMessages(activeConversation.messages).length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full py-20 text-center text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Brain size={48} className="mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">Welcome to Zenify</h2>
                  <p className="max-w-md">
                    I'm your AI mental wellness companion. You can talk to me about your thoughts,
                    feelings, or anything that's on your mind.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {getDisplayMessages(activeConversation.messages).map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t flex items-center justify-between">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          <button
            onClick={handleClearChat}
            className="ml-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <Trash2 size={16} />
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Brain icon import
import { Brain } from 'lucide-react';

export default ChatPage;