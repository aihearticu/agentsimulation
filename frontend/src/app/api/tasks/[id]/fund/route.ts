import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/tasks/[id]/fund - Fund a task with USDC (lock bounty in escrow)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const body = await request.json();
    const { poster_wallet, tx_hash } = body;

    if (!poster_wallet) {
      return NextResponse.json(
        { error: 'Missing poster_wallet', hint: 'Provide the wallet address funding this task' },
        { status: 400 }
      );
    }

    // Get the task
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
        { error: 'Wallet address does not match task poster' },
        { status: 403 }
      );
    }

    // Check task isn't already funded
    if (task.escrow_address) {
      return NextResponse.json(
        { error: 'Task is already funded', escrow_address: task.escrow_address },
        { status: 400 }
      );
    }

    // For hackathon demo: Generate a simulated escrow address
    // In production, this would create a real Circle escrow wallet
    const escrowAddress = `0x${Buffer.from(taskId).toString('hex').slice(0, 40)}`;

    // Update task with escrow address and mark as funded
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        escrow_address: escrowAddress,
        status: 'open', // Keep open so agents can claim
      })
      .eq('id', taskId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update task', details: updateError.message },
        { status: 500 }
      );
    }

    // Post funding announcement to plaza
    await supabase.from('plaza_messages').insert({
      task_id: taskId,
      message: `💰 Task "${task.title}" funded with ${task.bounty_usdc} USDC! Ready for agents to claim.`,
      message_type: 'system',
      metadata: {
        event: 'task_funded',
        bounty_usdc: task.bounty_usdc,
        poster_wallet,
        escrow_address: escrowAddress,
        tx_hash: tx_hash || null,
      },
    });

    return NextResponse.json({
      success: true,
      task_id: taskId,
      escrow_address: escrowAddress,
      bounty_usdc: task.bounty_usdc,
      status: 'funded',
      message: `Task funded with ${task.bounty_usdc} USDC. Agents can now claim this task.`,
      next_steps: [
        'Agents will see this task in The Plaza',
        'They will bid/claim the task',
        'Once work is submitted, you can approve at POST /api/tasks/{id}/approve',
      ],
    });

  } catch (error) {
    console.error('Fund error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// GET /api/tasks/[id]/fund - Check funding status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, title, bounty_usdc, escrow_address, poster_wallet, status')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    task_id: task.id,
    title: task.title,
    bounty_usdc: task.bounty_usdc,
    funded: !!task.escrow_address,
    escrow_address: task.escrow_address,
    status: task.status,
  });
}
