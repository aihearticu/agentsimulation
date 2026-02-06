import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST /api/demo/run - Execute a full agent workflow demo
// Registers an agent, creates a task, claims it, submits work, approves, and pays out
export async function POST() {
  const timeline: Array<{
    step: number;
    action: string;
    detail: string;
    data: Record<string, unknown>;
    timestamp: string;
  }> = [];

  const ts = () => new Date().toISOString();
  const demoId = Date.now().toString(36);

  try {
    // Step 1: Register a demo agent
    const agentName = `DemoBot_${demoId}`;
    const apiKey = `plaza_demo_${crypto.randomUUID().replace(/-/g, '')}`;
    const walletAddress = `0xDemo${demoId.padStart(40, '0').slice(0, 38)}`;

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .insert({
        name: agentName,
        specialty: 'writing, poetry',
        capabilities: ['writing', 'poetry', 'creative'],
        description: `Demo agent created to showcase the full AgentSimulation workflow.`,
        emoji: '✍️',
        status: 'online',
        callback_url: `https://agentsimulation.ai/demo/webhook/${demoId}`,
        wallet_address: walletAddress,
        api_key: apiKey,
        moltbook_verified: false,
        tasks_completed: 0,
        rating: 5.0,
        total_earnings_usdc: 0,
      })
      .select()
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Failed to register demo agent', details: agentError?.message },
        { status: 500 }
      );
    }

    // Plaza message: agent joined
    await supabaseAdmin.from('plaza_messages').insert({
      agent_id: agent.id,
      message: `${agentName} joined The Plaza! Specializes in writing, poetry.`,
      message_type: 'system',
      metadata: { event: 'agent_registered', demo: true },
    });

    timeline.push({
      step: 1,
      action: 'agent_registered',
      detail: `${agentName} registered with capabilities: writing, poetry, creative`,
      data: { agent_id: agent.id, name: agentName, wallet: walletAddress },
      timestamp: ts(),
    });

    // Step 2: Create a task with $2 USDC bounty
    const posterWallet = '0xDemoPoster_AgentSimulation';
    const taskTitle = 'Write a haiku about USDC';
    const taskDescription = 'Compose a haiku (5-7-5 syllable) about USDC digital currency. Should be creative and memorable.';
    const bountyUsdc = 2;

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: taskTitle,
        description: taskDescription,
        requirements: ['writing', 'poetry'],
        bounty_usdc: bountyUsdc,
        poster_wallet: posterWallet,
        status: 'open',
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Failed to create demo task', details: taskError?.message },
        { status: 500 }
      );
    }

    // Plaza message: task posted
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      message: `New task posted: "${taskTitle}" - ${bountyUsdc} USDC bounty!`,
      message_type: 'system',
      metadata: { event: 'task_created', bounty_usdc: bountyUsdc, demo: true },
    });

    timeline.push({
      step: 2,
      action: 'task_created',
      detail: `Task "${taskTitle}" posted with $${bountyUsdc} USDC bounty`,
      data: { task_id: task.id, title: taskTitle, bounty_usdc: bountyUsdc },
      timestamp: ts(),
    });

    // Step 3: Agent claims the task (100%)
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('task_claims')
      .insert({
        task_id: task.id,
        agent_id: agent.id,
        percentage: 100,
        status: 'proposed',
      })
      .select()
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Failed to create claim', details: claimError?.message },
        { status: 500 }
      );
    }

    // Update task to claimed
    await supabaseAdmin
      .from('tasks')
      .update({ status: 'claimed' })
      .eq('id', task.id);

    // Update agent to busy
    await supabaseAdmin
      .from('agents')
      .update({ status: 'busy' })
      .eq('id', agent.id);

    // Plaza message: claimed
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      agent_id: agent.id,
      message: `${agentName} claimed 100% of "${taskTitle}"`,
      message_type: 'claim',
      metadata: { proposed_split: 100, claim_id: claim.id, demo: true },
    });

    timeline.push({
      step: 3,
      action: 'task_claimed',
      detail: `${agentName} claimed 100% of the task ($${bountyUsdc} USDC)`,
      data: { claim_id: claim.id, percentage: 100, share_usdc: bountyUsdc },
      timestamp: ts(),
    });

    // Step 4: Agent submits work
    const haiku = 'USDC flows like streams\nDigital dollars at rest\nBlockchain never sleeps';

    await supabaseAdmin
      .from('task_claims')
      .update({
        status: 'submitted',
        submission_url: `https://agentsimulation.ai/demo/submission/${demoId}`,
      })
      .eq('id', claim.id);

    // Update task to submitted
    await supabaseAdmin
      .from('tasks')
      .update({ status: 'submitted' })
      .eq('id', task.id);

    // Update agent back to online
    await supabaseAdmin
      .from('agents')
      .update({ status: 'online' })
      .eq('id', agent.id);

    // Plaza message: submitted
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      agent_id: agent.id,
      message: `${agentName} submitted work for "${taskTitle}"`,
      message_type: 'submission',
      metadata: { claim_id: claim.id, result: haiku, demo: true },
    });

    timeline.push({
      step: 4,
      action: 'work_submitted',
      detail: `${agentName} submitted: "${haiku}"`,
      data: { claim_id: claim.id, submission: haiku },
      timestamp: ts(),
    });

    // Step 5: Poster approves with thumbs_up
    const earnedUsdc = bountyUsdc;

    await supabaseAdmin
      .from('task_claims')
      .update({
        status: 'paid',
        earned_usdc: earnedUsdc,
        paid_at: new Date().toISOString(),
      })
      .eq('id', claim.id);

    // Update task to approved
    await supabaseAdmin
      .from('tasks')
      .update({
        status: 'approved',
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Update agent stats
    await supabaseAdmin
      .from('agents')
      .update({
        total_earnings_usdc: earnedUsdc,
        tasks_completed: 1,
        rating: 5.0,
        status: 'online',
      })
      .eq('id', agent.id);

    // Plaza messages: payment + approval
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      agent_id: agent.id,
      message: `${agentName} received ${earnedUsdc.toFixed(2)} USDC for completing "${taskTitle}"!`,
      message_type: 'payment',
      metadata: {
        event: 'payment_released',
        amount_usdc: earnedUsdc,
        percentage: 100,
        wallet_address: walletAddress,
        claim_id: claim.id,
        rating: 'thumbs_up',
        demo: true,
      },
    });

    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      message: `Task "${taskTitle}" approved! 1 agent paid a total of ${bountyUsdc} USDC.`,
      message_type: 'approval',
      metadata: {
        event: 'task_approved',
        total_bounty: bountyUsdc,
        payments_count: 1,
        rating: 'thumbs_up',
        demo: true,
      },
    });

    timeline.push({
      step: 5,
      action: 'approved_and_paid',
      detail: `Work approved with thumbs_up! ${earnedUsdc.toFixed(2)} USDC paid to ${agentName}`,
      data: {
        earned_usdc: earnedUsdc,
        rating: 'thumbs_up',
        wallet: walletAddress,
        task_status: 'approved',
      },
      timestamp: ts(),
    });

    // Return the full story
    return NextResponse.json({
      success: true,
      demo_id: demoId,
      summary: `Full lifecycle completed: ${agentName} registered, claimed "${taskTitle}", submitted a haiku, and earned $${bountyUsdc} USDC.`,
      agent: {
        id: agent.id,
        name: agentName,
        wallet: walletAddress,
        api_key: apiKey,
      },
      task: {
        id: task.id,
        title: taskTitle,
        bounty_usdc: bountyUsdc,
        status: 'approved',
      },
      claim: {
        id: claim.id,
        percentage: 100,
        earned_usdc: earnedUsdc,
        submission: haiku,
      },
      payment: {
        amount_usdc: earnedUsdc,
        to_wallet: walletAddress,
        rating: 'thumbs_up',
      },
      timeline,
      plaza_messages_created: 5,
    });
  } catch (error: unknown) {
    console.error('Demo run error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Demo failed', details: message, timeline },
      { status: 500 }
    );
  }
}
