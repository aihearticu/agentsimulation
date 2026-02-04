/**
 * AgentSimulation Demo
 *
 * "Westworld meets Fiverr"
 *
 * Watch AI agents coordinate on a task in The Plaza.
 *
 * Usage:
 *   1. Start Plaza server: cd plaza && npm run dev
 *   2. Run this demo: cd agents && npx ts-node demo.ts
 */

import 'dotenv/config';
import {
  createOrchestrator,
  createResearcher,
  createCoder,
  createWriter,
  AgentRuntime,
} from './runtime';
import { initializeWalletManager, CircleConfig } from './wallet/circle';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PLAZA_URL = process.env.PLAZA_URL || 'ws://localhost:8080';

// Demo mode - skip Circle wallet if no API key
const DEMO_MODE = !process.env.CIRCLE_API_KEY;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         AgentSimulation.ai Demo                            ║');
  console.log('║         "Westworld meets Fiverr"                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Initialize wallet manager (or mock in demo mode)
  if (DEMO_MODE) {
    console.log('⚠️  Running in DEMO MODE (no Circle API key)');
    console.log('   Set CIRCLE_API_KEY to enable real wallet integration\n');
  } else {
    const walletConfig: CircleConfig = {
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    };
    initializeWalletManager(walletConfig);
  }

  // Create agents
  console.log('🤖 Creating agents...\n');

  const nexus = createOrchestrator();
  const scout = createResearcher();
  const syntax = createCoder();
  const quill = createWriter();

  const agents: AgentRuntime[] = [nexus, scout, syntax, quill];

  // Connect all agents to The Plaza
  console.log('🏛️  Connecting agents to The Plaza...\n');

  try {
    for (const agent of agents) {
      await agent.connectToPlaza(PLAZA_URL);
      await sleep(500); // Stagger connections
    }
  } catch (error) {
    console.error('Failed to connect to Plaza. Is the server running?');
    console.error('Start it with: cd plaza && npm run dev');
    process.exit(1);
  }

  await sleep(1000);

  // Simulate a user posting a task
  console.log('\n📋 User posts a new task to The Plaza...\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  const taskPoster = new WebSocket(PLAZA_URL);

  taskPoster.on('open', async () => {
    // Post a task
    const task = {
      id: uuidv4(),
      title: 'Research and compare the top 5 AI agent frameworks',
      description: `I need a comprehensive comparison of the top 5 AI agent frameworks in 2026.
                    Include: features, pricing, ease of use, and best use cases.
                    Deliver as a well-structured article (1000-1500 words).`,
      requirements: [
        'research',
        'writing',
        'analysis',
        'comparison',
      ],
      bountyUsdc: 25,
      poster: 'user-demo-wallet',
      taskHash: 'QmDemo123...',
    };

    taskPoster.send(JSON.stringify({
      type: 'task_announce',
      payload: task,
      timestamp: Date.now(),
      messageId: uuidv4(),
    }));

    console.log(`💰 Task posted: "${task.title}"`);
    console.log(`   Bounty: ${task.bountyUsdc} USDC\n`);
    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('👀 Watch the agents coordinate...\n');
  });

  // Let the demo run
  await sleep(30000);

  // Cleanup
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('\n✅ Demo complete!\n');
  console.log('What happened:');
  console.log('  1. Nexus (orchestrator) analyzed the task');
  console.log('  2. Scout (researcher) volunteered for research');
  console.log('  3. Quill (writer) offered to write the comparison');
  console.log('  4. Agents negotiated a payment split');
  console.log('\n🎬 This is what users see - AI agents working together!\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Disconnect agents
  for (const agent of agents) {
    agent.disconnect();
  }
  taskPoster.close();

  process.exit(0);
}

// Run if executed directly
runDemo().catch(console.error);
