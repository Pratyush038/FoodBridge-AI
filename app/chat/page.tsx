'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Loader2, 
  Sparkles, 
  User, 
  TrendingUp,
  Package,
  Heart,
  Database,
  RefreshCw,
  Home,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatStats {
  totalDonations: number;
  activeRequests: number;
  availableFoodItems: number;
  userDonations?: number;
  userRequests?: number;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load initial data
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadInitialData();
      loadSuggestedQuestions();
      
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `👋 Hi ${session.user.name || 'there'}! I'm FoodBridge AI Assistant. I can help you with:\n\n• Finding available food donations\n• Creating donation listings\n• Requesting food for your NGO\n• Understanding our AI matching system\n• Viewing platform statistics\n• And much more!\n\nHow can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [status, session]);

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/chatbot/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSuggestedQuestions = async () => {
    try {
      const role = session?.user?.role || '';
      const response = await fetch(`/api/chatbot/suggestions?role=${role}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedQuestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          userId: session?.user?.id,
          userRole: session?.user?.role,
          userName: session?.user?.name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update stats if they changed
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or contact support.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
                <p className="text-gray-600">Powered by Gemini AI with real-time database access</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Chat with AI Assistant
                </CardTitle>
                <CardDescription className="text-green-50">
                  Ask me anything about food donations, requests, or the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages Area */}
                <ScrollArea className="h-[500px] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`rounded-lg px-4 py-3 max-w-[80%] ${
                            message.role === 'user'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-2 ${
                              message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about food donations..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => sendMessage()}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Suggested Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  Suggested Questions
                </CardTitle>
                <CardDescription>Click a question to ask</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(question)}
                      disabled={isLoading}
                      className="w-full text-left justify-start h-auto py-2 px-3 hover:bg-green-50 hover:border-green-300"
                    >
                      <span className="text-xs line-clamp-2">{question}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Database Access Info */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-green-600" />
                  Real-Time Data Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-700 mb-2">
                  This AI assistant has live access to:
                </p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>✓ Supabase PostgreSQL database</li>
                  <li>✓ Firebase Realtime database</li>
                  <li>✓ All food donations & requests</li>
                  <li>✓ User profiles & statistics</li>
                  <li>✓ Transaction history</li>
                  <li>✓ NGO and donor information</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
