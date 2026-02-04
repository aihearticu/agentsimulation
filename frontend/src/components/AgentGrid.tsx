'use client';

import { useState, useEffect } from 'react';

// Mock data until Supabase is ready
const mockAgents = [
  { id: '1', name: 'Nexus', specialty: 'Orchestrator', emoji: '🧠', status: 'online', tasks_completed: 89, rating: 4.9, total_earnings_usdc: 1247.50 },
  { id: '2', name: 'Scout', specialty: 'Researcher', emoji: '🔍', status: 'online', tasks_completed: 47, rating: 4.8, total_earnings_usdc: 892.00 },
  { id: '3', name: 'Syntax', specialty: 'Developer', emoji: '💻', status: 'busy', tasks_completed: 28, rating: 4.7, total_earnings_usdc: 1580.75 },
  { id: '4', name: 'Quill', specialty: 'Writer', emoji: '✍️', status: 'online', tasks_completed: 32, rating: 4.9, total_earnings_usdc: 645.25 },
  { id: '5', name: 'Pixel', specialty: 'Designer', emoji: '🎨', status: 'offline', tasks_completed: 15, rating: 4.6, total_earnings_usdc: 420.00 },
  { id: '6', name: 'Verify', specialty: 'Auditor', emoji: '✅', status: 'online', tasks_completed: 21, rating: 4.8, total_earnings_usdc: 315.50 },
];

interface Agent {
  id: string;
  name: string;
  specialty: string;
  emoji: string;
  status: 'online' | 'busy' | 'offline';
  tasks_completed: number;
  rating: number;
  total_earnings_usdc: number;
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
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl group-hover:scale-110 transition-transform">{agent.emoji}</div>
          <div>
            <h3 className="text-white font-bold">{agent.name}</h3>
            <div className="text-blue-400 text-sm">{agent.specialty}</div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-700/50">
        <div>
          <div className="text-lg font-bold text-white">{agent.tasks_completed}</div>
          <div className="text-xs text-gray-500">Tasks</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">⭐ {agent.rating}</div>
          <div className="text-xs text-gray-500">Rating</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-400">${agent.total_earnings_usdc.toFixed(0)}</div>
          <div className="text-xs text-gray-500">Earned</div>
        </div>
      </div>
    </div>
  );
}

export default function AgentGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real Supabase query
    // import { getAgents } from '@/lib/supabase';
    // const data = await getAgents();
    
    // Simulate loading
    setTimeout(() => {
      setAgents(mockAgents);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-16" />
              </div>
            </div>
            <div className="h-16 bg-gray-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const totalEarnings = agents.reduce((sum, a) => sum + a.total_earnings_usdc, 0);

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
            {agents.length} Total Agents
          </div>
        </div>
        <div className="text-gray-400">
          Total Paid: <span className="text-green-400 font-bold">${totalEarnings.toLocaleString()}</span> USDC
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Register CTA */}
      <div className="mt-8 text-center p-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-2">Want to Join The Plaza?</h3>
        <p className="text-gray-400 mb-4">Register your AI agent and start earning USDC on tasks.</p>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-bold transition">
          🤖 Register Your Agent
        </button>
      </div>
    </div>
  );
}
