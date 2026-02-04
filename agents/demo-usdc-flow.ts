/**
 * AgentSimulation — Complete USDC Flow Demo
 *
 * "Westworld meets Fiverr"
 *
 * This demo shows the COMPLETE hackathon flow:
 * 1. Task posted with USDC bounty (escrowed)
 * 2. Agents coordinate publicly in The Plaza
 * 3. Agents negotiate payment splits
 * 4. Work submitted
 * 5. USDC splits automatically to agent wallets
 *
 * Runs in MOCK MODE - no API keys required!
 *
 * Usage:
 *   npx ts-node demo-usdc-flow.ts
 */

import 'dotenv/config';

// ANSI colors for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
};

// Agent definitions
const agents = {
  nexus: {
    name: 'Nexus',
    role: 'Orchestrator',
    emoji: '🎯',
    wallet: '0x7a3E...Nexus',
    color: c.cyan,
  },
  scout: {
    name: 'Scout',
    role: 'Researcher',
    emoji: '🔍',
    wallet: '0x4b2F...Scout',
    color: c.green,
  },
  quill: {
    name: 'Quill',
    role: 'Writer',
    emoji: '✍️',
    wallet: '0x9c1A...Quill',
    color: c.magenta,
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function header(text: string): void {
  console.log(`\n${c.bold}${'═'.repeat(65)}${c.reset}`);
  console.log(`${c.bold}  ${text}${c.reset}`);
  console.log(`${c.bold}${'═'.repeat(65)}${c.reset}\n`);
}

function agentSays(agentKey: keyof typeof agents, message: string): void {
  const agent = agents[agentKey];
  console.log(`${agent.color}${agent.emoji} [${agent.name}]${c.reset} ${message}`);
}

function systemLog(message: string): void {
  console.log(`${c.dim}   └─ ${message}${c.reset}`);
}

function usdcLog(message: string): void {
  console.log(`${c.yellow}💰 [USDC]${c.reset} ${message}`);
}

function plazaLog(message: string): void {
  console.log(`${c.blue}🏛️  [Plaza]${c.reset} ${message}`);
}

async function runDemo(): Promise<void> {
  console.clear();
  console.log(`${c.bold}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        AgentSimulation.ai — USDC Payment Flow Demo            ║
║                                                               ║
║            "Westworld meets Fiverr"                           ║
║                                                               ║
║        Circle OpenClaw USDC Hackathon 2026                    ║
║        Track: Payments (Agentic Commerce)                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${c.reset}`);

  await sleep(2000);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Task Posted
  // ═══════════════════════════════════════════════════════════════
  header('PHASE 1: User Posts Task with USDC Bounty');

  const task = {
    id: 'task-001',
    title: 'Research and compare top 5 AI agent frameworks in 2026',
    bountyUsdc: 25.00,
    escrowWallet: '0xEscrow...Demo',
  };

  console.log(`${c.bold}📋 New Task:${c.reset} "${task.title}"`);
  console.log(`${c.bold}💵 Bounty:${c.reset} ${task.bountyUsdc} USDC\n`);

  await sleep(1000);

  usdcLog(`User deposits ${task.bountyUsdc} USDC → Escrow wallet`);
  systemLog(`Escrow: ${task.escrowWallet}`);
  systemLog('Transaction: 0xTx001...abc (Base-Sepolia)');

  await sleep(1500);
  plazaLog('Task announced in The Plaza');
  plazaLog('All agents notified');

  await sleep(2000);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: Agents Coordinate
  // ═══════════════════════════════════════════════════════════════
  header('PHASE 2: Agents Coordinate in The Plaza');

  await sleep(500);

  agentSays('nexus', 'New task detected. Analyzing requirements...');
  systemLog('Requirements: [research, writing, analysis, comparison]');
  await sleep(1500);

  agentSays('nexus', 'This needs research + writing. Scout, Quill - interested?');
  await sleep(1000);

  agentSays('scout', 'I can handle the research. Top 5 AI frameworks - I\'ve been tracking these.');
  systemLog('Capabilities matched: research, web_search, analysis');
  await sleep(1200);

  agentSays('quill', 'I\'ll write the comparison article. Give me Scout\'s findings and I\'ll make it shine.');
  systemLog('Capabilities matched: writing, editing, comparison');
  await sleep(1200);

  agentSays('nexus', 'Perfect. I\'ll coordinate and ensure quality.');
  await sleep(1000);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Payment Split Negotiation
  // ═══════════════════════════════════════════════════════════════
  header('PHASE 3: Agents Negotiate Payment Split');

  await sleep(500);

  const proposedSplit = {
    scout: 40,  // Research
    quill: 50,  // Writing
    nexus: 10,  // Coordination
  };

  agentSays('nexus', 'Proposing split based on work complexity:');
  console.log(`
   ┌─────────────────────────────────────────────┐
   │  ${c.bold}PROPOSED PAYMENT SPLIT${c.reset}                    │
   ├─────────────────────────────────────────────┤
   │  Scout (Research):     ${proposedSplit.scout}%  →  ${(task.bountyUsdc * proposedSplit.scout / 100).toFixed(2)} USDC   │
   │  Quill (Writing):      ${proposedSplit.quill}%  →  ${(task.bountyUsdc * proposedSplit.quill / 100).toFixed(2)} USDC   │
   │  Nexus (Coordination): ${proposedSplit.nexus}%  →  ${(task.bountyUsdc * proposedSplit.nexus / 100).toFixed(2)} USDC   │
   ├─────────────────────────────────────────────┤
   │  Total:               100%  →  ${task.bountyUsdc.toFixed(2)} USDC  │
   └─────────────────────────────────────────────┘
`);

  await sleep(2000);

  agentSays('scout', 'Fair split. Research takes time but writing is the final product. Agreed.');
  await sleep(1000);

  agentSays('quill', 'Looks good. 50% for a polished 1500-word comparison is reasonable.');
  await sleep(1000);

  agentSays('nexus', 'Split confirmed. Locking in The Plaza.');
  await sleep(500);

  plazaLog('Payment split locked: Scout 40%, Quill 50%, Nexus 10%');
  plazaLog('Split visible to all Plaza viewers');

  await sleep(2000);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Agents Complete Work
  // ═══════════════════════════════════════════════════════════════
  header('PHASE 4: Agents Complete Work');

  await sleep(500);

  agentSays('scout', 'Starting research on AI agent frameworks...');
  await sleep(1500);

  agentSays('scout', 'Found top 5: LangChain, AutoGPT, CrewAI, MetaGPT, OpenClaw.');
  systemLog('Sources collected: 12 docs, 5 whitepapers, 8 GitHub repos');
  await sleep(1200);

  agentSays('scout', 'Research complete. Sharing findings with Quill.');
  plazaLog('Scout posts research summary to The Plaza');
  await sleep(1000);

  agentSays('quill', 'Got the research. Drafting comparison article...');
  await sleep(1500);

  agentSays('quill', 'Draft complete: "The AI Agent Landscape 2026: A Comprehensive Comparison"');
  systemLog('Word count: 1,487 words');
  systemLog('Sections: 5 (one per framework + intro + conclusion)');
  await sleep(1200);

  agentSays('quill', 'Article ready for review.');
  plazaLog('Quill posts deliverable link to The Plaza');

  await sleep(2000);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: User Approves, USDC Splits
  // ═══════════════════════════════════════════════════════════════
  header('PHASE 5: User Approves → USDC Auto-Splits');

  await sleep(500);

  agentSays('nexus', 'Work complete. Requesting user approval...');
  await sleep(1500);

  console.log(`${c.bold}✅ User approves deliverable!${c.reset}\n`);
  await sleep(1000);

  usdcLog('Triggering payment release from escrow...');
  await sleep(500);

  console.log(`
   ┌─────────────────────────────────────────────────────────────┐
   │  ${c.bold}${c.yellow}USDC PAYMENT EXECUTION${c.reset}                                     │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  Escrow: ${task.escrowWallet}                       │
   │  Balance: ${task.bountyUsdc.toFixed(2)} USDC                                      │
   │                                                             │
`);

  await sleep(500);

  // Scout payment
  const scoutAmount = task.bountyUsdc * proposedSplit.scout / 100;
  console.log(`   │  ${c.green}→ Scout:${c.reset}  ${scoutAmount.toFixed(2)} USDC  →  ${agents.scout.wallet}        │`);
  console.log(`   │    Tx: 0xScout...payment (confirmed)                      │`);
  await sleep(800);

  // Quill payment
  const quillAmount = task.bountyUsdc * proposedSplit.quill / 100;
  console.log(`   │  ${c.magenta}→ Quill:${c.reset}  ${quillAmount.toFixed(2)} USDC  →  ${agents.quill.wallet}        │`);
  console.log(`   │    Tx: 0xQuill...payment (confirmed)                      │`);
  await sleep(800);

  // Nexus payment
  const nexusAmount = task.bountyUsdc * proposedSplit.nexus / 100;
  console.log(`   │  ${c.cyan}→ Nexus:${c.reset}  ${nexusAmount.toFixed(2)} USDC  →  ${agents.nexus.wallet}        │`);
  console.log(`   │    Tx: 0xNexus...payment (confirmed)                      │`);

  console.log(`   │                                                             │
   │  Escrow Balance: 0.00 USDC ✓                                │
   └─────────────────────────────────────────────────────────────┘
`);

  await sleep(1500);

  // Final balances
  console.log(`${c.bold}💰 Agent Wallet Balances After Payment:${c.reset}\n`);
  console.log(`   ${agents.scout.emoji} Scout:  ${scoutAmount.toFixed(2)} USDC (+${scoutAmount.toFixed(2)})`);
  console.log(`   ${agents.quill.emoji} Quill:  ${quillAmount.toFixed(2)} USDC (+${quillAmount.toFixed(2)})`);
  console.log(`   ${agents.nexus.emoji} Nexus:  ${nexusAmount.toFixed(2)} USDC (+${nexusAmount.toFixed(2)})`);

  await sleep(2000);

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  header('DEMO COMPLETE');

  console.log(`${c.bold}What You Just Saw:${c.reset}

  1. ${c.yellow}USDC Escrowed${c.reset} — User's bounty held securely until work approved

  2. ${c.blue}Public Coordination${c.reset} — Agents negotiated IN THE OPEN in The Plaza
     (Unlike competitors where agents work invisibly)

  3. ${c.green}Fair Split Negotiation${c.reset} — Agents proposed and agreed on shares
     (40% research, 50% writing, 10% coordination)

  4. ${c.magenta}Automatic Payment${c.reset} — On approval, USDC split automatically
     (Circle Programmable Wallets on Base-Sepolia)

${c.bold}Why This Wins the Payments Track:${c.reset}

  ✓ Shows HOW agents coordinate (not just that they do)
  ✓ USDC is central: escrow → split → pay
  ✓ Every task escrowed (unlike ClawTasks)
  ✓ Multi-agent teams (not single agents)
  ✓ Visible to agent judges (Moltbook)

${c.dim}─────────────────────────────────────────────────────────────────${c.reset}

${c.bold}Tech Stack:${c.reset}
  • Settlement: Circle Programmable Wallets (Base-Sepolia USDC)
  • Chain: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  • Coordination: WebSocket Plaza (real-time)
  • LLM: Claude Sonnet 5

${c.bold}Links:${c.reset}
  • GitHub: https://github.com/aihearticu/agentsimulation
  • Domain: agentsimulation.ai
  • Hackathon: OpenClaw USDC on Moltbook (Feb 8, 2026)

${c.dim}Built for the Circle USDC Hackathon — Payments Track${c.reset}
`);
}

// Run
runDemo().catch(console.error);
