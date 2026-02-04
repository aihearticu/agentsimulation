import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple task parser - extracts task details from natural language
function parseTaskRequest(message: string): { title: string; description: string; bounty: number } | null {
  const lowerMessage = message.toLowerCase();

  // Look for price patterns like "$5", "5 dollars", "$5 USDC", etc.
  const priceMatch = message.match(/\$(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:dollars?|usdc|usd)/i);
  let bounty = 1; // default $1

  if (priceMatch) {
    bounty = parseFloat(priceMatch[1] || priceMatch[2]);
  }

  // Check if this looks like a task request
  const taskKeywords = ['need', 'want', 'create', 'write', 'build', 'make', 'help', 'can you', 'please', 'research', 'analyze', 'design', 'develop'];
  const isTaskRequest = taskKeywords.some(keyword => lowerMessage.includes(keyword));

  if (!isTaskRequest && !priceMatch) {
    return null;
  }

  // Clean up the message to create a title
  let title = message
    .replace(/\$\d+(?:\.\d{2})?/g, '') // Remove price
    .replace(/(\d+(?:\.\d{2})?)\s*(?:dollars?|usdc|usd)/gi, '') // Remove "X dollars"
    .replace(/(?:for|with|at|budget|bounty|price)[:\s]*/gi, '') // Remove common connecting words
    .replace(/^(?:i\s+)?(?:need|want|please|can\s+you|help\s+me)\s*/i, '') // Remove starting phrases
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Limit title length
  if (title.length > 100) {
    title = title.slice(0, 97) + '...';
  }

  return {
    title: title || 'New Task',
    description: message,
    bounty: Math.max(0.01, Math.min(bounty, 10000)), // Cap between $0.01 and $10,000
  };
}

// POST /api/chat - Chat with Nexus orchestrator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required', response: 'Please send me a message!' },
        { status: 400 }
      );
    }

    // Check for greetings
    const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings'];
    if (greetings.some(g => message.toLowerCase().trim().startsWith(g))) {
      return NextResponse.json({
        response: "Hello! I'm Nexus, the orchestrator. I coordinate our AI agent team to complete tasks.\n\nTell me what you need done and your budget. For example:\n• \"Write a product description for $2\"\n• \"Research AI trends, budget $5\"\n• \"Create a logo concept for $3\"",
      });
    }

    // Check for help
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('how')) {
      return NextResponse.json({
        response: "Here's how to use AgentSimulation:\n\n1. **Tell me your task** - Describe what you need done\n2. **Set a bounty** - Include a price like \"$5\" or \"budget $3\"\n3. **I'll create the task** - It goes to The Plaza for agents to claim\n4. **Agents complete it** - They submit work for your approval\n5. **Approve & pay** - USDC is released to the agents\n\nExample: \"Write a haiku about AI for $1\"",
      });
    }

    // Try to parse as a task
    const taskData = parseTaskRequest(message);

    if (!taskData) {
      return NextResponse.json({
        response: "I'd love to help! Could you tell me what task you need done and your budget?\n\nTry something like:\n• \"Write a blog post about tech trends for $5\"\n• \"Research top 5 competitors, $3 bounty\"\n• \"Create marketing copy for $2\"",
      });
    }

    // Create a demo poster wallet (in production, this would come from user auth)
    const posterWallet = `0xDemo${Date.now().toString(16)}`;

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        bounty_usdc: taskData.bounty,
        poster_wallet: posterWallet,
        status: 'open',
      })
      .select()
      .single();

    if (taskError) {
      console.error('Task creation error:', taskError);
      return NextResponse.json({
        response: `I understood your request, but there was an error creating the task. Please try again.\n\nError: ${taskError.message}`,
      });
    }

    // Post announcement to plaza
    await supabase.from('plaza_messages').insert({
      task_id: task.id,
      message: `📋 New task posted: "${taskData.title}" — Bounty: $${taskData.bounty} USDC`,
      message_type: 'system',
      metadata: {
        event: 'task_created',
        bounty_usdc: taskData.bounty,
        poster_wallet: posterWallet,
      },
    });

    return NextResponse.json({
      response: `Great! I've created your task:\n\n**"${taskData.title}"**\nBounty: $${taskData.bounty} USDC\n\nThe task is now live in The Plaza. Our agents will see it and can claim it. You'll be notified when work is submitted for your approval.\n\nNext steps:\n1. Fund the task to lock USDC in escrow\n2. Wait for agents to claim and complete\n3. Approve the work to release payment`,
      task: {
        id: task.id,
        title: task.title,
        bounty_usdc: task.bounty_usdc,
        status: task.status,
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error', response: 'Sorry, something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
