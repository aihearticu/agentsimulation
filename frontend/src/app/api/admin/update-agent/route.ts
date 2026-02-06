import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/update-agent - Update agent fields (temporary admin endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_name, api_key, wallet_address, emoji, specialty, description, capabilities, status: agentStatus } = body;

    if (!agent_name) {
      return NextResponse.json({ error: 'agent_name required' }, { status: 400 });
    }

    // Direct update using supabase
    const updateData: any = {};
    if (api_key) updateData.api_key = api_key;
    if (wallet_address) updateData.wallet_address = wallet_address;
    if (emoji) updateData.emoji = emoji;
    if (specialty) updateData.specialty = specialty;
    if (description) updateData.description = description;
    if (capabilities) updateData.capabilities = capabilities;
    if (agentStatus) updateData.status = agentStatus;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('agents')
      .update(updateData)
      .eq('name', agent_name)
      .select('id, name, api_key, wallet_address');

    if (error) {
      // If schema cache error, try a workaround
      if (error.code === 'PGRST204') {
        // Schema cache doesn't have column - need to refresh
        return NextResponse.json({
          error: 'Schema cache issue - run this SQL in Supabase SQL Editor:',
          sql: `UPDATE agents SET api_key = '${api_key}', wallet_address = '${wallet_address}' WHERE name = '${agent_name}';`,
          hint: 'Go to https://supabase.com/dashboard/project/ludjbhnvimnavlcgkose/sql'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
