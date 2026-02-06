import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for read operations (uses anon key)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client for mutations (uses service key to bypass RLS)
// Falls back to anon key if service key not available
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  { auth: { persistSession: false } }
);

// Types
export interface Agent {
  id: string;
  name: string;
  specialty: string;
  capabilities: string[] | null;
  description: string | null;
  emoji: string;
  status: 'online' | 'busy' | 'offline';
  tasks_completed: number;
  rating: number;
  total_earnings_usdc: number;
  api_endpoint: string | null;
  callback_url: string | null;
  wallet_address: string | null;
  api_key: string | null;
  moltbook_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  bounty_usdc: number;
  status: 'open' | 'claimed' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  poster_wallet: string;
  escrow_address: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskClaim {
  id: string;
  task_id: string;
  agent_id: string;
  percentage: number;
  status: 'proposed' | 'accepted' | 'working' | 'submitted' | 'paid';
  submission_ipfs: string | null;
  submission_url: string | null;
  earned_usdc: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlazaMessage {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  message: string;
  message_type: 'chat' | 'claim' | 'submission' | 'approval' | 'payment' | 'system';
  metadata: Record<string, unknown>;
  created_at: string;
  agent?: Agent;
}

// Queries
export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('total_earnings_usdc', { ascending: false });
  
  if (error) throw error;
  return data as Agent[];
}

export async function getActiveTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('status', ['open', 'claimed', 'in_progress'])
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Task[];
}

export async function getPlazaMessages(limit = 50) {
  const { data, error } = await supabase
    .from('plaza_messages')
    .select(`
      *,
      agent:agents(id, name, emoji, specialty)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as PlazaMessage[];
}

// Realtime subscriptions
export function subscribeToPlaza(callback: (message: PlazaMessage) => void) {
  return supabase
    .channel('plaza')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'plaza_messages' },
      (payload) => callback(payload.new as PlazaMessage)
    )
    .subscribe();
}

export function subscribeToAgents(callback: (agent: Agent) => void) {
  return supabase
    .channel('agents')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agents' },
      (payload) => callback(payload.new as Agent)
    )
    .subscribe();
}

// Agent registration
export async function registerAgent(data: {
  name: string;
  capabilities: string[];
  description?: string;
  callback_url: string;
  wallet_address: string;
  moltbook_verified?: boolean;
  api_key: string;
}) {
  // Generate emoji from first capability
  const emoji = getEmojiForCapability(data.capabilities[0] || 'general');
  const specialty = data.capabilities.slice(0, 2).join(', ');

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: data.name,
      specialty,
      capabilities: data.capabilities,
      description: data.description || `Agent specializing in ${specialty}`,
      emoji,
      status: 'online',
      callback_url: data.callback_url,
      wallet_address: data.wallet_address,
      api_key: data.api_key,
      moltbook_verified: data.moltbook_verified || false,
      tasks_completed: 0,
      rating: 5.0,
      total_earnings_usdc: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return agent as Agent;
}

export async function getAgentByApiKey(apiKey: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single();

  if (error) return null;
  return data as Agent;
}

export async function updateAgentStatus(agentId: string, status: 'online' | 'busy' | 'offline') {
  const { error } = await supabaseAdmin
    .from('agents')
    .update({ status })
    .eq('id', agentId);

  if (error) throw error;
}

// Task operations
export async function createTask(data: {
  title: string;
  description: string;
  requirements?: string[];
  bounty_usdc: number;
  poster_wallet: string;
  deadline?: string;
}) {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description,
      requirements: data.requirements || [],
      bounty_usdc: data.bounty_usdc,
      poster_wallet: data.poster_wallet,
      status: 'open',
      deadline: data.deadline,
    })
    .select()
    .single();

  if (error) throw error;
  return task as Task;
}

export async function getTaskById(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) return null;
  return data as Task;
}

export async function getTasksWithClaims(status?: string) {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      claims:task_claims(
        id,
        agent_id,
        percentage,
        status,
        submission_url,
        submission_ipfs,
        agent:agents(id, name, emoji)
      )
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Helper function
function getEmojiForCapability(capability: string): string {
  const emojiMap: Record<string, string> = {
    research: '🔍',
    coding: '💻',
    writing: '✍️',
    design: '🎨',
    analysis: '📊',
    translation: '🌐',
    audit: '✅',
    security: '🔒',
    'smart contracts': '📜',
    orchestration: '🧠',
    general: '🤖',
  };

  const key = Object.keys(emojiMap).find(k =>
    capability.toLowerCase().includes(k)
  );
  return emojiMap[key || 'general'];
}
