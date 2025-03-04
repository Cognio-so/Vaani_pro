import { useState, useEffect, useRef } from "react"
import MessageInput from "./MessageInput"
import { motion, AnimatePresence } from "framer-motion"
import { FiUser } from "react-icons/fi"
import { BsChatLeftText } from "react-icons/bs"
import { HiSparkles } from "react-icons/hi"
import { speakWithDeepgram, stopSpeaking } from '../utils/textToSpeech'
import { sendEmailWithPDF } from '../utils/emailService'
import { useAuth } from '../context/AuthContext'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FaRegCopy } from "react-icons/fa"
import { LuCopyCheck } from "react-icons/lu"

function ChatContainer({ activeChat, onUpdateChatTitle, isOpen, onChatSaved, onUpdateMessages }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [streamingText, setStreamingText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const saveInProgress = useRef(false)
  const pendingMessages = useRef([])
  const chatIdRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState({})

  // Initialize messages when activeChat changes
  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages || [])
      setIsFirstMessage(!activeChat.messages?.length)
      chatIdRef.current = activeChat.id
    }
  }, [activeChat?.id]) // Only depend on chat ID change

  // Load messages when component mounts and when activeChat changes
  useEffect(() => {
    const loadChat = async () => {
      if (!activeChat?.id) return;
      
      setIsLoadingChat(true);
      
      // For temporary chats, just initialize with empty messages
      if (activeChat.id.startsWith('temp_')) {
        setMessages([]);
        setIsFirstMessage(true);
        setIsLoadingChat(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/chats/${activeChat.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.chat?.messages) {
          const formattedMessages = data.chat.messages.map(msg => ({
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp || new Date().toISOString()
          }));
          
          setMessages(formattedMessages);
          setIsFirstMessage(formattedMessages.length === 0);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        // Only show error for non-temporary chats
        if (!activeChat.id.startsWith('temp_')) {
          setMessages(prev => [...prev, {
            content: `Error loading chat: ${error.message}`,
            role: "system",
            timestamp: new Date().toISOString()
          }]);
        }
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [activeChat?.id]);

  // Add this useEffect to sync messages with activeChat
  useEffect(() => {
    if (activeChat?.messages) {
      setMessages(activeChat.messages);
      setIsFirstMessage(activeChat.messages.length === 0);
    } else {
      setMessages([]);
      setIsFirstMessage(true);
    }
  }, [activeChat]);

  const saveMessages = async (messagesToSave) => {
    if (!chatIdRef.current || saveInProgress.current) return;
    
    saveInProgress.current = true;

    try {
      console.log('Saving chat:', {
        chatId: chatIdRef.current,
        messageCount: messagesToSave.length
      });

      const token = localStorage.getItem('token');
      const isTemporaryChat = chatIdRef.current.startsWith('temp_');
      
      const endpoint = isTemporaryChat 
        ? 'http://localhost:5000/api/chats/save'
        : `http://localhost:5000/api/chats/${chatIdRef.current}/update`;
      
      const method = isTemporaryChat ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatIdRef.current,
          title: activeChat.title || messagesToSave[0]?.content?.slice(0, 30) || 'New Chat',
          messages: messagesToSave
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save chat');
      }

      if (data.success) {
        // Update chatId if this was a temporary chat
        if (isTemporaryChat && data.chat?.id) {
          chatIdRef.current = data.chat.id;
        }

        onUpdateMessages(messagesToSave);
        
        if (data.chat.title !== activeChat.title) {
          onUpdateChatTitle(data.chat.title);
        }
        
        if (onChatSaved) {
          onChatSaved();
        }
      }

    } catch (error) {
      console.error('Error saving chat:', error);
    } finally {
      saveInProgress.current = false;
    }
  };

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  const predefinedPrompts = [
    {
      id: 1,
      title: "Audio Analysis",
      prompt: "Analyze this audio file and provide detailed feedback on its quality, composition, and potential improvements."
    },
    {
      id: 2,
      title: "Music Production",
      prompt: "Help me create a production plan for my track, including mixing and mastering steps."
    },
    {
      id: 3,
      title: "Sound Design",
      prompt: "Guide me through creating unique sound effects for my project using synthesis techniques."
    }
  ];

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };

  const handlePromptClick = (promptText) => {
    addMessage(promptText, "user");
    setIsFirstMessage(false);
  };

  const generateChatTitle = (text) => {
    const cleanText = text.trim().replace(/[^\w\s]/gi, ' ');
    const words = cleanText.split(/\s+/);
    return words.slice(0, 3).join(' ');
  };

  const stopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const typewriterEffect = (text, callback) => {
    let i = 0;
    const speed = 20; // Adjust speed of typing (lower = faster)
    let currentText = '';

    const type = () => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: currentText,
            isTyping: true
          };
          return newMessages;
        });
        i++;
        setTimeout(type, speed);
      } else {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            isTyping: false
          };
          return newMessages;
        });
        if (callback) callback();
      }
    };

    type();
  };

  const handleEmailRequest = async (recentMessages) => {
    try {
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Get the last 10 messages or all messages if less than 10
      const lastMessages = recentMessages.slice(-10);
      
      // Send email with the messages
      const result = await sendEmailWithPDF(
        user.email,
        lastMessages,
        `Chat Summary - ${activeChat?.title || 'AI Conversation'}`
      );

      console.log('Email send result:', result);

      // Add success message
      setMessages(prev => [...prev, {
        content: `✅ I've sent the email to ${user.email} with our conversation. Please check your inbox!`,
        role: "assistant",
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Email send error:', error);
      
      setMessages(prev => [...prev, {
        content: `❌ Sorry, I couldn't send the email: ${error.message}. Please try again or contact support if the issue persists.`,
        role: "assistant",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // Use useEffect to notify parent of message changes
  useEffect(() => {
    if (messages.length > 0 && onUpdateMessages) {
      onUpdateMessages(messages);
    }
  }, [messages, onUpdateMessages]);

  // Update the addMessage function
  const addMessage = async (content, role, isStreaming = false) => {
    if (!chatIdRef.current) return;
  
    const newMessage = {
      content,
      role,
      timestamp: new Date().toISOString()
    };
  
    setMessages(prevMessages => {
      let updatedMessages;
      if (role === 'assistant' && prevMessages.length > 0 && prevMessages[prevMessages.length - 1].role === 'assistant' && (isStreaming || !isStreaming)) {
        // Update the last assistant message, whether streaming or finalizing
        updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = newMessage;
      } else {
        // Add new message (for user or first assistant message)
        updatedMessages = [...prevMessages, newMessage];
      }
  
      // Save after AI response when stream is complete (non-streaming call)
      if (role === 'assistant' && !isStreaming) {
        saveMessages(updatedMessages);
      }
      
      return updatedMessages;
    });
  
    if (role === "user") {
      setIsFirstMessage(false);
      setIsLoading(true);
    } else if (role === "assistant") {
      // Clear loading state when assistant response is received
      setIsLoading(false);
    }
  };

  // Handle pending saves when loading state changes
  useEffect(() => {
    if (!isLoading && pendingMessages.current.length > 0) {
      saveMessages(pendingMessages.current);
    }
  }, [isLoading]);

  const handleStopResponse = () => {
    stopSpeaking();
  };

  const copyToClipboard = (content, messageId) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyStatus(prev => ({ ...prev, [messageId]: true }));
      setTimeout(() => setCopyStatus(prev => ({ ...prev, [messageId]: false })), 2000);
    });
  };

  const renderMessage = (message, index) => {
    // Add voice message indicator and styling
    return (
      <motion.div
        key={message.messageId}
        initial="hidden"
        animate="visible"
        variants={messageVariants}
        className={`flex items-start gap-3 mb-8 ${
          message.role === "user" ? "justify-end" : "justify-start"
        }`}
      >
        {message.role !== "user" && (
          <motion.div
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#cc2b5e] to-[#753a88] flex items-center justify-center border border-white/10 shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            {/* Show different icon for voice messages */}
            {message.isVoice ? (
              <BsChatLeftText className="w-4 h-4 text-white" />
            ) : (
              <HiSparkles className="w-4 h-4 text-white" />
            )}
          </motion.div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg ${
            message.role === "user"
              ? "bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white/90 border border-white/10"
              : `bg-[#1a1a1a] text-slate-200 border border-white/10 ${
                  message.isVoice ? 'voice-message' : ''
                }`
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            {/* Add voice message indicator if it's a voice message */}
            {message.isVoice && (
              <div className="text-xs text-[#cc2b5e] mb-1">🎤 Voice Message</div>
            )}
            
            {/* Rest of the message content rendering */}
            <div style={{ overflowX: "auto", width: "100%" }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => <table style={{ width: '100%', borderCollapse: 'collapse' }} {...props} />,
                  thead: ({ node, ...props }) => <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} {...props} />,
                  tr: ({ node, ...props }) => <tr style={{ backgroundColor: node.index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'inherit' }} {...props} />,
                  th: ({ node, ...props }) => <th style={{ border: '1px solid rgba(255, 255, 255, 0.2)', padding: '8px', textAlign: 'left' }} {...props} />,
                  td: ({ node, ...props }) => <td style={{ border: '1px solid rgba(255, 255, 255, 0.2)', padding: '8px', textAlign: 'left' }} {...props} />,
                  h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold' }} {...props} />,
                  h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.25em', fontWeight: 'bold' }} {...props} />,
                  h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold' }} {...props} />,
                  code: ({ node, inline, ...props }) => {
                    const content = String(props.children).trim();
                    return inline ? (
                      <code {...props} />
                    ) : (
                      <pre {...props} style={{ position: 'relative' }}>
                        <button
                          onClick={() => copyToClipboard(content, message.messageId)}
                          className="absolute top-1 right-1 text-xs text-white bg-gray-700 rounded px-2 py-1 hover:bg-gray-600"
                        >
                          {copyStatus[message.messageId] ? <LuCopyCheck /> : <FaRegCopy />}
                        </button>
                        <code>{content}</code>
                      </pre>
                    );
                  },
                  ul: ({ node, ...props }) => <ul {...props} />,
                  ol: ({ node, ...props }) => <ol {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        </div>

        {message.role === "user" && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10 shadow-lg">
            {/* Show different icon for user voice messages */}
            {message.isVoice ? (
              <BsChatLeftText className="w-4 h-4 text-[#FAAE7B]" />
            ) : (
              <FiUser className="w-4 h-4 text-[#FAAE7B]" />
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Add loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] animate-pulse" />
          <div className={`max-w-[70%] h-20 rounded-2xl animate-pulse ${
            i % 2 === 0 
              ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]' 
              : 'bg-[#1a1a1a]'
          }`} />
          {i % 2 === 0 && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] animate-pulse" />}
        </motion.div>
      ))}
    </div>
  );

  // When creating new chat
  const createNewChat = () => {
    const newChat = {
        id: `temp_${Date.now()}`, // Use consistent id property
        title: 'New Chat',
        messages: []
    };
    setActiveChat(newChat);
  };

  // Cleanup on unmount or chat change
  useEffect(() => {
    return () => {
      setIsLoading(false);
      saveInProgress.current = false;
      pendingMessages.current = [];
      chatIdRef.current = null;
    };
  }, [activeChat?.id]);

  return (
    <div className={`flex-1 flex flex-col relative h-screen bg-[#0a0a0a] ${
      isOpen ? 'lg:ml-0' : 'lg:ml-0'
    } transition-all duration-300`}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-3 sm:px-4 py-3 sm:py-4 flex items-center bg-[#0a0a0a]/80 backdrop-blur-lg h-[60px]">
        <div className="flex items-center justify-between w-full">
          <div className="w-full flex items-center justify-center lg:justify-start gap-2 sm:gap-3">
            {/* Logo - Visible only on mobile */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10">
                <img
                  src="/vannipro.png"
                  alt="Vaani.pro Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg sm:text-xl font-display font-bold text-white leading-none py-1">
                Vaani.pro
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 sm:p-4 space-y-4 sm:space-y-6 bg-[#0a0a0a]">
        {isLoadingChat ? (
          <LoadingSkeleton />
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-lg">
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Predefined Prompts - Enhanced with more intense glow effect */}
      <div className={`w-full ${isFirstMessage ? 'absolute top-1/2 -translate-y-1/2' : 'relative'}`}>
        {isFirstMessage && (
          <div className="px-4 py-6">
            {/* Added Welcome Message */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-[#cc2b5e]">Welcome to Vaani.pro</h1>
              <p className="text-gray-400 text-xl mt-2">How may I help you today?</p>
            </div>
            {/* Predefined Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {predefinedPrompts.map((item) => (
                <motion.div
                  key={item.id}
                  className="group relative bg-white/[0.05] backdrop-blur-xl border border-white/20 
                    rounded-xl p-4 cursor-pointer hover:bg-white/[0.08] transition-all duration-300 
                    shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] 
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#cc2b5e]/30 
                    before:to-[#753a88]/30 before:opacity-0 before:transition-opacity before:duration-300 
                    hover:before:opacity-100 before:rounded-xl overflow-hidden
                    hover:border-white/40"
                  onClick={() => handlePromptClick(item.prompt)}
                  whileHover={{ 
                    scale: 1.03,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Enhanced Glow overlay */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 
                      group-hover:opacity-20 transition-opacity duration-300 blur-2xl"
                    initial={{ opacity: 0 }}
                    whileHover={{ 
                      opacity: 0.25,
                      transition: { duration: 0.3 }
                    }}
                  />

                  {/* Animated border glow */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 
                      group-hover:opacity-30 transition-all duration-500 blur-md"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ 
                      opacity: 0.3,
                      scale: 1.05,
                      transition: { duration: 0.5 }
                    }}
                  />

                  {/* Content with enhanced hover effects */}
                  <div className="relative z-10">
                    <h3 className="text-white/90 font-medium text-sm mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {item.prompt}
                    </p>
                  </div>

                  {/* Additional corner glow effects */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] 
                    rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl -z-10"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
        <MessageInput 
          onSendMessage={addMessage}
          isLoading={isLoading}
          onStopResponse={stopSpeaking}
        />
      </div>
    </div>
  );
}

export default ChatContainer;