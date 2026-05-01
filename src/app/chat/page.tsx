'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Trash2, MessageSquare, Home, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

// ✅ Use ai-sdk's built-in Message type
// import type { Message } from 'ai'; // ← If you want to use ai's built-in Message type
// Or define your own:
interface CustomMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  messages: CustomMessage[];
}

const CHAT_STORAGE_KEY = 'litedoc-chat-histories-v1';

export default function ChatPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatHistory[];
      if (!Array.isArray(parsed)) return;
      setChatHistories(parsed);
    } catch (error) {
      console.error('Failed to load chat history from storage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistories));
    } catch (error) {
      console.error('Failed to save chat history to storage:', error);
    }
  }, [chatHistories]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessagesToHistory = (nextMessages: CustomMessage[], chatIdOverride?: string) => {
    if (nextMessages.length === 0) return null;

    const chatId = chatIdOverride || currentChatId || Date.now().toString();
    const firstUserMessage = nextMessages.find(m => m.role === 'user');
    const firstMessageText = firstUserMessage?.content || '';
    const title = firstMessageText
      ? `${firstMessageText.slice(0, 50)}${firstMessageText.length > 50 ? '...' : ''}`
      : 'New Chat';

    const newHistory: ChatHistory = {
      id: chatId,
      title,
      timestamp: new Date().toISOString(),
      messages: nextMessages,
    };

    setChatHistories(prev => {
      const filtered = prev.filter(h => h.id !== chatId);
      return [newHistory, ...filtered];
    });

    setCurrentChatId(chatId);
    return chatId;
  };

  const compressImageFile = async (file: File) => {
    const imageBitmap = await createImageBitmap(file);
    const maxDimension = 1024;
    const scale = Math.min(
      1,
      maxDimension / Math.max(imageBitmap.width, imageBitmap.height),
    );
    const width = Math.round(imageBitmap.width * scale);
    const height = Math.round(imageBitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser does not support canvas');
    }
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.7),
    );
    if (!blob) {
      throw new Error('Unable to compress image');
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Unable to read compressed image'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setUploadedImage(compressed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setApiError(`Image upload failed: ${message}`);
      }
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setUploadedImage(null);
    setCurrentChatId(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadChatHistory = (history: ChatHistory) => {
    setMessages(history.messages);
    setCurrentChatId(history.id);
    setShowHistory(false);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const question = input.trim();
    if (!question && !uploadedImage) return;

    const userMessage: CustomMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: question || 'Image-based question',
      image: uploadedImage || undefined,
    };
    const nextMessagesWithUser = [...messages, userMessage];
    const activeChatId =
      saveMessagesToHistory(nextMessagesWithUser) ||
      currentChatId ||
      Date.now().toString();
    setMessages(nextMessagesWithUser);
    setInput('');
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          image: uploadedImage,
          history: nextMessagesWithUser.map(m => ({
            role: m.role,
            content: m.content,
            image: m.image,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Model API error');
      }

      const answer = await response.text();
      const assistantMessage: CustomMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: answer,
      };

      const finalMessages = [...nextMessagesWithUser, assistantMessage];
      setMessages(finalMessages);
      saveMessagesToHistory(finalMessages, activeChatId);
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen bg-[#030712] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(15,30,80,0.6)_0%,transparent_60%),radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(50,10,80,0.35)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>
      {/* Sidebar - Chat History */}
      <div
        className={`${
          showHistory ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative lg:translate-x-0 z-30 w-80 bg-[rgba(5,10,20,0.92)] border-r border-cyan-400/15 backdrop-blur-xl transition-transform duration-300 h-full flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-cyan-400/15">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/25 to-violet-400/25 border border-cyan-300/30 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white font-mono tracking-wide">LiteDoc AI</h2>
              <p className="text-xs text-slate-300 font-mono">Document Understanding</p>
            </div>
          </div>
          <Button onClick={startNewChat} className="w-full border-cyan-400/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100" variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-cyan-300/80 mb-2 uppercase tracking-wider font-mono">
            Chat History
          </h3>
          {chatHistories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 font-mono">
              No chats yet
            </p>
          ) : (
            <div className="space-y-2">
              {chatHistories.map(history => (
                <button
                  key={history.id}
                  onClick={() => loadChatHistory(history)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    currentChatId === history.id
                      ? 'bg-cyan-500/10 border-cyan-400/35'
                      : 'bg-white/0 border-transparent hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate font-mono">
                    {history.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {new Date(history.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Back to Visualization */}
        <div className="p-4 border-t border-cyan-400/15">
          <Link href="/">
            <Button variant="outline" className="w-full border-violet-400/35 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100">
              <Home className="w-4 h-4 mr-2" />
              Back to Visualization
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[rgba(5,10,20,0.82)] border-b border-cyan-400/15 p-4 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-cyan-200"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold bg-[linear-gradient(135deg,#f1f5f9_0%,#38bdf8_40%,#a78bfa_70%,#f472b6_100%)] bg-clip-text text-transparent font-mono tracking-wide">
                  Chat with LiteDoc
                </h1>
                <p className="text-sm text-slate-300 font-mono">
                  Ask questions about document understanding
                </p>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="hidden lg:flex text-slate-200 hover:bg-white/10 hover:text-white border border-white/10">
                <Home className="w-4 h-4 mr-2" />
                Visualization
              </Button>
            </Link>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-violet-400/20 border border-cyan-300/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-cyan-200" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                  Welcome to LiteDoc AI
                </h2>
                <p className="text-slate-300 mb-6 font-mono text-sm">
                  Upload a document image and ask questions about it
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-[rgba(5,10,25,0.72)] rounded-lg border border-cyan-400/20 backdrop-blur-md">
                    <h3 className="font-semibold text-white mb-2 font-mono">
                      📄 Document Analysis
                    </h3>
                    <p className="text-sm text-slate-300 font-mono">
                      Extract information from forms, receipts, and documents
                    </p>
                  </div>
                  <div className="p-4 bg-[rgba(5,10,25,0.72)] rounded-lg border border-violet-400/20 backdrop-blur-md">
                    <h3 className="font-semibold text-white mb-2 font-mono">
                      🔍 Visual Q&A
                    </h3>
                    <p className="text-sm text-slate-300 font-mono">
                      Ask questions about images and get detailed answers
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                        message.role === 'user'
                          ? 'bg-[linear-gradient(135deg,rgba(56,189,248,0.24),rgba(167,139,250,0.24))] border-cyan-300/35 text-cyan-50'
                          : 'bg-[rgba(5,10,25,0.82)] border-white/10 text-slate-100'
                      }`}
                    >
                      {message.image && message.role === 'user' && (
                        <img
                          src={message.image}
                          alt="Uploaded context"
                          className="mb-3 max-h-52 w-auto rounded-lg border border-cyan-300/30"
                        />
                      )}
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[rgba(5,10,25,0.82)] border border-white/10 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {apiError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 font-mono">
                {apiError}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[rgba(5,10,20,0.82)] border-t border-cyan-400/15 p-4 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            {uploadedImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="h-20 w-auto rounded-lg border border-cyan-300/30"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={onSubmit} className="flex gap-2" autoComplete="off">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 border-cyan-400/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100"
              >
                <ImagePlus className="w-5 h-5" />
              </Button>
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a question about your document..."
                className="min-h-[60px] resize-none border-cyan-400/25 bg-[rgba(3,7,18,0.9)] text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/40 font-mono"
                autoComplete="off"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e as any);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || (!input.trim() && !uploadedImage)}
                className="shrink-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.25),rgba(167,139,250,0.25))] border border-cyan-300/30 text-cyan-50 hover:bg-[linear-gradient(135deg,rgba(56,189,248,0.35),rgba(167,139,250,0.35))]"
                size="icon"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
            <p className="text-xs text-slate-400 mt-2 text-center font-mono">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}