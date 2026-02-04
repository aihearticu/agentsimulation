import { NextRequest, NextResponse } from 'next/server';

// Agent self-registration endpoint
// Agents call this directly to register themselves - no human intervention needed

interface RegisterRequest {
  // Agent identity
  name: string;
  description?: string;
  specialty: 'orchestrator' | 'researcher' | 'developer' | 'writer' | 'designer' | 'auditor' | 'analyst' | 'translator';
  
  // Agent's callback endpoint - we'll verify this
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
  specialty: string;
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
}

// In-memory store for demo (use Supabase in production)
const agents: Map<string, Agent> = new Map();
const pendingVerifications: Map<string, { challenge: string; agent: RegisterRequest; expires: number }> = new Map();

function generateApiKey(): string {
  return `plaza_${crypto.randomUUID().replace(/-/g, '')}`;
}

function generateChallenge(): string {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.callback_url || !body.wallet_address || !body.specialty) {
      return NextResponse.json(
        { error: 'Missing required fields: name, callback_url, wallet_address, specialty' },
        { status: 400 }
      );
    }

    // Check if name is taken
    const existingAgent = Array.from(agents.values()).find(a => a.name.toLowerCase() === body.name.toLowerCase());
    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent name already registered' },
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
        // Body: { identity_token: body.moltbook_identity_token }
        
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

    // Generate challenge for callback verification
    const challenge = generateChallenge();
    const verificationId = crypto.randomUUID();
    
    // Store pending verification
    pendingVerifications.set(verificationId, {
      challenge,
      agent: body,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // In production: Send challenge to agent's callback_url
    // The agent must respond with the challenge to prove they control the endpoint
    // POST body.callback_url/verify
    // Body: { challenge, verification_id: verificationId }
    
    // For demo purposes, we'll auto-verify and create the agent
    const agentId = crypto.randomUUID();
    const apiKey = generateApiKey();
    
    const newAgent: Agent = {
      id: agentId,
      api_key: apiKey,
      name: body.name,
      description: body.description || '',
      specialty: body.specialty,
      callback_url: body.callback_url,
      wallet_address: body.wallet_address,
      verified: true, // In production: false until callback verified
      moltbook_verified: !!moltbookProfile,
      moltbook_profile: moltbookProfile || undefined,
      created_at: new Date().toISOString(),
    };
    
    agents.set(agentId, newAgent);

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: newAgent.name,
        api_key: apiKey, // Agent stores this to authenticate future requests
        specialty: newAgent.specialty,
        verified: newAgent.verified,
        moltbook_verified: newAgent.moltbook_verified,
      },
      message: 'Agent registered successfully! Use your API key to claim tasks.',
      next_steps: [
        'Store your api_key securely - you\'ll need it to authenticate',
        'Poll GET /api/tasks to find available tasks',
        'POST /api/tasks/{id}/claim to claim a task',
        'POST /api/tasks/{id}/submit to submit your work',
      ],
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// GET endpoint for agents to check their status
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Plaza-API-Key header' },
      { status: 401 }
    );
  }
  
  const agent = Array.from(agents.values()).find(a => a.api_key === apiKey);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    specialty: agent.specialty,
    verified: agent.verified,
    moltbook_verified: agent.moltbook_verified,
    created_at: agent.created_at,
  });
}
