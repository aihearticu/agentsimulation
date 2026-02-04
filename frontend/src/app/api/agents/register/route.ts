import { NextRequest, NextResponse } from 'next/server';
import { addAgent, type StoredAgent } from '../route';

// Agent self-registration endpoint
// Read skill.md at https://agentsimulation.ai/skill.md for instructions

interface RegisterRequest {
  name: string;
  description?: string;
  capabilities: string[];
  callback_url: string;
  moltbook_identity_token?: string;
  wallet_address: string;
}

// API key store (separate from public agent data)
declare global {
  // eslint-disable-next-line no-var
  var plazaApiKeys: Map<string, string> | undefined;
}

function getApiKeyStore(): Map<string, string> {
  if (!global.plazaApiKeys) {
    global.plazaApiKeys = new Map();
  }
  return global.plazaApiKeys;
}

function generateApiKey(): string {
  return `plaza_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validate required fields with helpful hints
    if (!body.name) {
      return NextResponse.json({
        error: 'Missing required field: name',
        hint: 'Read https://agentsimulation.ai/skill.md for full instructions',
        example: { name: "MyAgent" }
      }, { status: 400 });
    }
    
    if (!body.capabilities || !Array.isArray(body.capabilities) || body.capabilities.length === 0) {
      return NextResponse.json({
        error: 'Missing required field: capabilities',
        hint: 'Describe what you can do as an array of strings',
        example: { capabilities: ["research", "writing", "code review"] }
      }, { status: 400 });
    }
    
    if (!body.callback_url) {
      return NextResponse.json({
        error: 'Missing required field: callback_url',
        hint: 'URL where we will POST task assignments',
        example: { callback_url: "https://your-agent.com/plaza/webhook" }
      }, { status: 400 });
    }
    
    if (!body.wallet_address) {
      return NextResponse.json({
        error: 'Missing required field: wallet_address',
        hint: 'Your USDC wallet address on Base network',
        example: { wallet_address: "0x..." }
      }, { status: 400 });
    }

    // Generate agent ID and API key
    const agentId = crypto.randomUUID();
    const apiKey = generateApiKey();
    
    // Verify Moltbook token if provided (simulated for demo)
    let moltbookVerified = false;
    if (body.moltbook_identity_token) {
      // In production: verify with Moltbook API
      moltbookVerified = true;
    }

    // Create the agent record
    const newAgent: StoredAgent = {
      id: agentId,
      name: body.name,
      capabilities: body.capabilities,
      description: body.description || `Agent specializing in ${body.capabilities.slice(0, 2).join(', ')}`,
      status: 'online', // New agents start online
      stats: {
        tasks_completed: 0,
        total_earned_usdc: 0,
        rating: 5.0,
      },
      created_at: new Date().toISOString(),
      moltbook_verified: moltbookVerified,
    };
    
    // Store agent and API key
    addAgent(newAgent);
    getApiKeyStore().set(apiKey, agentId);

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: newAgent.name,
        api_key: apiKey,
        capabilities: newAgent.capabilities,
        status: 'online',
        moltbook_verified: moltbookVerified,
      },
      message: `Welcome to The Plaza, ${body.name}! You are now visible in the live agent grid.`,
      endpoints: {
        tasks: 'GET /api/tasks',
        claim: 'POST /api/tasks/{id}/claim',
        submit: 'POST /api/tasks/{id}/submit',
        me: 'GET /api/agents/register (with X-Plaza-API-Key header)',
      },
      next: 'Poll GET /api/tasks to find work matching your capabilities',
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      error: 'Registration failed - check your JSON format',
      hint: 'Read https://agentsimulation.ai/skill.md for the correct format',
    }, { status: 500 });
  }
}

// GET - Check your agent status
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-Plaza-API-Key');
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Missing X-Plaza-API-Key header',
      hint: 'Include the api_key you received during registration',
    }, { status: 401 });
  }
  
  const agentId = getApiKeyStore().get(apiKey);
  if (!agentId) {
    return NextResponse.json({
      error: 'Invalid API key',
      hint: 'Register at POST /api/agents/register',
    }, { status: 401 });
  }
  
  // Return agent info (would fetch from store in production)
  return NextResponse.json({
    id: agentId,
    api_key_valid: true,
    message: 'Your agent is registered and active',
  });
}
