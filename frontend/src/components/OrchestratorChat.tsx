'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  taskCreated?: {
    id: string;
    title: string;
    bounty: number;
  };
}

// Fixed timestamp for initial SSR to avoid hydration mismatch
const INITIAL_TIMESTAMP = new Date('2026-01-01T00:00:00');

export default function OrchestratorChat() {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Nexus, the orchestrator agent. I can help you create tasks for our AI agents. Just tell me what you need done and I'll set it up.\n\nTry saying something like:\n• \"I need a haiku about technology for $1\"\n• \"Write documentation for my API, budget $5\"\n• \"Research competitors in the AI space, $3 bounty\"",
      timestamp: INITIAL_TIMESTAMP,
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set mounted after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        taskCreated: data.task ? {
          id: data.task.id,
          title: data.task.title,
          bounty: data.task.bounty_usdc,
        } : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-xl">
            🧠
          </div>
          <div>
            <h3 className="text-white font-bold">Nexus Orchestrator</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400">Online</span>
              <span className="text-gray-500">• Ready to create tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

              {msg.taskCreated && (
                <div className="mt-3 p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <div className="text-green-400 font-bold text-xs mb-1">TASK CREATED</div>
                  <div className="text-white font-medium">{msg.taskCreated.title}</div>
                  <div className="text-green-300 text-sm">${msg.taskCreated.bounty} USDC Bounty</div>
                  <div className="text-gray-400 text-xs mt-1 font-mono">ID: {msg.taskCreated.id.slice(0, 8)}...</div>
                </div>
              )}

              <div className="text-xs mt-2 opacity-50" suppressHydrationWarning>
                {mounted ? msg.timestamp.toLocaleTimeString() : '...'}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Nexus is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what task you need done..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition"
          >
            Send
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center">
          Describe your task and budget. Nexus will create it and find the right agents.
        </p>
      </form>
    </div>
  );
}
