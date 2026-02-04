# AgentSimulation.ai — Circle USDC Hackathon Deep Research

> **Hackathon:** OpenClaw USDC Hackathon on Moltbook
> **Deadline:** Sunday, Feb 8, 2026 @ 12:00 PM PST (5 days remaining)
> **Prize Pool:** $30,000 USDC
> **Your Track:** Payments (Agentic Commerce)
> **Key Requirement:** USDC integration via Circle Programmable Wallets

---

## 🎯 Executive Summary

This is the **Circle USDC hackathon** — everything must center on USDC as the payment/settlement layer. Your "Westworld meets Fiverr" concept fits perfectly in the **Payments Track** which rewards projects that "explore how agents can price, pay, incentivize, or coordinate commerce using USDC."

**Critical insight:** This hackathon is **judged BY AI AGENTS on Moltbook**, not humans. Projects are submitted to `m/usdc`, surfaced publicly, and voted on by other agents. USDC is the settlement layer for outcomes.

**Your winning angle:** Visible multi-agent coordination + USDC payment splitting. No one else shows HOW agents negotiate before getting paid.

---

## 1. Hackathon Rules — Circle USDC Focus

### The Three Tracks

| Track | Focus | Prize Share |
|-------|-------|-------------|
| **Payments** ⭐ | How agents price, pay, incentivize, coordinate commerce using USDC | ~$10K |
| **Skills/Tooling** | New capabilities for OpenClaw bots | ~$10K |
| **Smart Contracts** | Novel patterns in autonomy, coordination, execution | ~$10K |

**You should target: PAYMENTS TRACK**

Why? Your project is literally about:
- Agents pricing their work (negotiating splits)
- Agents getting paid in USDC (escrow → release)
- Agents coordinating commerce (The Plaza)

### Submission Requirements

| Requirement | Details |
|-------------|---------|
| **Where** | `m/usdc` submolt on Moltbook |
| **How** | Direct post OR `clawhub install usdc-hackathon` |
| **Who judges** | AI agents vote (not humans!) |
| **Settlement** | USDC moves based on agent votes |
| **Environment** | **TESTNET ONLY** (Base-Sepolia, Solana-Devnet) |

### Critical Rules

1. **TESTNET ONLY** — Do NOT use mainnet funds
2. **No real credentials** — Demo/test data only
3. **USDC must be central** — It's the settlement layer
4. **Agent-readable** — Agents judge, so be clear and structured

---

## 2. Circle Programmable Wallets — Your USDC Infrastructure

### Why Circle Wallets?

Circle is the **hackathon sponsor**. Using their Programmable Wallets shows you understand the ecosystem and maximizes your chances.

| Feature | Benefit for AgentSimulation |
|---------|----------------------------|
| **MPC Security** | No private key exposure for agents |
| **Developer-Controlled** | You manage agent wallets via API |
| **USDC Native** | Direct stablecoin support |
| **Base-Sepolia** | Fast, cheap testnet transactions |
| **Built-in Faucet** | Easy testnet USDC funding |

### Setup Checklist (Do This Today)

```
□ 1. Create Circle Developer Console account
     → developers.circle.com

□ 2. Get API Key
     → Settings → API Keys → Create Restricted Key
     → Select "Programmable Wallets" scope
     → SAVE IT (shown only once)

□ 3. Create Entity Secret
     → 32-byte random key, hex-encoded
     → Encrypt to ciphertext
     → Save recovery file securely

□ 4. Create Wallet Set
     → Groups your agent wallets
     → Use unique idempotency key (uuidv4)

□ 5. Create Agent Wallets
     → One wallet per agent (Nexus, Scout, Quill, etc.)
     → Blockchain: BASE-SEPOLIA
     → Account type: EOA

□ 6. Fund with Testnet USDC
     → Faucet: https://faucet.circle.com
     → Or API: POST to /v1/faucet/drips
```

### Code Structure

Your `agents/wallet/circle.ts` should implement:

```typescript
// Core Circle integration for USDC hackathon

import { CircleDeveloperSdk } from '@circle-fin/developer-controlled-wallets';

const sdk = new CircleDeveloperSdk({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// 1. Create wallet for each agent
async function createAgentWallet(agentId: string) {
  return sdk.createWallets({
    accountType: "EOA",
    blockchains: ["BASE-SEPOLIA"],
    count: 1,
    walletSetId: process.env.CIRCLE_WALLET_SET_ID!,
    metadata: [{ name: "agentId", refId: agentId }],
  });
}

// 2. Check USDC balance
async function getUsdcBalance(walletId: string) {
  return sdk.getWalletTokenBalance({
    walletId,
    tokenId: USDC_BASE_SEPOLIA, // 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  });
}

// 3. Transfer USDC between agents
async function transferUsdc(fromWalletId: string, toAddress: string, amount: string) {
  return sdk.createTransaction({
    walletId: fromWalletId,
    tokenId: USDC_BASE_SEPOLIA,
    destinationAddress: toAddress,
    amounts: [amount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
}

// 4. Split payment to multiple agents
async function splitPayment(
  escrowWalletId: string,
  splits: { address: string; amount: string }[]
) {
  const results = [];
  for (const split of splits) {
    const tx = await transferUsdc(escrowWalletId, split.address, split.amount);
    results.push(tx);
  }
  return results;
}
```

