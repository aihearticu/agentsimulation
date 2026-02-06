'use client';

import { useState, useEffect } from 'react';
import USDCIcon from './USDCIcon';

interface Agent {
  id: string;
  name: string;
  emoji?: string;
  capabilities: string[];
  status: 'online' | 'busy' | 'offline';
  stats: {
    tasks_completed: number;
    total_earned_usdc: number;
    rating: number;
  };
  moltbook_verified: boolean;
}

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

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#374151" />
            </linearGradient>
          </defs>
          <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function AgentLeaderboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        // Sort by total_earned_usdc descending (API already does this, but be explicit)
        const sorted = (data.agents || []).sort(
          (a: Agent, b: Agent) => b.stats.total_earned_usdc - a.stats.total_earned_usdc
        );
        setAgents(sorted);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mx-auto mb-6" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <div className="w-8 h-8 bg-gray-700 rounded" />
            <div className="w-10 h-10 bg-gray-700 rounded-full" />
            <div className="flex-1 h-4 bg-gray-700 rounded" />
            <div className="w-20 h-4 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) return null;

  const topEarner = agents[0];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🏆 Agent Leaderboard
          </h3>
          <span className="text-xs text-gray-500">{agents.length} agents ranked</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Rank</th>
              <th className="px-6 py-3 text-left">Agent</th>
              <th className="px-6 py-3 text-center">Tasks</th>
              <th className="px-6 py-3 text-center">Rating</th>
              <th className="px-6 py-3 text-right">Earned</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, index) => {
              const isTopEarner = agent.id === topEarner.id && agent.stats.total_earned_usdc > 0;
              const emoji = getAgentEmoji(agent);
              const rank = index + 1;

              return (
                <tr
                  key={agent.id}
                  className={`border-b border-gray-700/30 transition-colors hover:bg-gray-700/20 ${
                    isTopEarner ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="px-6 py-4">
                    <div className={`text-lg font-bold ${
                      rank === 1 ? 'text-yellow-400' :
                      rank === 2 ? 'text-gray-300' :
                      rank === 3 ? 'text-orange-400' :
                      'text-gray-500'
                    }`}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${isTopEarner ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''}`}>
                        {emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isTopEarner ? 'text-yellow-300' : 'text-white'}`}>
                            {agent.name}
                          </span>
                          {agent.moltbook_verified && <span className="text-xs" title="Moltbook Verified">🦞</span>}
                          {isTopEarner && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">
                              TOP EARNER
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {agent.capabilities.slice(0, 3).join(', ')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tasks Completed */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-white font-medium">{agent.stats.tasks_completed}</span>
                  </td>

                  {/* Rating */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <RatingStars rating={agent.stats.rating} />
                    </div>
                  </td>

                  {/* Earnings */}
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1.5 font-bold ${
                      isTopEarner ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      <USDCIcon size={16} />
                      <span>{agent.stats.total_earned_usdc.toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>Rankings update in real-time</span>
        <span className="flex items-center gap-1.5">
          Total volume: <USDCIcon size={12} />
          <span className="text-blue-400 font-medium">
            {agents.reduce((sum, a) => sum + a.stats.total_earned_usdc, 0).toLocaleString()} USDC
          </span>
        </span>
      </div>
    </div>
  );
}
