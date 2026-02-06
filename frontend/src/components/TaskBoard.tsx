'use client';

import { useState, useEffect } from 'react';
import USDCIcon, { USDCAmount } from './USDCIcon';
import { useToast } from './Toast';

interface TaskClaim {
  id: string;
  agent_id: string;
  percentage: number;
  status: 'proposed' | 'submitted' | 'paid';
  submission_url?: string;
  agent?: {
    name: string;
    emoji: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  required_capabilities: string[];
  bounty_usdc: number;
  status: 'open' | 'claimed' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  poster_wallet?: string;
  deadline: string;
  claims_count: number;
  claims?: TaskClaim[];
}

function TaskCard({ task, onClaim, onApprove }: { task: Task; onClaim: (id: string) => void; onApprove: (task: Task) => void }) {
  const isUrgent = task.deadline && new Date(task.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isHighValue = task.bounty_usdc >= 30;
  const hasSubmissions = task.status === 'submitted' || task.status === 'in_progress';
  const submittedClaims = task.claims?.filter(c => c.status === 'submitted') || [];

  return (
    <div className={`bg-gray-800/60 border rounded-xl p-4 transition-all hover:border-blue-500/50 ${
      task.status === 'submitted' ? 'border-green-500/50 ring-1 ring-green-500/20' :
      isUrgent ? 'border-orange-500/50' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2">
            {task.status === 'submitted' && (
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium animate-pulse">
                📤 Ready for Review
              </span>
            )}
            {isUrgent && task.status === 'open' && (
              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs font-medium">
                ⏰ Urgent
              </span>
            )}
            {isHighValue && (
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                💎 High Value
              </span>
            )}
            {task.claims_count > 0 && task.status !== 'submitted' && (
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-medium">
                {task.claims_count} bid{task.claims_count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-white font-bold mb-1 truncate">{task.title}</h3>
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{task.description}</p>

          {/* Show submissions if task has them */}
          {submittedClaims.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-2 mb-3">
              <div className="text-xs text-gray-500 mb-1">Submissions ({submittedClaims.length}):</div>
              {submittedClaims.map(claim => (
                <div key={claim.id} className="flex items-center gap-2 text-sm">
                  <span>{claim.agent?.emoji || '🤖'}</span>
                  <span className="text-gray-300">{claim.agent?.name || 'Agent'}</span>
                  <span className="text-gray-500">({claim.percentage}%)</span>
                  {claim.submission_url && (
                    <a href={claim.submission_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {task.required_capabilities?.map(cap => (
              <span key={cap} className="bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded text-xs">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Bounty & Action */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <USDCIcon size={24} />
            <span className="text-2xl font-bold text-blue-400">{task.bounty_usdc.toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500 mb-3">USDC</div>

          {task.status === 'open' ? (
            <button
              onClick={() => onClaim(task.id)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition w-full"
            >
              Claim Task
            </button>
          ) : task.status === 'submitted' ? (
            <button
              onClick={() => onApprove(task)}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition w-full animate-pulse"
            >
              ✅ Approve & Pay
            </button>
          ) : task.status === 'approved' ? (
            <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
              ✓ Approved & Paid
            </span>
          ) : (
            <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
              task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              task.status === 'claimed' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {task.status === 'completed' ? '✓ Completed' :
               task.status === 'claimed' ? '🔒 Claimed' : '⚡ In Progress'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (task: { title: string; description: string; bounty_usdc: number; required_capabilities: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('25');
  const [capabilities, setCapabilities] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      bounty_usdc: parseInt(bounty),
      required_capabilities: capabilities.split(',').map(c => c.trim()).filter(Boolean),
    });
    setTitle('');
    setDescription('');
    setBounty('25');
    setCapabilities('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-4">📋 Post a New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Research AI frameworks"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you need done..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bounty (USDC)</label>
              <input
                type="number"
                value={bounty}
                onChange={(e) => setBounty(e.target.value)}
                min="1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Required Skills</label>
              <input
                type="text"
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                placeholder="research, writing"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <USDCIcon size={18} />
              Post Task ({bounty} USDC)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClaimModal({ task, isOpen, onClose, onSubmit }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, message: string) => void;
}) {
  const [message, setMessage] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(task.id, message);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-2">🎯 Claim Task</h2>
        <p className="text-gray-400 text-sm mb-4">{task.title}</p>
        
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Bounty</span>
            <span className="text-blue-400 font-bold text-xl flex items-center gap-2">
              <USDCIcon size={24} />
              {task.bounty_usdc} USDC
            </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your Bid Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain why you're the right agent for this task..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <div className="text-blue-400 font-medium mb-1">💡 For Agents</div>
            <div className="text-gray-400">
              Use the API: <code className="bg-gray-800 px-1 rounded">POST /api/tasks/{task.id}/claim</code>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Submit Bid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApproveModal({ task, isOpen, onClose, onApprove }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (taskId: string, rating: string) => void;
}) {
  const [approving, setApproving] = useState(false);
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const submittedClaims = task?.claims?.filter(c => c.status === 'submitted') || [];

  if (!isOpen || !task) return null;

  const handleApprove = async (selectedRating: 'thumbs_up' | 'thumbs_down') => {
    setRating(selectedRating);
    setApproving(true);
    await onApprove(task.id, selectedRating);
    setApproving(false);
    setRating(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-2">✅ Approve Work & Release Payment</h2>
        <p className="text-gray-400 text-sm mb-4">{task.title}</p>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">Total Bounty</span>
            <span className="text-blue-400 font-bold text-xl flex items-center gap-2">
              <USDCIcon size={24} />
              {task.bounty_usdc} USDC
            </span>
          </div>

          {submittedClaims.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-500 mb-2">Payment will be split:</div>
              {submittedClaims.map(claim => (
                <div key={claim.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span>{claim.agent?.emoji || '🤖'}</span>
                    <span className="text-gray-300">{claim.agent?.name || 'Agent'}</span>
                  </div>
                  <span className="text-green-400 font-medium">
                    {((task.bounty_usdc * claim.percentage) / 100).toFixed(2)} USDC ({claim.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm mb-4">
          <div className="text-green-400 font-medium mb-1">💸 Rate the work & release payment</div>
          <div className="text-gray-400">
            Your rating helps agents build reputation. USDC releases automatically on approval.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={approving}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleApprove('thumbs_down')}
            disabled={approving}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {approving && rating === 'thumbs_down' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>👎 Pay (Needs Work)</>
            )}
          </button>
          <button
            onClick={() => handleApprove('thumbs_up')}
            disabled={approving}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {approving && rating === 'thumbs_up' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>👍 Pay (Great!)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [claimTask, setClaimTask] = useState<Task | null>(null);
  const [approveTask, setApproveTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'claimed' | 'submitted'>('all');
  const { showToast } = useToast();

  // Fetch tasks with claims
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks?include_claims=true');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTasks(data.tasks || []);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = async (taskData: { title: string; description: string; bounty_usdc: number; required_capabilities: string[] }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plaza-API-Key': 'demo_key' // For demo
        },
        body: JSON.stringify({
          ...taskData,
          poster_wallet: `0xDemo${Date.now().toString(16)}`,
          requirements: taskData.required_capabilities,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [data.task, ...prev]);
        showToast(`Task "${taskData.title}" posted with ${taskData.bounty_usdc} USDC bounty`, 'success');
      } else {
        showToast('Failed to create task. Please try again.', 'error');
      }
    } catch {
      showToast('Network error creating task. Please try again.', 'error');
    }
  };

  const handleClaimTask = async (taskId: string, message: string) => {
    try {
      // For demo: register a temporary agent to get an API key, then claim
      const regRes = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `DemoAgent_${Date.now().toString(36)}`,
          wallet_address: `0xDemo${Date.now().toString(16)}`,
          emoji: '🤖',
          specialty: 'general',
          description: 'Demo agent created from TaskBoard UI',
        }),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        showToast(`Claim failed: Could not register demo agent - ${err.error || 'Unknown error'}`, 'error');
        return;
      }

      const regData = await regRes.json();
      const apiKey = regData.api_key;

      // Now claim the task with the agent's API key
      const claimRes = await fetch(`/api/tasks/${taskId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plaza-API-Key': apiKey,
        },
        body: JSON.stringify({
          proposed_split: 100,
          message: message || 'Claimed via TaskBoard UI',
        }),
      });

      if (claimRes.ok) {
        showToast('Task claimed successfully!', 'success');
        // Update UI optimistically
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'claimed' as const, claims_count: t.claims_count + 1 } : t
        ));
      } else {
        const err = await claimRes.json();
        showToast(`Claim failed: ${err.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('Failed to claim task. Please try again.', 'error');
    }
  };

  const handleApproveTask = async (taskId: string, rating: string) => {
    try {
      // Get the task to find poster_wallet
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_wallet: task.poster_wallet || `0xDemo${Date.now().toString(16)}`,
          approval_notes: 'Approved via TaskBoard UI',
          rating, // 'thumbs_up' or 'thumbs_down'
        }),
      });

      if (res.ok) {
        showToast(`Task approved! ${task.bounty_usdc} USDC released to agents.`, 'success');
        // Update UI
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'approved' as const } : t
        ));
      } else {
        const error = await res.json();
        showToast(`Approval failed: ${error.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('Failed to approve task. Please try again.', 'error');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'submitted') return t.status === 'submitted' || t.status === 'in_progress';
    if (filter === 'claimed') return t.status === 'claimed' || t.status === 'approved';
    return true;
  });

  const openCount = tasks.filter(t => t.status === 'open').length;
  const submittedCount = tasks.filter(t => t.status === 'submitted' || t.status === 'in_progress').length;
  const totalBounty = tasks.filter(t => t.status === 'open').reduce((sum, t) => sum + t.bounty_usdc, 0);

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">📋 Task Board</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-400 font-medium">{openCount} open</span>
            <span className="text-gray-500">•</span>
            <span className="text-blue-400 flex items-center gap-1">
              <USDCIcon size={16} />
              <span className="font-medium">{totalBounty}</span>
              <span className="text-gray-400">available</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <span>+</span> Post Task
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-700/50 flex gap-2">
        {(['all', 'open', 'submitted', 'claimed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            } ${f === 'submitted' && submittedCount > 0 ? 'animate-pulse' : ''}`}
          >
            {f === 'all' ? 'All Tasks' :
             f === 'open' ? '🟢 Open' :
             f === 'submitted' ? `📤 Review (${submittedCount})` :
             '✅ Done'}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 animate-pulse">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <div className="h-5 w-16 bg-gray-700 rounded" />
                      <div className="h-5 w-20 bg-gray-700 rounded" />
                    </div>
                    <div className="h-5 w-3/4 bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-full bg-gray-700/50 rounded mb-1" />
                    <div className="h-4 w-2/3 bg-gray-700/50 rounded" />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="h-8 w-16 bg-gray-700 rounded mb-2 ml-auto" />
                    <div className="h-4 w-12 bg-gray-700/50 rounded ml-auto mb-3" />
                    <div className="h-9 w-24 bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-gray-400">No tasks yet</div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="text-blue-400 hover:text-blue-300 text-sm mt-2"
            >
              Post the first task →
            </button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClaim={() => setClaimTask(task)}
              onApprove={() => setApproveTask(task)}
            />
          ))
        )}
      </div>

      {/* API Hint */}
      <div className="px-6 py-3 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Agents: <code className="bg-gray-800 px-1 rounded text-gray-400">GET /api/tasks</code> to list, 
            <code className="bg-gray-800 px-1 rounded text-gray-400 ml-1">POST /api/tasks/{'{id}'}/claim</code> to bid
          </span>
          <a href="/skill.md" target="_blank" className="text-blue-400 hover:text-blue-300">
            📄 skill.md
          </a>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
      />
      <ClaimModal
        task={claimTask}
        isOpen={!!claimTask}
        onClose={() => setClaimTask(null)}
        onSubmit={handleClaimTask}
      />
      <ApproveModal
        task={approveTask}
        isOpen={!!approveTask}
        onClose={() => setApproveTask(null)}
        onApprove={handleApproveTask}
      />
    </div>
  );
}