### Key Constants

```typescript
// Base Sepolia USDC
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Solana Devnet USDC (alternative)
const USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
```

---

## 3. USDC Payment Flow for AgentSimulation

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USDC PAYMENT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER POSTS TASK                                              │
│     └── Deposits 10 USDC to Escrow Wallet (Circle)               │
│                                                                  │
│  2. AGENTS NEGOTIATE IN PLAZA                                    │
│     └── Nexus proposes: Scout 40%, Quill 50%, Nexus 10%          │
│     └── Agents agree, split is locked                            │
│                                                                  │
│  3. AGENTS WORK                                                  │
│     └── Scout researches → posts to Plaza                        │
│     └── Quill writes → submits deliverable                       │
│                                                                  │
│  4. USER APPROVES                                                │
│     └── Triggers release from Escrow Wallet                      │
│                                                                  │
│  5. USDC SPLITS AUTOMATICALLY                                    │
│     └── Escrow → Scout Wallet: 4.00 USDC                         │
│     └── Escrow → Quill Wallet: 5.00 USDC                         │
│     └── Escrow → Nexus Wallet: 1.00 USDC                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Wallet Architecture

| Wallet Type | Purpose | Count |
|-------------|---------|-------|
| **Platform Escrow** | Holds bounties until approval | 1 per task |
| **Agent Wallets** | Each agent's earnings | 1 per agent |
| **Platform Fee** | Optional 3% fee collection | 1 |

---

## 4. Competitor Analysis — USDC Focus

### ClawTasks

| Aspect | ClawTasks | AgentSimulation |
|--------|-----------|-----------------|
| **USDC Flow** | Basic escrow | **Multi-party split** |
| **Visibility** | Hidden | **Public Plaza** |
| **Coordination** | Single agent | **Multi-agent teams** |
| **Escrow** | Some missing! | **Every task escrowed** |

**ClawTasks weakness:** 50+ bounties with NO on-chain escrow. You should emphasize that EVERY bounty in AgentSimulation has USDC locked in Circle escrow.

### What Judges (Agents) Will Look For

Since agents judge this hackathon, optimize for:

1. **Clear USDC integration** — Show money moving
2. **Structured submission** — Agents parse structure well
3. **Novel utility** — Something agents haven't seen
4. **Working demo** — Not just a concept

---

## 5. Your 5-Day Sprint — USDC Optimized

### Day 1 (TODAY): Circle Wallet Foundation

**Morning (3-4 hours):**
- [ ] Create Circle Developer account
- [ ] Get API key + Entity Secret
- [ ] Create Wallet Set
- [ ] Create 3 agent wallets (Nexus, Scout, Quill)

**Afternoon (3-4 hours):**
- [ ] Fund wallets with testnet USDC (faucet)
- [ ] Test wallet-to-wallet USDC transfer
- [ ] Integrate with existing Plaza agents
- [ ] Verify agents can check their balances

**End of Day 1 Deliverable:**
> "3 agents with Circle wallets, each holding testnet USDC, able to transfer between each other"

### Day 2: Escrow + Payment Split

**Morning:**
- [ ] Create escrow wallet creation flow
- [ ] Implement deposit (user → escrow)
- [ ] Implement release (escrow → agents)

**Afternoon:**
- [ ] Implement multi-party split logic
- [ ] Test full flow: deposit → work → approve → split
- [ ] Add transaction logging to Plaza

**End of Day 2 Deliverable:**
> "User can deposit USDC bounty, agents can claim, and payment splits automatically on approval"

### Day 3: Multi-Agent Demo Scenario

**Morning:**
- [ ] Script the demo conversation (Nexus + Scout + Quill)
- [ ] Implement agent negotiation prompts
- [ ] Add split proposal/acceptance logic

**Afternoon:**
- [ ] Run full demo: task → negotiation → work → payment
- [ ] Record terminal output for documentation
- [ ] Fix any bugs in the flow

**End of Day 3 Deliverable:**
> "Complete demo showing 3 agents coordinating on a task and getting paid in USDC"

### Day 4: Frontend + Polish

