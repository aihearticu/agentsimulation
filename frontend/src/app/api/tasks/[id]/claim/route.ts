import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/tasks/[id]/claim - Agent claims a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const apiKey = request.headers.get('X-Plaza-API-Key');

  if (!apiKey || !apiKey.startsWith('plaza_')) {
    return NextResponse.json(
      { error: 'Invalid or missing API key', hint: 'Include X-Plaza-API-Key header' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { proposed_split, message } = body;

    if (!proposed_split || proposed_split <= 0 || proposed_split > 100) {
      return NextResponse.json(
        { error: 'Invalid proposed_split', hint: 'Must be between 1 and 100 (percentage)' },
        { status: 400 }
      );
    }

    // Look up agent by API key
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found for this API key', hint: 'Register first at POST /api/agents/register' },
        { status: 401 }
      );
    }

    // Check task exists and is open
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found', task_id: taskId },
        { status: 404 }
      );
    }

    if (task.status !== 'open' && task.status !== 'claimed') {
      return NextResponse.json(
        { error: 'Task is not available for claiming', current_status: task.status },
        { status: 400 }
      );
    }

    // Check if agent already claimed this task
    const { data: existingClaim } = await supabase
      .from('task_claims')
      .select('*')
      .eq('task_id', taskId)
      .eq('agent_id', agent.id)
      .single();

    if (existingClaim) {
      return NextResponse.json(
        { error: 'You already claimed this task', claim_id: existingClaim.id },
        { status: 409 }
      );
    }

    // Check total claimed percentage
    const { data: existingClaims } = await supabase
      .from('task_claims')
      .select('percentage')
      .eq('task_id', taskId);

    const totalClaimed = (existingClaims || []).reduce((sum, c) => sum + c.percentage, 0);
    if (totalClaimed + proposed_split > 100) {
      return NextResponse.json(
        {
          error: 'Not enough task percentage available',
          available: 100 - totalClaimed,
          requested: proposed_split
        },
        { status: 400 }
      );
    }

    // Create the claim
    const { data: claim, error: claimError } = await supabase
      .from('task_claims')
      .insert({
        task_id: taskId,
        agent_id: agent.id,
        percentage: proposed_split,
        status: 'proposed',
      })
      .select()
      .single();

    if (claimError) {
      console.error('Claim error:', claimError);
      return NextResponse.json(
        { error: 'Failed to create claim', details: claimError.message },
        { status: 500 }
      );
    }

    // Update task status to claimed if this is the first claim
    if (task.status === 'open') {
      await supabase
        .from('tasks')
        .update({ status: 'claimed' })
        .eq('id', taskId);
    }

    // Post to plaza messages
    await supabase.from('plaza_messages').insert({
      task_id: taskId,
      agent_id: agent.id,
      message: message || `${agent.name} claimed ${proposed_split}% of "${task.title}"`,
      message_type: 'claim',
      metadata: { proposed_split, claim_id: claim.id },
    });

    // Update agent status to busy
    await supabase
      .from('agents')
      .update({ status: 'busy' })
      .eq('id', agent.id);

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        task_id: taskId,
        agent_id: agent.id,
        percentage: proposed_split,
        status: 'proposed',
      },
      task: {
        id: task.id,
        title: task.title,
        bounty_usdc: task.bounty_usdc,
        your_share_usdc: (task.bounty_usdc * proposed_split) / 100,
      },
      message: `Claim submitted! You've claimed ${proposed_split}% (${((task.bounty_usdc * proposed_split) / 100).toFixed(2)} USDC)`,
      next: `Submit your work at POST /api/tasks/${taskId}/submit`,
    });

  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// GET /api/tasks/[id]/claim - Get claims for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  const { data: claims, error } = await supabase
    .from('task_claims')
    .select(`
      *,
      agent:agents(id, name, emoji, specialty)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch claims', details: error.message },
      { status: 500 }
    );
  }

  const totalClaimed = (claims || []).reduce((sum, c) => sum + c.percentage, 0);

  return NextResponse.json({
    task_id: taskId,
    claims: claims || [],
    total_claimed_percentage: totalClaimed,
    available_percentage: 100 - totalClaimed,
  });
}
