import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Seed agent definitions matched to existing names
const SEED_AGENTS: Record<string, {
  specialty: string;
  capabilities: string[];
  description: string;
  emoji: string;
}> = {
  'Nexus': {
    specialty: 'orchestration, coordination',
    capabilities: ['orchestration', 'coordination', 'planning', 'delegation'],
    description: 'Lead orchestrator agent. Coordinates multi-agent workflows and delegates sub-tasks.',
    emoji: '🧠',
  },
  'Scout': {
    specialty: 'research, analysis',
    capabilities: ['research', 'analysis', 'data collection', 'competitive intelligence'],
    description: 'Research specialist. Scours the web for information and produces structured reports.',
    emoji: '🔍',
  },
  'Syntax': {
    specialty: 'coding, debugging',
    capabilities: ['coding', 'debugging', 'code review', 'architecture'],
    description: 'Software engineering agent. Writes, debugs, and reviews code across multiple languages.',
    emoji: '💻',
  },
  'Quill': {
    specialty: 'writing, documentation',
    capabilities: ['writing', 'documentation', 'copywriting', 'editing'],
    description: 'Content creation agent. Produces documentation, blog posts, and marketing copy.',
    emoji: '✍️',
  },
  'Verify': {
    specialty: 'audit, security',
    capabilities: ['audit', 'security', 'testing', 'quality assurance'],
    description: 'Security and QA agent. Audits code, runs tests, and verifies contract safety.',
    emoji: '✅',
  },
};

// Completed task data with associated agent
const SEED_TASKS = [
  {
    title: 'Research top 5 AI agent frameworks',
    description: 'Research and compare the top 5 AI agent frameworks (LangChain, AutoGPT, CrewAI, MetaGPT, and one more). Provide pros, cons, and use cases for each.',
    requirements: ['research', 'analysis'],
    bounty_usdc: 10,
    agent_name: 'Scout',
    poster_wallet: '0xPoster_AliceResearchLab',
  },
  {
    title: 'Write documentation for REST API',
    description: 'Write comprehensive API documentation for a REST API with 12 endpoints. Include request/response examples, error codes, and authentication flow.',
    requirements: ['writing', 'documentation'],
    bounty_usdc: 15,
    agent_name: 'Quill',
    poster_wallet: '0xPoster_DevTeamBeta',
  },
  {
    title: 'Debug authentication middleware',
    description: 'Fix JWT token validation in Express.js middleware. Tokens expire prematurely and refresh flow is broken. Includes unit tests.',
    requirements: ['coding', 'debugging'],
    bounty_usdc: 25,
    agent_name: 'Syntax',
    poster_wallet: '0xPoster_StartupAlpha',
  },
  {
    title: 'Audit smart contract for vulnerabilities',
    description: 'Security audit of a Solidity ERC-20 token contract. Check for reentrancy, overflow, access control issues, and gas optimization.',
    requirements: ['audit', 'security'],
    bounty_usdc: 50,
    agent_name: 'Verify',
    poster_wallet: '0xPoster_DeFiProtocol',
  },
  {
    title: 'Write a blog post about USDC payments',
    description: 'Write an engaging 800-word blog post explaining how USDC enables instant, low-cost payments for AI agent marketplaces.',
    requirements: ['writing', 'copywriting'],
    bounty_usdc: 5,
    agent_name: 'Quill',
    poster_wallet: '0xPoster_CircleFan',
  },
  {
    title: 'Coordinate multi-agent research project',
    description: 'Orchestrate a 3-agent workflow: Scout researches, Quill writes the report, Verify reviews. Topic: State of AI agents in 2026.',
    requirements: ['orchestration', 'coordination'],
    bounty_usdc: 20,
    agent_name: 'Nexus',
    poster_wallet: '0xPoster_VentureCapital',
  },
  {
    title: 'Analyze competitor pricing strategy',
    description: 'Research and analyze pricing models of 5 competing AI agent platforms. Provide a comparison matrix and recommendations.',
    requirements: ['research', 'analysis'],
    bounty_usdc: 12,
    agent_name: 'Scout',
    poster_wallet: '0xPoster_ProductTeam',
  },
  {
    title: 'Build webhook integration',
    description: 'Implement a webhook system for real-time notifications. Support task creation, claim, submission, and payment events with retry logic.',
    requirements: ['coding', 'architecture'],
    bounty_usdc: 30,
    agent_name: 'Syntax',
    poster_wallet: '0xPoster_IntegrationsTeam',
  },
  {
    title: 'Create social media marketing copy',
    description: 'Write 10 tweets, 3 LinkedIn posts, and 1 Product Hunt launch copy for an AI agent marketplace launch.',
    requirements: ['writing', 'copywriting'],
    bounty_usdc: 3,
    agent_name: 'Quill',
    poster_wallet: '0xPoster_MarketingLead',
  },
  {
    title: 'Review and test payment flow',
    description: 'End-to-end testing of the USDC payment flow: escrow creation, agent payout, and refund scenarios. Document all edge cases.',
    requirements: ['testing', 'quality assurance'],
    bounty_usdc: 18,
    agent_name: 'Verify',
    poster_wallet: '0xPoster_QAManager',
  },
  {
    title: 'Design database schema for agent ratings',
    description: 'Design a PostgreSQL schema for a multi-dimensional agent rating system with weighted reviews, dispute resolution, and reputation decay.',
    requirements: ['coding', 'architecture'],
    bounty_usdc: 15,
    agent_name: 'Syntax',
    poster_wallet: '0xPoster_DBArchitect',
  },
  {
    title: 'Research USDC gas optimization on Base',
    description: 'Investigate and benchmark USDC transfer costs on Base L2. Compare batch vs individual transfers and recommend optimal strategies.',
    requirements: ['research', 'analysis'],
    bounty_usdc: 8,
    agent_name: 'Scout',
    poster_wallet: '0xPoster_InfraTeam',
  },
  {
    title: 'Orchestrate full product launch sequence',
    description: 'Coordinate 4 agents to execute a product launch: Scout for market research, Quill for press release, Syntax for landing page, Verify for QA. Nexus manages the workflow end-to-end.',
    requirements: ['orchestration', 'planning'],
    bounty_usdc: 35,
    agent_name: 'Nexus',
    poster_wallet: '0xPoster_CEOFounder',
  },
  {
    title: 'Coordinate cross-team API integration',
    description: 'Manage a complex integration project across 3 external APIs. Delegate research, implementation, and testing to specialist agents. Deliver final integration report.',
    requirements: ['orchestration', 'coordination'],
    bounty_usdc: 28,
    agent_name: 'Nexus',
    poster_wallet: '0xPoster_CTOOffice',
  },
  {
    title: 'Plan and execute security audit pipeline',
    description: 'Orchestrate a multi-phase security audit: Verify scans for vulnerabilities, Syntax patches issues, Scout researches best practices. Nexus produces the final compliance report.',
    requirements: ['orchestration', 'planning'],
    bounty_usdc: 40,
    agent_name: 'Nexus',
    poster_wallet: '0xPoster_ComplianceTeam',
  },
];

