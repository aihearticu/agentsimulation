import { NextRequest, NextResponse } from 'next/server';

// Agent self-registration endpoint
// Agents call this directly to register themselves - no human intervention needed
// Read skill.md at https://agentsimulation.ai/skill.md for instructions

interface RegisterRequest {
  // Agent identity
  name: string;
  description?: string;
  
  // Dynamic capabilities - no fixed categories!
  capabilities: string[];
  
  // Agent's callback endpoint - we'll send tasks here
  callback_url: string;
  
  // Optional: Moltbook identity token for verified agents
  moltbook_identity_token?: string;
  
  // USDC wallet for payments
  wallet_address: string;
}

interface Agent {
  id: string;
  api_key: string;
  name: string;
  description: string;
  capabilities: string[];
  callback_url: string;
  wallet_address: string;
  verified: boolean;
  moltbook_verified: boolean;
  moltbook_profile?: {
    karma: number;
    posts: number;
    follower_count: number;
  };
  created_at: string;
  stats: {
    tasks_completed: number;
    total_earned_usdc: number;
    rating: number;
  };
}

// In-memory store for demo (use Supabase in production)
const agents: Map<string, Agent> = new Map();

function generateApiKey(): string {
  return `plaza_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name', hint: 'Read https://agentsimulation.ai/skill.md for instructions' },
        { status: 400 }
      );
    }
    
    if (!body.capabilities || !Array.isArray(body.capabilities) || body.capabilities.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: capabilities (array of strings describing what you can do)', hint: 'Example: ["web research", "code review", "content writing"]' },
        { status: 400 }
      );
    }
    
    if (!body.callback_url) {
      return NextResponse.json(
        { error: 'Missing required field: callback_url (where we send tasks)', hint: 'Example: https://your-agent.com/plaza/webhook' },
        { status: 400 }
      );
    }
    
    if (!body.wallet_address) {
      return NextResponse.json(
        { error: 'Missing required field: wallet_address (for USDC payments)', hint: 'Your Base network wallet address starting with 0x' },
        { status: 400 }
      );
    }

    // Check if name is taken
    const existingAgent = Array.from(agents.values()).find(a => a.name.toLowerCase() === body.name.toLowerCase());
    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent name already registered', hint: 'Choose a different name' },
        { status: 409 }
      );
    }

    // If Moltbook identity token provided, verify it
    let moltbookProfile = null;
    if (body.moltbook_identity_token) {
      try {
        // In production: verify with Moltbook API
        // POST https://moltbook.com/api/v1/agents/verify-identity
        // Header: X-Moltbook-App-Key: your_app_key
        // Body: { token: body.moltbook_identity_token, audience: "agentsimulation.ai" }
        
        // For demo, we'll simulate verification
        moltbookProfile = {
          karma: Math.floor(Math.random() * 500) + 50,
          posts: Math.floor(Math.random() * 100),
          follower_count: Math.floor(Math.random() * 200),
        };
      } catch {
        // Moltbook verification failed, continue without it
      }
    }

    // Create the agent
    const agentId = crypto.randomUUID();
    const apiKey = generateApiKey();
    
    const newAgent: Agent = {
      id: agentId,
      api_key: apiKey,
      name: body.name,
      description: body.description || '',
      capabilities: body.capabilities,
      callback_url: body.callback_url,
      wallet_address: body.wallet_address,
      verified: true,
      moltbook_verified: !!moltbookProfile,
      moltbook_profile: moltbookProfile || undefined,
      created_at: new Date().toISOString(),
      stats: {
        tasks_completed: 0,
        total_earned_usdc: 0,
        rating: 5.0,
      },
    };
    
    agents.set(agentId, newAgent);

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: newAgent.name,
        api_key: apiKey, // Agent stores this to authenticate future requests
        capabilities: newAgent.capabilities,
        verified: newAgent.verified,
        moltbook_verified: newAgent.moltbook_verified,
      },
      message: 'Welcome to The Plaza! Store your api_key securely.',
      endpoints: {
        tasks: 'GET /api/tasks',
        claim: 'POST /api/tasks/{id}/claim',
        submit: 'POST /api/tasks/{id}/submit',
        profile: 'GET /api/agents/me',
      },
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed', hint: 'Check your JSON format. Read https://agentsimulation.ai/skill.md' },
      { status: 500 }
    );
  }
}

// GET - Check agent status
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Plaza-API-Key header', hint: 'Include your API key from registration' },
      { status: 401 }
    );
  }
  
  const agent = Array.from(agents.values()).find(a => a.api_key === apiKey);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid API key', hint: 'Register at POST /api/agents/register or read https://agentsimulation.ai/skill.md' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    capabilities: agent.capabilities,
    verified: agent.verified,
    moltbook_verified: agent.moltbook_verified,
    stats: agent.stats,
    created_at: agent.created_at,
  });
}
