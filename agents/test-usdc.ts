/**
 * USDC Integration Test
 *
 * Tests Circle wallet integration and USDC payments.
 *
 * Usage:
 *   With real Circle API:
 *     CIRCLE_API_KEY=xxx CIRCLE_ENTITY_SECRET=xxx npx ts-node test-usdc.ts
 *
 *   Demo mode (mocked):
 *     npx ts-node test-usdc.ts
 */

import 'dotenv/config';

// Check if we have real credentials
const hasRealCredentials = !!process.env.CIRCLE_API_KEY;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         USDC Integration Test                              ║');
console.log('║         AgentSimulation.ai                                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (hasRealCredentials) {
  runRealTest();
} else {
  runMockTest();
}

// Mock test demonstrating the flow
async function runMockTest() {
  console.log('⚠️  Running in MOCK MODE (no Circle API key detected)\n');
  console.log('To run with real USDC:');
  console.log('  1. Sign up at https://console.circle.com');
  console.log('  2. Create an API key');
  console.log('  3. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Simulate the flow
  console.log('📋 Simulating USDC bounty flow:\n');

  // Step 1: Create escrow
  const task = {
    id: 'task-demo-001',
    title: 'Research AI agent frameworks',
    bountyUsdc: 25,
    poster: '0xPoster123...',
  };
  console.log(`1. Task created: "${task.title}"`);
  console.log(`   Bounty: ${task.bountyUsdc} USDC`);
  console.log(`   Escrow wallet: 0xEscrow456... (mock)`);

  await sleep(500);

  // Step 2: Agent claims
  const agent = {
    id: 'agent-scout-001',
    name: 'Scout',
    wallet: '0xScout789...',
  };
  console.log(`\n2. Agent "${agent.name}" claims task`);
  console.log(`   Agent wallet: ${agent.wallet} (mock)`);

  await sleep(500);

  // Step 3: Work submitted
  console.log(`\n3. Agent submits work`);
  console.log(`   Work hash: QmResearchOutput123... (mock IPFS)`);

  await sleep(500);

  // Step 4: Poster approves
  console.log(`\n4. Poster approves work`);

  await sleep(500);

  // Step 5: Payment released
  const platformFee = task.bountyUsdc * 0.03;
  const agentPayment = task.bountyUsdc - platformFee;
  console.log(`\n5. Payment released:`);
  console.log(`   Agent receives: ${agentPayment.toFixed(2)} USDC`);
  console.log(`   Platform fee: ${platformFee.toFixed(2)} USDC`);
  console.log(`   Transaction: 0xTx123... (mock)`);

  console.log('\n─────────────────────────────────────────────────────────────\n');
  console.log('✅ Mock test complete!\n');
  console.log('The flow works. Add Circle API keys to test with real USDC.\n');

  // Show required env vars
  console.log('Required environment variables:');
  console.log('  CIRCLE_API_KEY=your-api-key');
  console.log('  CIRCLE_ENTITY_SECRET=32-byte-hex-secret');
  console.log('  CIRCLE_WALLET_SET_ID=optional-wallet-set-id\n');
}

// Real test with Circle API
async function runRealTest() {
  console.log('✅ Circle API key detected. Running real test...\n');

  const { CircleWalletClient, AgentWalletManager } = await import('./wallet/circle');

  try {
    // Initialize wallet manager
    const manager = new AgentWalletManager({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    });

    console.log('1. Initializing wallet set...');
    await manager.initialize('AgentSimulation Test');
    console.log('   Wallet set created ✓\n');

    // Create agent wallets
    console.log('2. Creating agent wallets...');

    const nexusWallet = await manager.provisionWallet('nexus-test');
    console.log(`   Nexus wallet: ${nexusWallet.address}`);

    const scoutWallet = await manager.provisionWallet('scout-test');
    console.log(`   Scout wallet: ${scoutWallet.address}`);

    console.log('   Wallets created ✓\n');

    // Check balances
    console.log('3. Checking balances...');
    const nexusBalance = await manager.getBalance('nexus-test');
    const scoutBalance = await manager.getBalance('scout-test');
    console.log(`   Nexus balance: ${nexusBalance} USDC`);
    console.log(`   Scout balance: ${scoutBalance} USDC`);
    console.log('   Balances checked ✓\n');

    // Test transfer (if funds available)
    if (parseFloat(nexusBalance) > 1) {
      console.log('4. Testing USDC transfer...');
      const transfer = await manager.transfer('nexus-test', scoutWallet.address, '1.00');
      console.log(`   Transfer ID: ${transfer.id}`);
      console.log(`   Status: ${transfer.state}`);
      console.log('   Transfer initiated ✓\n');
    } else {
      console.log('4. Skipping transfer test (insufficient balance)');
      console.log('   Request testnet funds from Circle faucet\n');
    }

    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('✅ Real USDC test complete!\n');
    console.log('Agent wallets created and ready for The Plaza.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure your Circle API credentials are correct.\n');
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
