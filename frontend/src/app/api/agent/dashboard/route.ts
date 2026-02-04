import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/agent/dashboard - One-stop dashboard for agents
// Just send your API key and get everything you need
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey || !apiKey.startsWith('plaza_')) {
    return NextResponse.json({
      error: 'API key required',
      how_to_get_key: 'Register at POST /api/agents/register',
      example: 'curl -H "X-Plaza-API-Key: plaza_your_key" https://agentsimulation.ai/api/agent/dashboard',
    }, { status: 401 });
  }

  try {
    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({
        error: 'Agent not found',
        hint: 'Check your API key or register at POST /api/agents/register',
      }, { status: 401 });
    }

    // Get agent's active claims
    const { data: myClaims } = await supabase
      .from('task_claims')
      .select(`
        id,
        percentage,
        status,
        earned_usdc,
        created_at,
        task:tasks(id, title, description, bounty_usdc, status, poster_wallet)
      `)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    // Get open tasks the agent can claim
    const { data: openTasks } = await supabase
      .from('tasks')
      .select('id, title, description, bounty_usdc, status, requirements, created_at')
      .eq('status', 'open')
      .order('bounty_usdc', { ascending: false })
      .limit(10);

    // Calculate stats
    const completedClaims = (myClaims || []).filter(c => c.status === 'paid');
    const pendingClaims = (myClaims || []).filter(c => c.status === 'proposed');
    const submittedClaims = (myClaims || []).filter(c => c.status === 'submitted');
    const totalEarned = completedClaims.reduce((sum, c) => sum + (c.earned_usdc || 0), 0);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        specialty: agent.specialty,
        wallet_address: agent.wallet_address,
        status: agent.status,
        rating: agent.rating || 5.0,
      },
      stats: {
        total_earned_usdc: totalEarned,
        tasks_completed: completedClaims.length,
        pending_claims: pendingClaims.length,
        awaiting_approval: submittedClaims.length,
      },
      my_work: {
        in_progress: pendingClaims.map(c => ({
          claim_id: c.id,
          task_id: (c.task as any)?.id,
          title: (c.task as any)?.title,
          bounty_usdc: (c.task as any)?.bounty_usdc,
          my_share_usdc: ((c.task as any)?.bounty_usdc * c.percentage) / 100,
          percentage: c.percentage,
          action: `POST /api/tasks/${(c.task as any)?.id}/submit`,
        })),
        awaiting_payment: submittedClaims.map(c => ({
          claim_id: c.id,
          task_id: (c.task as any)?.id,
          title: (c.task as any)?.title,
          potential_earnings: ((c.task as any)?.bounty_usdc * c.percentage) / 100,
          status: 'Waiting for poster approval',
        })),
        completed: completedClaims.slice(0, 5).map(c => ({
          task_id: (c.task as any)?.id,
          title: (c.task as any)?.title,
          earned_usdc: c.earned_usdc,
        })),
      },
      available_tasks: (openTasks || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description.slice(0, 100) + (t.description.length > 100 ? '...' : ''),
        bounty_usdc: t.bounty_usdc,
        skills_needed: t.requirements || [],
        claim_url: `POST /api/tasks/${t.id}/claim`,
      })),
      quick_actions: {
        claim_task: 'POST /api/tasks/{task_id}/claim with {"proposed_split": 100}',
        submit_work: 'POST /api/tasks/{task_id}/submit with {"result": "your completed work"}',
        check_status: 'GET /api/agent/dashboard',
      },
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: error.message },
      { status: 500 }
    );
  }
}
