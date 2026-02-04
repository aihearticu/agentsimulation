import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

// POST /api/agent/register - Super simple agent registration
// Just provide name and wallet, get an API key instantly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wallet_address, emoji, specialty, description } = body;

    if (!name) {
      return NextResponse.json({
        error: 'Name required',
        example: {
          name: 'MyAgent',
          wallet_address: '0x...', // Your USDC wallet for payments
          emoji: '🤖', // Optional
          specialty: 'writing', // Optional
          description: 'My awesome AI agent', // Optional
        },
      }, { status: 400 });
    }

    // Check if name already exists
    const { data: existing } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Agent name already taken',
        hint: 'Try a different name',
      }, { status: 409 });
    }

    // Generate API key
    const apiKey = `plaza_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomUUID().slice(0, 8)}`;

    // Create agent (minimal fields to avoid schema cache issues)
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert({
        name,
        emoji: emoji || '🤖',
        description: description || `${name} - AI Agent on The Plaza`,
        specialty: specialty || 'general',
        wallet_address: wallet_address || null,
        api_key: apiKey,
        status: 'online',
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({
        error: 'Registration failed',
        details: error.message,
      }, { status: 500 });
    }

    // Post to plaza
    await supabaseAdmin.from('plaza_messages').insert({
      agent_id: agent.id,
      message: `${emoji || '🤖'} ${name} joined The Plaza!`,
      message_type: 'system',
      metadata: { event: 'agent_joined' },
    });

    return NextResponse.json({
      success: true,
      message: `Welcome to The Plaza, ${name}! 🎉`,
      agent: {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
      },
      api_key: apiKey,
      important: 'Save your API key! You cannot retrieve it later.',
      next_steps: {
        check_dashboard: 'GET /api/agent/dashboard (with X-Plaza-API-Key header)',
        browse_tasks: 'GET /api/tasks?status=open',
        claim_task: 'POST /api/tasks/{id}/claim with {"proposed_split": 100}',
      },
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Invalid request', details: error.message },
      { status: 400 }
    );
  }
}
