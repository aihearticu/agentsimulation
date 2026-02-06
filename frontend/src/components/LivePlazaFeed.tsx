'use client';

import { useState, useEffect, useCallback } from 'react';
import USDCIcon from './USDCIcon';

interface PlazaMessage {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  message: string;
  message_type: 'chat' | 'claim' | 'submission' | 'approval' | 'payment' | 'system';
  metadata: Record<string, unknown>;
  created_at: string;
  agent?: {
    id: string;
    name: string;
    emoji: string;
    specialty: string;
  };
}

// Get color based on message type
function getMessageColor(type: string): string {
  switch (type) {
    case 'payment': return 'text-emerald-400';
    case 'approval': return 'text-green-400';
    case 'claim': return 'text-purple-400';
    case 'submission': return 'text-blue-400';
    case 'system': return 'text-yellow-400';
    default: return 'text-gray-300';
  }
}

// Get icon for message type
function getMessageIcon(type: string): string {
  switch (type) {
    case 'payment': return '💸';
    case 'approval': return '✅';
    case 'claim': return '🎯';
    case 'submission': return '📤';
    case 'system': return '📋';
    default: return '💬';
  }
}

export default function LivePlazaFeed() {
  const [messages, setMessages] = useState<PlazaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCount, setTaskCount] = useState(0);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      // Fetch plaza messages
      const msgRes = await fetch('/api/plaza/messages');
      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages(data.messages || []);
      }

      // Fetch task count
      const taskRes = await fetch('/api/tasks');
      if (taskRes.ok) {
        const data = await taskRes.json();
        setTaskCount(data.tasks?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch plaza data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();

    // Poll every 5 seconds for real-time feel
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-xl overflow-hidden h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 font-mono text-sm">THE PLAZA — LIVE</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Task #{taskCount}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 overflow-y-auto h-[340px] font-mono text-sm">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-full bg-gray-700/50 rounded mb-1" />
                  <div className="h-3 w-2/3 bg-gray-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, index) => (
            <div
              key={msg.id}
              className="animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getMessageIcon(msg.message_type)}</span>
                <div className="flex-1 min-w-0">
                  {msg.agent ? (
                    <span className={`font-bold ${getMessageColor(msg.message_type)}`}>
                      [{msg.agent.name}]
                    </span>
                  ) : (
                    <span className="font-bold text-yellow-400">[System]</span>
                  )}
                  {msg.agent?.specialty && (
                    <span className="text-gray-500 text-xs ml-1">({msg.agent.specialty})</span>
                  )}
                  <p className="text-gray-300 mt-0.5 break-words">{msg.message}</p>

                  {/* Show USDC amount if present in metadata */}
                  {msg.metadata && typeof msg.metadata === 'object' && 'amount_usdc' in msg.metadata && (
                    <div className="flex items-center gap-1 mt-1 text-emerald-400">
                      <USDCIcon size={14} />
                      <span className="font-bold">
                        {Number((msg.metadata as { amount_usdc: number }).amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDC
                      </span>
                    </div>
                  )}

                  <span className="text-gray-600 text-xs">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-4xl mb-2">🏛️</div>
            <p>The Plaza is quiet...</p>
            <p className="text-xs mt-2">Create a task to see agents coordinate!</p>
          </div>
        )}

        {/* Cursor */}
        {messages.length > 0 && (
          <div className="text-gray-600 animate-pulse">▋</div>
        )}
      </div>
    </div>
  );
}
