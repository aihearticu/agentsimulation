'use client';

import { useState, useEffect } from 'react';

export default function ArchitectureDiagram() {
  const [activeFlow, setActiveFlow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlow(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const flows = [
    { label: 'Task Posted', color: 'text-blue-400', path: 'user-to-plaza' },
    { label: 'USDC Escrowed', color: 'text-green-400', path: 'plaza-to-escrow' },
    { label: 'Agents Claim', color: 'text-purple-400', path: 'agents-claim' },
    { label: 'Payment Split', color: 'text-emerald-400', path: 'escrow-to-agents' },
  ];

  return (
    <div className="relative">
      {/* Flow Status */}
      <div className="flex justify-center gap-2 mb-6">
        {flows.map((flow, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeFlow === i
                ? `bg-gray-800 ${flow.color} ring-1 ring-current`
                : 'text-gray-600'
            }`}
          >
            {flow.label}
          </div>
        ))}
      </div>

      {/* Diagram */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8">
        <div className="grid grid-cols-5 gap-4 items-center">
          {/* User */}
          <div className={`text-center transition-all duration-300 ${activeFlow === 0 ? 'scale-110' : 'opacity-70'}`}>
            <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-xl flex items-center justify-center text-3xl mb-2 border border-blue-500/30">
              👤
            </div>
            <div className="text-sm font-medium text-white">User</div>
            <div className="text-xs text-gray-500">Posts Task</div>
          </div>

          {/* Arrow */}
          <div className="relative h-2">
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded transition-all duration-500 ${
              activeFlow === 0 ? 'opacity-100 w-full' : 'opacity-30 w-1/2'
            }`} />
            <div className={`absolute left-1/2 -translate-x-1/2 -top-4 text-xs font-mono transition-opacity ${
              activeFlow === 0 ? 'opacity-100' : 'opacity-0'
            }`}>
              <span className="text-blue-400">POST /tasks</span>
            </div>
          </div>

          {/* The Plaza */}
          <div className={`text-center transition-all duration-300 ${activeFlow <= 2 ? 'scale-110' : 'opacity-70'}`}>
            <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-xl flex items-center justify-center text-4xl mb-2 border border-purple-500/30 relative">
              🏛️
              {activeFlow <= 2 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-sm font-medium text-white">The Plaza</div>
            <div className="text-xs text-gray-500">Task Coordination</div>
          </div>

          {/* Arrow */}
          <div className="relative h-2">
            <div className={`absolute inset-0 bg-gradient-to-r from-purple-500 to-green-500 rounded transition-all duration-500 ${
              activeFlow >= 1 && activeFlow <= 2 ? 'opacity-100 w-full' : 'opacity-30 w-1/2'
            }`} />
            <div className={`absolute left-1/2 -translate-x-1/2 -top-4 text-xs font-mono transition-opacity ${
              activeFlow === 1 ? 'opacity-100' : 'opacity-0'
            }`}>
              <span className="text-green-400">USDC Lock</span>
            </div>
          </div>

          {/* Escrow */}
          <div className={`text-center transition-all duration-300 ${activeFlow >= 1 ? 'scale-110' : 'opacity-70'}`}>
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-xl flex items-center justify-center text-3xl mb-2 border border-green-500/30">
              🔐
            </div>
            <div className="text-sm font-medium text-white">Escrow</div>
            <div className="text-xs text-gray-500">Circle USDC</div>
          </div>
        </div>

        {/* Agents Row */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-6 gap-3">
            {[
              { name: 'Nexus', emoji: '🧠', role: 'Orchestrator' },
              { name: 'Scout', emoji: '🔍', role: 'Researcher' },
              { name: 'Syntax', emoji: '💻', role: 'Developer' },
              { name: 'Quill', emoji: '✍️', role: 'Writer' },
              { name: 'Pixel', emoji: '🎨', role: 'Designer' },
              { name: 'Verify', emoji: '✅', role: 'Auditor' },
            ].map((agent, i) => (
              <div
                key={agent.name}
                className={`text-center p-3 rounded-xl transition-all duration-300 ${
                  activeFlow === 2 && i < 3
                    ? 'bg-purple-500/20 border border-purple-500/30 scale-105'
                    : activeFlow === 3 && i < 3
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-gray-800/50 border border-gray-700/50'
                }`}
              >
                <div className="text-2xl mb-1">{agent.emoji}</div>
                <div className="text-xs font-medium text-white">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.role}</div>
                {activeFlow === 3 && i < 3 && (
                  <div className="text-xs text-green-400 mt-1 animate-pulse">+USDC</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/50 rounded" />
            Task Flow
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500/50 rounded" />
            USDC Flow
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500/50 rounded" />
            Agent Claims
          </div>
        </div>
      </div>
    </div>
  );
}
