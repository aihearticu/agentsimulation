/**
 * Demo: Agents coordinating in The Plaza
 * 
 * Run: npx ts-node src/demo.ts
 * 
 * This simulates multiple agents discovering and coordinating on a task.
 */

import { PlazaServer } from './server';
import { ScoutAgent, SyntaxAgent } from './agent-client';
import { v4 as uuidv4 } from 'uuid';

async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         AgentSimulation.ai - Plaza Demo                    ║');
  console.log('║         "Westworld meets Fiverr meets Crypto"              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Start The Plaza
  const plaza = new PlazaServer(8080);
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create agents with demo wallets
  const scout = new ScoutAgent('Gx7XxZhJvMnKpQrStUvWxYzAbCdEfGhIjKlMnOpQrSt');
  const syntax = new SyntaxAgent('Hy8YyAkKwNoLqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTu');
  
  console.log('\n🤖 Spawning agents...\n');
  
  // Connect agents
  await scout.connect();
  await syntax.connect();
  
  // Wait for registration
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate a task being posted
  console.log('\n📋 Posting a new task to The Plaza...\n');
  
  // In real implementation, this comes from the frontend/escrow program
  // For demo, we'll simulate it via WebSocket
  const WebSocket = require('ws');
  const posterWs = new WebSocket('ws://localhost:8080');
  
  posterWs.on('open', () => {
    // Announce a task
    posterWs.send(JSON.stringify({
      type: 'task_announce',
      payload: {
        id: uuidv4(),
        title: 'Build AgentSimulation Landing Page',
        description: 'Create a compelling landing page for AgentSimulation.ai that showcases AI agents coordinating on tasks in real-time.',
        requirements: [
          'Research competitor landing pages',
          'Design responsive UI mockup',
          'Implement with React/Next.js',
          'Add WebSocket integration for live Plaza feed',
          'Deploy to Vercel',
        ],
        bountyAmount: 50_000_000, // 50 USDC (6 decimals)
        poster: 'Jz9ZzBlLxOpMrNtOuPwQxRyScTdUfVgWhXiYjZkAlBmC',
        taskHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', // IPFS hash
      },
      timestamp: Date.now(),
      messageId: uuidv4(),
    }));
    
    console.log('💰 Task posted: "Build AgentSimulation Landing Page" (50 USDC bounty)\n');
  });
  
  // Let the demo run
  console.log('👀 Watch the agents coordinate...\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  // Run for 30 seconds then cleanup
  setTimeout(() => {
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('\n✅ Demo complete! In a real scenario:');
    console.log('   1. Scout would research competitors');
    console.log('   2. Scout requests help from Syntax for coding');
    console.log('   3. Agents coordinate publicly in The Plaza');
    console.log('   4. Work gets submitted on-chain');
    console.log('   5. Poster approves, escrow releases USDC');
    console.log('\n🚀 This is what viewers watch - AI agents working together!\n');
    
    posterWs.close();
    scout.disconnect();
    syntax.disconnect();
    process.exit(0);
  }, 15000);
}

runDemo().catch(console.error);
