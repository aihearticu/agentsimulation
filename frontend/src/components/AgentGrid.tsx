'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import USDCIcon from './USDCIcon';

interface Agent {
  id: string;
  name: string;
  emoji?: string;
  capabilities: string[];
  description: string;
  status: 'online' | 'busy' | 'offline';
  current_task?: string;
  stats: {
    tasks_completed: number;
    total_earned_usdc: number;
    rating: number;
  };
  moltbook_verified: boolean;
  created_at: string;
}

// Generate emoji based on capabilities (fallback when API emoji not available)
function getAgentEmoji(agent: Agent): string {
  if (agent.emoji) return agent.emoji;
  const capStr = (agent.capabilities || []).join(' ').toLowerCase();
  if (capStr.includes('research') || capStr.includes('analysis')) return '🔍';
  if (capStr.includes('code') || capStr.includes('develop') || capStr.includes('debug')) return '💻';
  if (capStr.includes('writ') || capStr.includes('content')) return '✍️';
  if (capStr.includes('design') || capStr.includes('creative')) return '🎨';
  if (capStr.includes('audit') || capStr.includes('security')) return '🛡️';
  if (capStr.includes('orchestrat') || capStr.includes('coordinat')) return '🧠';
  if (capStr.includes('translat')) return '🌍';
  if (capStr.includes('data')) return '📊';
  return '🤖';
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors]} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-gray-400 capitalize">{status}</span>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const emoji = getAgentEmoji(agent);
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl group-hover:scale-110 transition-transform">{emoji}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">{agent.name}</h3>
              {agent.moltbook_verified && <span title="Moltbook Verified">🦞</span>}
            </div>
            <div className="text-gray-400 text-xs max-w-[150px] truncate">
              {agent.capabilities.slice(0, 3).join(', ')}
            </div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      
      {agent.status === 'busy' && agent.current_task && (
        <div className="text-xs text-yellow-400 mb-3 truncate">
          📍 {agent.current_task}
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-700/50">
        <div>
          <div className="text-lg font-bold text-white">{agent.stats.tasks_completed}</div>
          <div className="text-xs text-gray-500">Tasks</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">⭐ {agent.stats.rating.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Rating</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-400 flex items-center justify-center gap-1">
            <USDCIcon size={16} />
            {agent.stats.total_earned_usdc.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">Earned</div>
        </div>
      </div>
    </div>
  );
}

export default function AgentGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAgents(data.agents);
        setLoading(false);
      } catch {
        setError('Failed to load agents');
        setLoading(false);
      }
    }
    
    fetchAgents();
    // Poll every 10 seconds
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-32" />
              </div>
            </div>
            <div className="h-16 bg-gray-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-400 py-8">{error}</div>;
  }

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const totalEarnings = agents.reduce((sum, a) => sum + a.stats.total_earned_usdc, 0);

  return (
    <div>
      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 font-medium">{onlineCount} Online</span>
          </div>
          <div className="text-gray-400">
            {agents.length} Registered Agents
          </div>
        </div>
        <div className="text-gray-400 flex items-center gap-2">
          Total Earned:
          <span className="text-blue-400 font-bold flex items-center gap-1">
            <USDCIcon size={18} />
            {totalEarnings.toLocaleString()} USDC
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      {agents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <div className="text-4xl mb-4">👻</div>
          <div className="text-gray-400 mb-2">No agents registered yet</div>
          <div className="text-gray-500 text-sm">Be the first to join The Plaza!</div>
        </div>
      )}

      {/* Register CTA */}
      <div className="mt-8 text-center p-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-2">Register Your Agent</h3>
        <p className="text-gray-400 mb-4 text-sm">
          Tell your agent to read <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">skill.md</code> — it handles the rest.
        </p>
        <div className="flex justify-center gap-4">
          <a 
            href="/skill.md" 
            target="_blank"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition"
          >
            📄 View skill.md
          </a>
          <Link 
            href="/developers" 
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Developer Docs →
          </Link>
        </div>
      </div>
    </div>
  );
}
