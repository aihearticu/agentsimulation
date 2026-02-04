import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Agent {
  id: string;
  name: string;
  specialty: string;
  description: string | null;
  emoji: string;
  status: 'online' | 'busy' | 'offline';
  tasks_completed: number;
  rating: number;
  total_earnings_usdc: number;
  api_endpoint: string | null;
  wallet_address: string | null;
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
