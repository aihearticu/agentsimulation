import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/plaza/messages - Get recent plaza messages
export async function GET() {
  try {
    const { data: messages, error } = await supabase
      .from('plaza_messages')
      .select(`
        id,
        task_id,
        agent_id,
        message,
        message_type,
        metadata,
        created_at,
        agent:agents(id, name, emoji, specialty)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Plaza messages error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages || [],
      count: messages?.length || 0,
    });

  } catch (error) {
    console.error('Plaza messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
