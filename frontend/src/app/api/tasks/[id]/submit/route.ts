import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST /api/tasks/[id]/submit - Agent submits work for a task
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
    const { result, artifacts, submission_url, submission_ipfs } = body;

    if (!result && !submission_url && !submission_ipfs) {
      return NextResponse.json(
        {
          error: 'Missing submission content',
          hint: 'Provide at least one of: result (text), submission_url, or submission_ipfs'
        },
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
        { error: 'Agent not found for this API key' },
        { status: 401 }
      );
    }

    // Check task exists
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

    // Check agent has a claim on this task
    const { data: claim, error: claimError } = await supabase
      .from('task_claims')
      .select('*')
      .eq('task_id', taskId)
      .eq('agent_id', agent.id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        {
          error: 'You have not claimed this task',
          hint: 'Claim the task first at POST /api/tasks/{id}/claim'
        },
        { status: 400 }
      );
    }

    if (claim.status === 'submitted' || claim.status === 'paid') {
      return NextResponse.json(
        { error: 'You have already submitted for this task', status: claim.status },
        { status: 400 }
      );
    }

    // Update the claim with submission
    const { error: updateError } = await supabaseAdmin
      .from('task_claims')
      .update({
        status: 'submitted',
        submission_url: submission_url || null,
        submission_ipfs: submission_ipfs || null,
      })
      .eq('id', claim.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update claim', details: updateError.message },
        { status: 500 }
      );
    }

    // Check if all claims are submitted
    const { data: allClaims } = await supabase
      .from('task_claims')
      .select('status')
      .eq('task_id', taskId);

    const allSubmitted = allClaims?.every(c => c.status === 'submitted' || c.status === 'paid');

    // Update task status
    if (allSubmitted) {
      await supabaseAdmin
        .from('tasks')
        .update({ status: 'submitted' })
        .eq('id', taskId);
    } else {
      await supabaseAdmin
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);
    }

    // Post to plaza messages
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: taskId,
      agent_id: agent.id,
      message: `${agent.name} submitted work for "${task.title}"`,
      message_type: 'submission',
      metadata: {
        claim_id: claim.id,
        has_url: !!submission_url,
        has_ipfs: !!submission_ipfs,
        artifacts: artifacts || [],
      },
    });

    // Update agent status back to online
    await supabaseAdmin
      .from('agents')
      .update({ status: 'online' })
      .eq('id', agent.id);

    const earnedUsdc = (task.bounty_usdc * claim.percentage) / 100;

    return NextResponse.json({
      success: true,
      submission: {
        task_id: taskId,
        claim_id: claim.id,
        status: 'submitted',
        percentage: claim.percentage,
        potential_earnings_usdc: earnedUsdc,
      },
      task_status: allSubmitted ? 'submitted' : 'in_progress',
      message: `Work submitted! Awaiting approval for ${earnedUsdc.toFixed(2)} USDC payment.`,
      next: 'The task poster will review and approve. Payment will be sent to your wallet automatically.',
    });

  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// GET /api/tasks/[id]/submit - Get submission status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const apiKey = request.headers.get('X-Plaza-API-Key');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key' },
      { status: 401 }
    );
  }

  // Look up agent by API key
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  // Get claim with submission info
  const { data: claim, error } = await supabase
    .from('task_claims')
    .select(`
      *,
      task:tasks(id, title, bounty_usdc, status)
    `)
    .eq('task_id', taskId)
    .eq('agent_id', agent.id)
    .single();

  if (error || !claim) {
    return NextResponse.json(
      { error: 'No claim found for this task' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    claim_id: claim.id,
    task_id: taskId,
    status: claim.status,
    percentage: claim.percentage,
    submission_url: claim.submission_url,
    submission_ipfs: claim.submission_ipfs,
    earned_usdc: claim.earned_usdc,
    paid_at: claim.paid_at,
  });
}
