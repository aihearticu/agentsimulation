import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, getAgentByApiKey, createTask, getTasksWithClaims } from '@/lib/supabase';

// GET /api/tasks - List available tasks
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');

  // Allow unauthenticated browsing but mark it
  const authenticated = apiKey ? apiKey.startsWith('plaza_') : false;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'open';
  const capability = url.searchParams.get('capability');

  try {
    const tasks = await getTasksWithClaims(status);

    let filteredTasks = tasks || [];

    // Filter by capability match
    if (capability) {
      const caps = capability.toLowerCase().split(',');
      filteredTasks = filteredTasks.filter(t =>
        (t.requirements || []).some((req: string) =>
          caps.some(c => req.toLowerCase().includes(c))
        )
      );
    }

    return NextResponse.json({
      tasks: filteredTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        required_capabilities: t.requirements || [],
        bounty_usdc: t.bounty_usdc,
        status: t.status,
        poster_wallet: t.poster_wallet,
        deadline: t.deadline,
        claims_count: (t.claims || []).length,
        claims: (t.claims || []).map((c: any) => ({
          id: c.id,
          agent_id: c.agent_id,
          percentage: c.percentage,
          status: c.status,
          submission_url: c.submission_url,
          agent: c.agent ? {
            name: c.agent.name,
            emoji: c.agent.emoji,
          } : null,
        })),
        created_at: t.created_at,
      })),
      count: filteredTasks.length,
      authenticated,
      hint: !authenticated ? 'Add X-Plaza-API-Key header to claim tasks' : undefined,
    });
  } catch (error: any) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');

  // For demo, allow task creation without API key but with wallet
  // In production, could require authentication

  try {
    const body = await request.json();

    if (!body.title || !body.description || !body.bounty_usdc) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, bounty_usdc' },
        { status: 400 }
      );
    }

    if (!body.poster_wallet) {
      return NextResponse.json(
        { error: 'Missing required field: poster_wallet', hint: 'Provide your wallet address for escrow' },
        { status: 400 }
      );
    }

    if (body.bounty_usdc <= 0) {
      return NextResponse.json(
        { error: 'Bounty must be greater than 0' },
        { status: 400 }
      );
    }

    const task = await createTask({
      title: body.title,
      description: body.description,
      requirements: body.required_capabilities || body.requirements || [],
      bounty_usdc: body.bounty_usdc,
      poster_wallet: body.poster_wallet,
      deadline: body.deadline,
    });

    // Post to plaza messages
    await supabaseAdmin.from('plaza_messages').insert({
      task_id: task.id,
      message: `New task posted: "${task.title}" - ${task.bounty_usdc} USDC bounty!`,
      message_type: 'system',
      metadata: { event: 'task_created', bounty_usdc: task.bounty_usdc },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        required_capabilities: task.requirements,
        bounty_usdc: task.bounty_usdc,
        status: task.status,
        deadline: task.deadline,
        created_at: task.created_at,
      },
      message: 'Task created! Agents will start claiming soon.',
      endpoints: {
        view: `GET /api/tasks?status=all`,
        claims: `GET /api/tasks/${task.id}/claim`,
      },
    });

  } catch (error: any) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    );
  }
}
