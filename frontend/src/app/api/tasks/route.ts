import { NextRequest, NextResponse } from 'next/server';

interface Task {
  id: string;
  title: string;
  description: string;
  required_capabilities: string[];
  bounty_usdc: number;
  status: 'open' | 'claimed' | 'in_progress' | 'completed';
  created_at: string;
  deadline: string;
  claimed_by?: string;
  claims: Array<{
    agent_id: string;
    agent_name: string;
    proposed_split: number;
    message: string;
  }>;
}

// Demo tasks
const tasks: Map<string, Task> = new Map([
  ['task-001', {
    id: 'task-001',
    title: 'Research AI Agent Frameworks',
    description: 'Compare and analyze the top 5 AI agent frameworks (LangGraph, CrewAI, AutoGen, Swarm, Solana Agent Kit). Provide pros/cons and use cases for each.',
    required_capabilities: ['research', 'analysis', 'writing'],
    bounty_usdc: 25,
    status: 'open',
    created_at: new Date().toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    claims: [],
  }],
  ['task-002', {
    id: 'task-002',
    title: 'Debug Smart Contract',
    description: 'Review and fix a Solidity smart contract with a reentrancy vulnerability. Provide fixed code and explanation.',
    required_capabilities: ['solidity', 'smart contracts', 'security'],
    bounty_usdc: 50,
    status: 'open',
    created_at: new Date().toISOString(),
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    claims: [],
  }],
  ['task-003', {
    id: 'task-003',
    title: 'Write Blog Post About USDC',
    description: 'Create an engaging 1500-word blog post explaining USDC, its benefits, and use cases for developers. Target audience: Web3 newcomers.',
    required_capabilities: ['writing', 'crypto', 'content'],
    bounty_usdc: 15,
    status: 'open',
    created_at: new Date().toISOString(),
    deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    claims: [],
  }],
  ['task-004', {
    id: 'task-004',
    title: 'Translate Docs to Spanish',
    description: 'Translate our developer documentation (5 pages) from English to Spanish. Must be native-level quality.',
    required_capabilities: ['translation', 'spanish', 'technical writing'],
    bounty_usdc: 20,
    status: 'open',
    created_at: new Date().toISOString(),
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    claims: [],
  }],
]);

// Simple API key validation (in production, check against Supabase)
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('plaza_');
}

// GET /api/tasks - List available tasks
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');
  
  // Allow unauthenticated browsing but mark it
  const authenticated = validateApiKey(apiKey);
  
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'open';
  const capability = url.searchParams.get('capability');
  
  let filteredTasks = Array.from(tasks.values());
  
  // Filter by status
  if (status !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === status);
  }
  
  // Filter by capability match
  if (capability) {
    const caps = capability.toLowerCase().split(',');
    filteredTasks = filteredTasks.filter(t => 
      t.required_capabilities.some(rc => 
        caps.some(c => rc.toLowerCase().includes(c))
      )
    );
  }
  
  return NextResponse.json({
    tasks: filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      required_capabilities: t.required_capabilities,
      bounty_usdc: t.bounty_usdc,
      status: t.status,
      deadline: t.deadline,
      claims_count: t.claims.length,
    })),
    count: filteredTasks.length,
    authenticated,
    hint: !authenticated ? 'Add X-Plaza-API-Key header to claim tasks' : undefined,
  });
}

// POST /api/tasks - Create a new task (requires API key)
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');
  
  if (!validateApiKey(apiKey)) {
    return NextResponse.json(
      { error: 'Invalid or missing API key', hint: 'Include X-Plaza-API-Key header' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    
    if (!body.title || !body.description || !body.bounty_usdc) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, bounty_usdc' },
        { status: 400 }
      );
    }
    
    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      title: body.title,
      description: body.description,
      required_capabilities: body.required_capabilities || [],
      bounty_usdc: body.bounty_usdc,
      status: 'open',
      created_at: new Date().toISOString(),
      deadline: body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      claims: [],
    };
    
    tasks.set(taskId, newTask);
    
    return NextResponse.json({
      success: true,
      task: newTask,
      message: 'Task created! Agents will start claiming soon.',
    });
    
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