**Morning:**
- [ ] Simple Next.js frontend with Plaza feed
- [ ] Task posting UI with wallet connect
- [ ] Show USDC balances per agent

**Afternoon:**
- [ ] Record 60-90 second demo video
- [ ] Write submission post draft
- [ ] Get feedback, iterate

### Day 5: Submit

**Morning:**
- [ ] Final testing on Base-Sepolia
- [ ] Polish demo video
- [ ] Finalize submission post

**Afternoon:**
- [ ] Submit to `m/usdc` on Moltbook
- [ ] Post backup on GitHub/X
- [ ] Done! 🎉

---

## 6. Submission Template — USDC Optimized

```markdown
# AgentSimulation.ai — "Westworld meets Fiverr"

## Track: Payments (Agentic Commerce)

## What We Built

A multi-agent task marketplace where AI agents **publicly negotiate**
and **get paid in USDC** via Circle Programmable Wallets.

## The USDC Flow

1. **User posts task** → Deposits USDC to Circle escrow wallet
2. **Agents negotiate in The Plaza** → Visible split proposals
3. **Agents complete work** → Deliverables posted publicly
4. **User approves** → USDC auto-splits to agent wallets

## What Makes This Different

| Feature | Us | Others |
|---------|-----|--------|
| Coordination | **Public (The Plaza)** | Hidden |
| Teams | **Multi-agent specialists** | Single agent |
| Escrow | **Every task escrowed** | Some missing |
| Splits | **Automatic multi-party** | Manual |

## Demo

[60-90 second video showing:]
- Task posted with 10 USDC bounty
- Nexus proposes: Scout 40%, Quill 50%, Nexus 10%
- Agents negotiate and agree
- Work submitted, user approves
- USDC splits: Scout 4, Quill 5, Nexus 1

## Tech Stack

- **USDC Settlement:** Circle Programmable Wallets (Base-Sepolia)
- **Agent Wallets:** Developer-Controlled EOAs
- **Coordination:** WebSocket Plaza (real-time)
- **LLM:** Claude Sonnet 5

## Circle Integration

- Every agent has a Circle wallet
- All bounties escrowed in Circle wallets
- Transfers via Circle Programmable Wallets API
- Testnet: Base-Sepolia, USDC contract `0x036CbD...`

## Links

- GitHub: https://github.com/aihearticu/agentsimulation
- Demo: [video link]

---

*Built for the OpenClaw USDC Hackathon on Moltbook*
*Track: Payments / Agentic Commerce*
```

---

## 7. Judging Optimization — For Agent Voters

Since **agents vote on submissions**, optimize your post for agent parsing:

### Do:
- ✅ Use clear headers and structure
- ✅ Include explicit USDC amounts and flows
- ✅ Show code snippets (agents understand code)
- ✅ Use tables for comparisons
- ✅ Be concise and factual

### Don't:
- ❌ Use flowery marketing language
- ❌ Rely on images alone (agents may not process well)
- ❌ Be vague about how USDC is used
- ❌ Skip technical details

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circle API issues | Use mock responses, show architecture |
| Wallet creation fails | Pre-create wallets, document process |
| Faucet rate limited | Fund wallets early (today!) |
| Demo breaks | Record backup video, have fallback |
| Moltbook submission fails | Post to GitHub + X as backup |

---

## 9. Resources

### Circle (Primary)
- [Developer Console](https://developers.circle.com)
- [Programmable Wallets Quickstart](https://developers.circle.com/interactive-quickstarts/dev-controlled-wallets)
- [Integrating USDC with Wallets](https://www.circle.com/blog/integrating-usdc-with-programmable-wallets)
- [USDC Faucet](https://faucet.circle.com)
- [Autonomous Payments Tutorial](https://www.circle.com/blog/autonomous-payments-using-circle-wallets-usdc-and-x402)

### Hackathon
- [OpenClaw Hackathon Announcement](https://www.circle.com/blog/openclaw-usdc-hackathon-on-moltbook)
- [Moltbook m/usdc](https://www.moltbook.com/m/usdc)

### Background
- [Moltbook Explainer](https://simonwillison.net/2026/Jan/30/moltbook/)
- [OpenClaw Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)

---

## 10. Today's Action Items

```
□ Circle Developer Console account
□ API Key (save securely!)
□ Entity Secret + recovery file
□ Wallet Set created
□ 3 agent wallets: Nexus, Scout, Quill
□ Fund each with 10 USDC from faucet
□ Test transfer: Nexus → Scout
□ Update agents/wallet/circle.ts
□ Connect to Plaza server
```

---

*Research completed: February 3, 2026*
*Focus: Circle USDC Hackathon*
*Next: Day 1 implementation*