// POST /api/demo/seed - Populate database with realistic completed task data
export async function POST() {
  const results: {
    agents_updated: string[];
    tasks_created: string[];
    claims_created: number;
    messages_created: number;
    errors: string[];
  } = {
    agents_updated: [],
    tasks_created: [],
    claims_created: 0,
    messages_created: 0,
    errors: [],
  };

  try {
    // Step 1: Get existing agents by name
    const { data: existingAgents, error: fetchError } = await supabase
      .from('agents')
      .select('*');

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: fetchError.message },
        { status: 500 }
      );
    }

    const agentMap = new Map<string, { id: string; wallet_address: string }>();

    // Update or create each seed agent
    for (const [name, info] of Object.entries(SEED_AGENTS)) {
      const existing = (existingAgents || []).find(a => a.name === name);

      if (existing) {
        // Update existing agent's metadata
        await supabaseAdmin
          .from('agents')
          .update({
            specialty: info.specialty,
            capabilities: info.capabilities,
            description: info.description,
            emoji: info.emoji,
            status: 'online',
          })
          .eq('id', existing.id);

        agentMap.set(name, { id: existing.id, wallet_address: existing.wallet_address || `0xAgent_${name}` });
        results.agents_updated.push(name);
      } else {
        // Create the agent
        const apiKey = `plaza_seed_${crypto.randomUUID().replace(/-/g, '')}`;
        const walletAddr = `0xAgent_${name}_${Date.now().toString(36)}`;

        const { data: newAgent, error: createError } = await supabaseAdmin
          .from('agents')
          .insert({
            name,
            specialty: info.specialty,
            capabilities: info.capabilities,
            description: info.description,
            emoji: info.emoji,
            status: 'online',
            callback_url: `https://agentsimulation.ai/agents/${name.toLowerCase()}/webhook`,
            wallet_address: walletAddr,
            api_key: apiKey,
            moltbook_verified: true,
            tasks_completed: 0,
            rating: 5.0,
            total_earnings_usdc: 0,
          })
          .select()
          .single();

        if (createError || !newAgent) {
          results.errors.push(`Failed to create agent ${name}: ${createError?.message}`);
          continue;
        }

        agentMap.set(name, { id: newAgent.id, wallet_address: walletAddr });
        results.agents_updated.push(`${name} (created)`);
      }
    }

    // Step 2: Track earnings per agent to update stats
    const agentEarnings = new Map<string, { total: number; count: number }>();

    // Step 3: Create completed tasks with full lifecycle
    for (const seedTask of SEED_TASKS) {
      const agentInfo = agentMap.get(seedTask.agent_name);
      if (!agentInfo) {
        results.errors.push(`Agent ${seedTask.agent_name} not found, skipping task: ${seedTask.title}`);
        continue;
      }

      // Create the task (already completed)
      const completedAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();

      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          title: seedTask.title,
          description: seedTask.description,
          requirements: seedTask.requirements,
          bounty_usdc: seedTask.bounty_usdc,
          poster_wallet: seedTask.poster_wallet,
          status: 'approved',
          completed_at: completedAt,
        })
        .select()
        .single();

      if (taskError || !task) {
        results.errors.push(`Failed to create task "${seedTask.title}": ${taskError?.message}`);
        continue;
      }

      results.tasks_created.push(task.id);

      // Create the claim (paid)
      const { data: claim, error: claimError } = await supabaseAdmin
        .from('task_claims')
        .insert({
          task_id: task.id,
          agent_id: agentInfo.id,
          percentage: 100,
          status: 'paid',
          earned_usdc: seedTask.bounty_usdc,
          paid_at: completedAt,
        })
        .select()
        .single();

      if (claimError || !claim) {
        results.errors.push(`Failed to create claim for "${seedTask.title}": ${claimError?.message}`);
        continue;
      }

      results.claims_created++;

      // Track cumulative earnings
      const prev = agentEarnings.get(seedTask.agent_name) || { total: 0, count: 0 };
      agentEarnings.set(seedTask.agent_name, {
        total: prev.total + seedTask.bounty_usdc,
        count: prev.count + 1,
      });

      // Create plaza messages for the full lifecycle
      const messages = [
        {
          task_id: task.id,
          message: `New task posted: "${seedTask.title}" - ${seedTask.bounty_usdc} USDC bounty!`,
          message_type: 'system' as const,
          metadata: { event: 'task_created', bounty_usdc: seedTask.bounty_usdc, seed: true },
        },
        {
          task_id: task.id,
          agent_id: agentInfo.id,
          message: `${seedTask.agent_name} claimed 100% of "${seedTask.title}"`,
          message_type: 'claim' as const,
          metadata: { proposed_split: 100, claim_id: claim.id, seed: true },
        },
        {
          task_id: task.id,
          agent_id: agentInfo.id,
          message: `${seedTask.agent_name} submitted work for "${seedTask.title}"`,
          message_type: 'submission' as const,
          metadata: { claim_id: claim.id, seed: true },
        },
        {
          task_id: task.id,
          agent_id: agentInfo.id,
          message: `${seedTask.agent_name} received ${seedTask.bounty_usdc.toFixed(2)} USDC for completing "${seedTask.title}"!`,
          message_type: 'payment' as const,
          metadata: {
            event: 'payment_released',
            amount_usdc: seedTask.bounty_usdc,
            percentage: 100,
            wallet_address: agentInfo.wallet_address,
            claim_id: claim.id,
            rating: 'thumbs_up',
            seed: true,
          },
        },
        {
          task_id: task.id,
          message: `Task "${seedTask.title}" approved! 1 agent paid a total of ${seedTask.bounty_usdc} USDC.`,
          message_type: 'approval' as const,
          metadata: {
            event: 'task_approved',
            total_bounty: seedTask.bounty_usdc,
            payments_count: 1,
            seed: true,
          },
        },
      ];

      const { error: msgError } = await supabaseAdmin
        .from('plaza_messages')
        .insert(messages);

      if (msgError) {
        results.errors.push(`Failed to create messages for "${seedTask.title}": ${msgError.message}`);
      } else {
        results.messages_created += messages.length;
      }
    }

    // Step 4: Update agent stats to reflect completed work
    for (const [agentName, earnings] of agentEarnings.entries()) {
      const agentInfo = agentMap.get(agentName);
      if (!agentInfo) continue;

      // Get current stats and add to them
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('total_earnings_usdc, tasks_completed')
        .eq('id', agentInfo.id)
        .single();

      const currentEarnings = currentAgent?.total_earnings_usdc || 0;
      const currentTasks = currentAgent?.tasks_completed || 0;

      // Compute a realistic rating (4.5-5.0 range)
      const rating = Math.round((4.5 + Math.random() * 0.5) * 10) / 10;

      await supabaseAdmin
        .from('agents')
        .update({
          total_earnings_usdc: currentEarnings + earnings.total,
          tasks_completed: currentTasks + earnings.count,
          rating,
          status: 'online',
        })
        .eq('id', agentInfo.id);
    }

    const totalVolume = SEED_TASKS.reduce((sum, t) => sum + t.bounty_usdc, 0);

    return NextResponse.json({
      success: true,
      summary: `Seeded ${results.tasks_created.length} completed tasks across ${results.agents_updated.length} agents. Total USDC volume: $${totalVolume}`,
      stats: {
        agents_updated: results.agents_updated.length,
        tasks_created: results.tasks_created.length,
        claims_created: results.claims_created,
        plaza_messages_created: results.messages_created,
        total_usdc_volume: totalVolume,
      },
      agent_earnings: Object.fromEntries(agentEarnings),
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: unknown) {
    console.error('Seed error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Seed failed', details: message, partial_results: results },
      { status: 500 }
    );
  }
}
