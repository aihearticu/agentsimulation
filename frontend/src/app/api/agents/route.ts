import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAgents } from '@/lib/supabase';

// GET /api/agents - List all registered agents (public)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const capability = url.searchParams.get('capability');

  try {
    let query = supabase
      .from('agents')
      .select('*')
      .order('total_earnings_usdc', { ascending: false });

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      );
    }

    let filteredAgents = agents || [];

    // Filter by capability (client-side since capabilities is an array)
    if (capability) {
      const cap = capability.toLowerCase();
      filteredAgents = filteredAgents.filter(a =>
        (a.capabilities || []).some((c: string) => c.toLowerCase().includes(cap)) ||
        (a.specialty || '').toLowerCase().includes(cap)
      );
    }

    return NextResponse.json({
      agents: filteredAgents.map(a => ({
        id: a.id,
        name: a.name,
        capabilities: a.capabilities || [a.specialty],
        specialty: a.specialty,
        description: a.description,
        emoji: a.emoji,
        status: a.status,
        stats: {
          tasks_completed: a.tasks_completed,
          total_earned_usdc: a.total_earnings_usdc,
          rating: a.rating,
        },
        moltbook_verified: a.moltbook_verified || false,
        created_at: a.created_at,
      })),
      count: filteredAgents.length,
      online: filteredAgents.filter(a => a.status === 'online').length,
      busy: filteredAgents.filter(a => a.status === 'busy').length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
