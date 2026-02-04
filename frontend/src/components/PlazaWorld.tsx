'use client';

import { useState, useEffect, useCallback } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  status: 'idle' | 'moving' | 'working' | 'delivering';
  task: string | null;
  output: string | null;
  message: string | null;
}

interface Task {
  id: string;
  title: string;
  x: number;
  y: number;
  status: 'pending' | 'claimed' | 'completed';
  reward: number;
}

const initialAgents: Agent[] = [
  { id: '1', name: 'Nexus', emoji: '🧠', color: '#a855f7', x: 15, y: 50, targetX: 15, targetY: 50, status: 'idle', task: null, output: null, message: null },
  { id: '2', name: 'Scout', emoji: '🔍', color: '#3b82f6', x: 30, y: 20, targetX: 30, targetY: 20, status: 'idle', task: null, output: null, message: null },
  { id: '3', name: 'Syntax', emoji: '💻', color: '#22c55e', x: 70, y: 25, targetX: 70, targetY: 25, status: 'idle', task: null, output: null, message: null },
  { id: '4', name: 'Quill', emoji: '✍️', color: '#eab308', x: 85, y: 50, targetX: 85, targetY: 50, status: 'idle', task: null, output: null, message: null },
  { id: '5', name: 'Pixel', emoji: '🎨', color: '#ec4899', x: 70, y: 75, targetX: 70, targetY: 75, status: 'idle', task: null, output: null, message: null },
  { id: '6', name: 'Verify', emoji: '✅', color: '#14b8a6', x: 30, y: 80, targetX: 30, targetY: 80, status: 'idle', task: null, output: null, message: null },
];

// Task board position
const TASK_BOARD = { x: 50, y: 15 };
// Delivery zone position
const DELIVERY_ZONE = { x: 50, y: 85 };

const taskTemplates = [
  { title: 'Research AI frameworks', reward: 25 },
  { title: 'Write blog post', reward: 15 },
  { title: 'Debug API endpoint', reward: 30 },
  { title: 'Design landing page', reward: 20 },
  { title: 'Audit smart contract', reward: 50 },
  { title: 'Analyze market data', reward: 35 },
];

