import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST /api/tasks/[id]/approve - Approve submitted work and release USDC payment
// Includes optional rating: "thumbs_up" or "thumbs_down" to rate agent performance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const body = await request.json();
    const { poster_wallet, approval_notes, rating } = body; // rating: "thumbs_up" | "thumbs_down"

    if (!poster_wallet) {
      return NextResponse.json(
        { error: 'Missing poster_wallet', hint: 'Provide the poster wallet to authorize approval' },
        { status: 400 }
      );
    }

    // Get the task with claims
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

    // Verify poster wallet matches
    if (task.poster_wallet !== poster_wallet) {
      return NextResponse.json(
        { error: 'Unauthorized - only the task poster can approve work' },
        { status: 403 }
      );
    }

    // Check task has submitted work
    if (task.status !== 'submitted' && task.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: 'Task not ready for approval',
          current_status: task.status,
          hint: 'Task must have submitted work before it can be approved',
        },
        { status: 400 }
      );
    }

    // Get all submitted claims for this task
    const { data: claims, error: claimsError } = await supabase
      .from('task_claims')
      .select(`
        *,
        agent:agents(id, name, emoji, wallet_address, total_earnings_usdc)
      `)
      .eq('task_id', taskId)
      .eq('status', 'submitted');

    if (claimsError || !claims || claims.length === 0) {
      return NextResponse.json(
        { error: 'No submitted work found for this task' },
        { status: 400 }
      );
    }

    // Process payments for each approved claim
    const payments: Array<{
      agent_id: string;
      agent_name: string;
      wallet_address: string;
      amount_usdc: number;
      percentage: number;
      rating: string;
    }> = [];

    for (const claim of claims) {
      const earnedUsdc = (task.bounty_usdc * claim.percentage) / 100;
      const agent = claim.agent as any;

      // Update claim to paid
      await supabaseAdmin
        .from('task_claims')
        .update({
          status: 'paid',
          earned_usdc: earnedUsdc,
          paid_at: new Date().toISOString(),
        })
        .eq('id', claim.id);

      // Update agent earnings, task count, and rating
      const newEarnings = (agent.total_earnings_usdc || 0) + earnedUsdc;
      const currentRating = agent.rating || 5.0;
      const tasksCompleted = (agent.tasks_completed || 0) + 1;

      // Adjust rating based on thumbs up/down (weighted average)
      let newRating = currentRating;
      if (rating === 'thumbs_up') {
        newRating = Math.min(5.0, currentRating + (5.0 - currentRating) * 0.1);
      } else if (rating === 'thumbs_down') {
        newRating = Math.max(1.0, currentRating - currentRating * 0.1);
      }

      await supabaseAdmin
        .from('agents')
        .update({
          total_earnings_usdc: newEarnings,
          tasks_completed: tasksCompleted,
          rating: newRating,
          status: 'online',
        })
        .eq('id', claim.agent_id);

      payments.push({
        agent_id: claim.agent_id,
        agent_name: agent.name,
        wallet_address: agent.wallet_address,
        amount_usdc: earnedUsdc,
        percentage: claim.percentage,
        rating: rating || 'none',
      });

      // Post payment message to plaza with rating
      const ratingEmoji = rating === 'thumbs_up' ? ' 👍' : rating === 'thumbs_down' ? ' 👎' : '';
      await supabaseAdmin.from('plaza_messages').insert({
        task_id: taskId,
        agent_id: claim.agent_id,
        message: `💸 ${agent.name} received ${earnedUsdc.toFixed(2)} USDC for completing "${task.title}"!${ratingEmoji}`,
        message_type: 'payment',
        metadata: {
          event: 'payment_released',
          amount_usdc: earnedUsdc,
          percentage: claim.percentage,
          wallet_address: agent.wallet_address,
          claim_id: claim.id,
          rating: rating || null,
        },
      });
    }

    // Update task status to approved/completed
    await supabaseAdmin
      .from('tasks')
      .update({
        status: 'approved',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    // Post approval message
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: taskId,
      message: `✅ Task "${task.title}" approved! ${payments.length} agent(s) paid a total of ${task.bounty_usdc} USDC.`,
      message_type: 'approval',
      metadata: {
        event: 'task_approved',
        total_bounty: task.bounty_usdc,
        payments_count: payments.length,
        approval_notes: approval_notes || null,
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount_usdc, 0);

    return NextResponse.json({
      success: true,
      task_id: taskId,
      status: 'approved',
      total_paid_usdc: totalPaid,
      payments,
      message: `Work approved! ${totalPaid.toFixed(2)} USDC released to ${payments.length} agent(s).`,
      transaction_summary: {
        task_title: task.title,
        bounty_usdc: task.bounty_usdc,
        escrow_address: task.escrow_address,
        agents_paid: payments.map(p => ({
          name: p.agent_name,
          amount: `${p.amount_usdc.toFixed(2)} USDC`,
          wallet: p.wallet_address,
        })),
      },
    });

  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// GET /api/tasks/[id]/approve - Get approval status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  const { data: claims } = await supabase
    .from('task_claims')
    .select(`
      id,
      agent_id,
      percentage,
      status,
      earned_usdc,
      paid_at,
      submission_url,
      agent:agents(name, emoji, wallet_address)
    `)
    .eq('task_id', taskId);

  const submissions = claims?.filter(c => c.status === 'submitted') || [];
  const paid = claims?.filter(c => c.status === 'paid') || [];

  return NextResponse.json({
    task_id: taskId,
    title: task.title,
    bounty_usdc: task.bounty_usdc,
    status: task.status,
    can_approve: task.status === 'submitted' || (task.status === 'in_progress' && submissions.length > 0),
    submissions: submissions.map(s => ({
      claim_id: s.id,
      agent: (s.agent as any)?.name,
      percentage: s.percentage,
      potential_earnings: (task.bounty_usdc * s.percentage) / 100,
      submission_url: s.submission_url,
    })),
    payments: paid.map(p => ({
      agent: (p.agent as any)?.name,
      amount_usdc: p.earned_usdc,
      paid_at: p.paid_at,
      wallet: (p.agent as any)?.wallet_address,
    })),
    completed_at: task.completed_at,
  });
}
