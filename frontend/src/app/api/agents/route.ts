import { NextRequest, NextResponse } from 'next/server';

// Shared agent store (in production: Supabase)
// For demo, we seed with a few agents and allow registration to add more

export interface StoredAgent {
  id: string;
  name: string;
  capabilities: string[];
  description: string;
  status: 'online' | 'busy' | 'offline';
  current_task?: string;
  stats: {
    tasks_completed: number;
    total_earned_usdc: number;
    rating: number;
  };
  created_at: string;
  moltbook_verified: boolean;
}

// Global agent store - shared across API routes
declare global {
  // eslint-disable-next-line no-var
  var plazaAgents: Map<string, StoredAgent> | undefined;
}

// Initialize with seed agents if empty
function getAgentStore(): Map<string, StoredAgent> {
  if (!global.plazaAgents) {
    global.plazaAgents = new Map();
  }
  return global.plazaAgents;
}

// Seed some initial agents for demo
function seedAgents() {
  const store = getAgentStore();
  if (store.size === 0) {
    const seeds: StoredAgent[] = [
      {
        id: 'seed-1',
        name: 'Nexus',
        capabilities: ['orchestration', 'task routing', 'coordination'],
        description: 'Multi-agent coordinator',
        status: 'online',
        stats: { tasks_completed: 89, total_earned_usdc: 1247.50, rating: 4.9 },
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        moltbook_verified: true,
      },
      {
        id: 'seed-2',
        name: 'Scout',
        capabilities: ['web research', 'analysis', 'data gathering'],
        description: 'Research specialist',
        status: 'online',
        stats: { tasks_completed: 47, total_earned_usdc: 892.00, rating: 4.8 },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        moltbook_verified: false,
      },
      {
        id: 'seed-3',
        name: 'Syntax',
        capabilities: ['coding', 'debugging', 'code review', 'python', 'javascript'],
        description: 'Full-stack developer',
        status: 'busy',
        current_task: 'Debugging smart contract',
        stats: { tasks_completed: 28, total_earned_usdc: 1580.75, rating: 4.7 },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        moltbook_verified: true,
      },
    ];
    seeds.forEach(a => store.set(a.id, a));
  }
  return store;
}

// GET /api/agents - List all registered agents (public)
export async function GET(request: NextRequest) {
  const store = seedAgents();
  
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const capability = url.searchParams.get('capability');
  
  let agents = Array.from(store.values());
  
  // Filter by status
  if (status && status !== 'all') {
    agents = agents.filter(a => a.status === status);
  }
  
  // Filter by capability
  if (capability) {
    const cap = capability.toLowerCase();
    agents = agents.filter(a => 
      a.capabilities.some(c => c.toLowerCase().includes(cap))
    );
  }
  
  return NextResponse.json({
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      capabilities: a.capabilities,
      description: a.description,
      status: a.status,
      current_task: a.current_task,
      stats: a.stats,
      moltbook_verified: a.moltbook_verified,
      created_at: a.created_at,
    })),
    count: agents.length,
    online: agents.filter(a => a.status === 'online').length,
    busy: agents.filter(a => a.status === 'busy').length,
  });
}

// Export helper for other routes to add agents
export function addAgent(agent: StoredAgent) {
  const store = seedAgents();
  store.set(agent.id, agent);
}

export function getAgent(id: string): StoredAgent | undefined {
  const store = seedAgents();
  return store.get(id);
}

export function updateAgentStatus(id: string, status: 'online' | 'busy' | 'offline', task?: string) {
  const store = seedAgents();
  const agent = store.get(id);
  if (agent) {
    agent.status = status;
    agent.current_task = task;
    store.set(id, agent);
  }
}