export default function PlazaWorld() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]);
  }, []);

  // Spawn new tasks periodically
  useEffect(() => {
    const spawnTask = () => {
      const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: template.title,
        x: TASK_BOARD.x + (Math.random() - 0.5) * 10,
        y: TASK_BOARD.y + (Math.random() - 0.5) * 5,
        status: 'pending',
        reward: template.reward,
      };
      setTasks(prev => [...prev.filter(t => t.status !== 'completed'), newTask]);
      addLog(`📋 New task: "${template.title}" (+${template.reward} USDC)`);
    };

    spawnTask(); // Initial task
    const interval = setInterval(spawnTask, 6000);
    return () => clearInterval(interval);
  }, [addLog]);

  // Agent AI - claim and work on tasks
  useEffect(() => {
    const tick = () => {
      setAgents(prevAgents => {
        return prevAgents.map(agent => {
          // If idle, look for a task
          if (agent.status === 'idle' && !agent.task) {
            const pendingTask = tasks.find(t => t.status === 'pending');
            if (pendingTask && Math.random() > 0.7) {
              // Claim the task
              setTasks(prev => prev.map(t => 
                t.id === pendingTask.id ? { ...t, status: 'claimed' as const } : t
              ));
              addLog(`${agent.emoji} ${agent.name} claims "${pendingTask.title}"`);
              return {
                ...agent,
                status: 'moving' as const,
                task: pendingTask.id,
                targetX: TASK_BOARD.x,
                targetY: TASK_BOARD.y,
                message: `Claiming task...`,
              };
            }
          }

          // If moving, animate towards target
          if (agent.status === 'moving') {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 2) {
              // Arrived at destination
              if (agent.task) {
                // At task board, start working
                addLog(`${agent.emoji} ${agent.name} is working...`);
                return {
                  ...agent,
                  x: agent.targetX,
                  y: agent.targetY,
                  status: 'working' as const,
                  message: 'Working...',
                };
              } else if (agent.output) {
                // At delivery zone, deliver
                const task = tasks.find(t => t.id === agent.output);
                if (task) {
                  setCompletedCount(c => c + 1);
                  setTotalEarnings(e => e + task.reward);
                  setTasks(prev => prev.map(t => 
                    t.id === task.id ? { ...t, status: 'completed' as const } : t
                  ));
                  addLog(`💸 ${agent.emoji} ${agent.name} delivered! +${task.reward} USDC`);
                }
                return {
                  ...agent,
                  x: agent.targetX,
                  y: agent.targetY,
                  status: 'idle' as const,
                  output: null,
                  message: null,
                };
              }
            }
            
            // Move towards target
            const speed = 1.5;
            return {
              ...agent,
              x: agent.x + (dx / dist) * speed,
              y: agent.y + (dy / dist) * speed,
            };
          }

          // If working, complete after a delay
          if (agent.status === 'working') {
            if (Math.random() > 0.95) {
              addLog(`${agent.emoji} ${agent.name} finished! Delivering...`);
              return {
                ...agent,
                status: 'delivering' as const,
                output: agent.task,
                task: null,
                message: 'Delivering!',
                targetX: DELIVERY_ZONE.x,
                targetY: DELIVERY_ZONE.y,
              };
            }
          }

          // If delivering, move to delivery zone
          if (agent.status === 'delivering') {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 2) {
              const task = tasks.find(t => t.id === agent.output);
              if (task) {
                setCompletedCount(c => c + 1);
                setTotalEarnings(e => e + task.reward);
                setTasks(prev => prev.filter(t => t.id !== task.id));
                addLog(`💸 ${agent.emoji} ${agent.name} delivered! +${task.reward} USDC`);
              }
              // Return home
              const home = initialAgents.find(a => a.id === agent.id)!;
              return {
                ...agent,
                status: 'moving' as const,
                output: null,
                message: null,
                targetX: home.x,
                targetY: home.y,
              };
            }
            
            const speed = 1.5;
            return {
              ...agent,
              x: agent.x + (dx / dist) * speed,
              y: agent.y + (dy / dist) * speed,
            };
          }

          return agent;
        });
      });
    };

    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [tasks, addLog]);

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 font-mono text-sm">THE PLAZA — LIVE SIMULATION</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">Tasks: <span className="text-white font-bold">{completedCount}</span></span>
          <span className="text-gray-400">Earned: <span className="text-green-400 font-bold">${totalEarnings}</span></span>
        </div>
      </div>

      {/* World View */}
      <div className="relative h-[400px] bg-gradient-to-b from-gray-900 to-gray-950">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />

        {/* Task Board */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${TASK_BOARD.x}%`, top: `${TASK_BOARD.y}%` }}
        >
          <div className="bg-blue-500/20 border-2 border-blue-500/50 rounded-xl px-4 py-2 text-center">
            <div className="text-2xl">📋</div>
            <div className="text-blue-400 text-xs font-bold">TASK BOARD</div>
          </div>
        </div>

        {/* Delivery Zone */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${DELIVERY_ZONE.x}%`, top: `${DELIVERY_ZONE.y}%` }}
        >
          <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl px-4 py-2 text-center">
            <div className="text-2xl">📦</div>
            <div className="text-green-400 text-xs font-bold">DELIVERY</div>
          </div>
        </div>

        {/* Pending Tasks */}
        {tasks.filter(t => t.status === 'pending').map(task => (
          <div
            key={task.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
            style={{ left: `${task.x}%`, top: `${task.y}%` }}
          >
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-2 py-1 text-xs text-yellow-400">
              +${task.reward}
            </div>
          </div>
        ))}

        {/* Agents */}
        {agents.map(agent => (
          <div
            key={agent.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-50"
            style={{ 
              left: `${agent.x}%`, 
              top: `${agent.y}%`,
              zIndex: 20
            }}
          >
            {/* Agent body */}
            <div 
              className={`relative flex items-center justify-center w-12 h-12 rounded-full text-2xl transition-transform ${
                agent.status === 'working' ? 'animate-pulse scale-110' : ''
              } ${agent.status === 'moving' || agent.status === 'delivering' ? 'scale-105' : ''}`}
              style={{ 
                backgroundColor: `${agent.color}30`,
                border: `2px solid ${agent.color}`,
                boxShadow: agent.status !== 'idle' ? `0 0 20px ${agent.color}50` : 'none'
              }}
            >
              {agent.emoji}
              
              {/* Status indicator */}
              {agent.status === 'working' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs animate-spin">
                  ⚙️
                </div>
              )}
              {agent.status === 'delivering' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs">
                  📦
                </div>
              )}
            </div>

            {/* Name tag */}
            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-bold" style={{ color: agent.color }}>{agent.name}</span>
            </div>

            {/* Message bubble */}
            {agent.message && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap animate-fade-in">
                <div className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white">
                  {agent.message}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Connection lines when agents are working */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {agents.filter(a => a.status === 'working').map(agent => (
            <line
              key={`line-${agent.id}`}
              x1={`${agent.x}%`}
              y1={`${agent.y}%`}
              x2={`${TASK_BOARD.x}%`}
              y2={`${TASK_BOARD.y}%`}
              stroke={agent.color}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />
          ))}
          {agents.filter(a => a.status === 'delivering').map(agent => (
            <line
              key={`deliver-${agent.id}`}
              x1={`${agent.x}%`}
              y1={`${agent.y}%`}
              x2={`${DELIVERY_ZONE.x}%`}
              y2={`${DELIVERY_ZONE.y}%`}
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Activity Log */}
      <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30">
        <div className="space-y-1 font-mono text-xs h-20 overflow-hidden">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-400 animate-fade-in">
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-600">Waiting for activity...</div>
          )}
        </div>
      </div>
    </div>
  );
}
