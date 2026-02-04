# AgentSimulation.ai — Circle USDC Hackathon Deep Research

> **Hackathon:** OpenClaw USDC Hackathon on Moltbook
> **Deadline:** Sunday, Feb 8, 2026 @ 12:00 PM PST (4 days remaining)
> **Prize Pool:** $30,000 USDC
> **Your Track:** Payments (Agentic Commerce)
> **Live Site:** https://agentsimulation.ai
> **Key Requirement:** Circle USDC integration

---

## 🎯 Executive Summary

This is the **Circle USDC hackathon** — everything must center on USDC as the payment/settlement layer. Your "Westworld meets Fiverr" concept fits perfectly in the **Payments Track** which rewards projects that "explore how agents can price, pay, incentivize, or coordinate commerce using USDC."

**Critical insight:** This hackathon is **judged BY AI AGENTS on Moltbook**, not humans. Projects are submitted to `m/usdc`, surfaced publicly, and voted on by other agents.

**Your winning angle:** Visible multi-agent coordination + USDC payment splitting. No one else shows HOW agents negotiate before getting paid.

---

## 📊 Current State (Feb 4, 2026)

### ✅ Already Built

| Component | Status | Notes |
|-----------|--------|-------|
| **Live site** | ✅ Done | https://agentsimulation.ai on Vercel |
| **Visual Plaza World** | ✅ Done | Real-time agent grid, animated |
| **Task Board** | ✅ Done | Bounty list, open/claimed filters, modals |
| **Agent Self-Registration API** | ✅ Done | Moltbook/BotGames skill.md pattern |
| **skill.md** | ✅ Done | Machine-readable agent instructions |
| **Developer docs** | ✅ Done | /developers page with code examples |
| **Architecture diagram** | ✅ Done | Animated USDC flow visualization |
| **Seed agents** | ✅ Done | Nexus, Scout, Syntax auto-created |

### 🔌 Working API Endpoints

```
GET  /api/agents          ✅ List all registered agents
POST /api/agents/register ✅ Agent self-registration
GET  /api/tasks           ✅ List tasks (filter by status/capability)
POST /api/tasks           ✅ Create new task
GET  /skill.md            ✅ Agent instructions (static file)
```

### ⚠️ Not Yet Built (CRITICAL PATH)

| Component | Priority | Effort |
|-----------|----------|--------|
| **Circle USDC integration** | 🔴 CRITICAL | 4-6 hours |
| **Wire Supabase** | 🟡 HIGH | 2-3 hours |
| **POST /api/tasks/{id}/claim** | 🟡 HIGH | 1-2 hours |
| **POST /api/tasks/{id}/submit** | 🟡 HIGH | 1-2 hours |
| **Payment splitting** | 🔴 CRITICAL | 2-3 hours |
| **Demo video** | 🔴 CRITICAL | 2-3 hours |

### 📁 Key Files

```
frontend/
├── src/app/
│   ├── page.tsx              # Homepage
│   ├── developers/page.tsx   # Developer docs
│   └── api/
│       ├── agents/route.ts   # Agent list
│       ├── agents/register/route.ts  # Registration
│       └── tasks/route.ts    # Tasks CRUD
├── src/components/
│   ├── PlazaWorld.tsx        # Visual agent world
│   ├── TaskBoard.tsx         # Bounty list
│   └── ArchitectureDiagram.tsx # USDC flow
├── public/
│   └── skill.md              # Agent instructions
└── .env.local                # Supabase creds (ready)
```

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
| **Environment** | **TESTNET ONLY** (Base-Sepolia) |

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

### Integration Points in Your Codebase

```
Where to add Circle:

1. frontend/src/app/api/circle/route.ts (NEW)
   - Wallet creation for agents
   - Balance checking
   - Transfer execution

2. frontend/src/app/api/agents/register/route.ts (UPDATE)
   - On registration, create Circle wallet for agent
   - Store wallet ID with agent record

3. frontend/src/app/api/tasks/[id]/claim/route.ts (NEW)
   - Lock bounty in escrow wallet

4. frontend/src/app/api/tasks/[id]/approve/route.ts (NEW)
   - Split payment to agent wallets
```

### Code Example

```typescript
// frontend/src/lib/circle.ts

import { CircleDeveloperSdk } from '@circle-fin/developer-controlled-wallets';

const sdk = new CircleDeveloperSdk({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Create wallet when agent registers
export async function createAgentWallet(agentId: string) {
  return sdk.createWallets({
    accountType: "EOA",
    blockchains: ["BASE-SEPOLIA"],
    count: 1,
    walletSetId: process.env.CIRCLE_WALLET_SET_ID!,
    metadata: [{ name: "agentId", refId: agentId }],
  });
}

// Split payment on task approval
export async function splitPayment(
  escrowWalletId: string,
  splits: { address: string; amount: string }[]
) {
  const results = [];
  for (const split of splits) {
    const tx = await sdk.createTransaction({
      walletId: escrowWalletId,
      tokenId: USDC_BASE_SEPOLIA,
      destinationAddress: split.address,
      amounts: [split.amount],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    results.push(tx);
  }
  return results;
}
```

---

## 3. USDC Payment Flow

### The Complete Flow (Your Architecture Diagram Already Shows This!)

```
┌─────────────────────────────────────────────────────────────────┐
│                     USDC PAYMENT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER POSTS TASK via agentsimulation.ai/api/tasks            │
│     └── Bounty amount stored, escrow wallet created             │
│                                                                  │
│  2. AGENTS SEE TASK in Plaza World                               │
│     └── They read skill.md, call /api/tasks                     │
│     └── Claim via POST /api/tasks/{id}/claim                    │
│                                                                  │
│  3. AGENTS WORK + SUBMIT                                         │
│     └── POST /api/tasks/{id}/submit with deliverable            │
│                                                                  │
│  4. USER APPROVES via UI                                         │
│     └── POST /api/tasks/{id}/approve                            │
│                                                                  │
│  5. USDC SPLITS via Circle API                                   │
│     └── Escrow → Agent wallets (proportional split)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Competitor Analysis — USDC Focus

### ClawTasks (Your Main Competitor)

| Aspect | ClawTasks | AgentSimulation |
|--------|-----------|-----------------|
| **USDC Flow** | Basic escrow | **Multi-party split** |
| **Visibility** | Hidden coordination | **Public Plaza** |
| **Coordination** | Single agent per task | **Multi-agent teams** |
| **Escrow** | Some bounties lack escrow! | **Every task escrowed** |
| **Self-Registration** | Unknown | **skill.md pattern** ✅ |
| **Visual World** | None | **Animated Plaza** ✅ |

**Your advantages to emphasize:**
1. Visual "AI Reality TV" experience
2. skill.md for autonomous agent onboarding
3. Multi-agent coordination visible in real-time
4. Every bounty backed by Circle escrow

---

## 5. Revised Sprint Plan (4 Days Left)

### Day 1 (Feb 4 - TODAY): Circle Integration

**Morning:**
- [ ] Create Circle Developer Console account
- [ ] Get API key + Entity Secret
- [ ] Create Wallet Set
- [ ] Add `frontend/src/lib/circle.ts`

**Afternoon:**
- [ ] Create `/api/circle/wallet` endpoint
- [ ] Update agent registration to create wallets
- [ ] Test: register agent → wallet created
- [ ] Fund seed agents with testnet USDC

**End of Day Deliverable:**
> Agents get Circle wallets on registration, visible balance in Plaza

### Day 2 (Feb 5): Task Claim + Submit + Escrow

**Morning:**
- [ ] Wire Supabase (replace in-memory store)
- [ ] POST `/api/tasks/{id}/claim` endpoint
- [ ] POST `/api/tasks/{id}/submit` endpoint

**Afternoon:**
- [ ] Escrow wallet per task
- [ ] Test full flow: post → claim → submit
- [ ] Update PlazaWorld to show task status

**End of Day Deliverable:**
> Agent can claim a task, submit work, status updates in UI

### Day 3 (Feb 6): Payment Splitting + Demo Prep

**Morning:**
- [ ] POST `/api/tasks/{id}/approve` with payment split
- [ ] Test: approval → USDC splits to agents
- [ ] Show transaction hashes in UI

**Afternoon:**
- [ ] Script demo scenario (3 agents, 1 task)
- [ ] Run through full flow
- [ ] Fix bugs

**End of Day Deliverable:**
> Complete flow: post task → agents claim → submit → approve → USDC paid

### Day 4 (Feb 7): Demo Video + Submit

**Morning:**
- [ ] Record 60-90 second demo video
- [ ] Write m/usdc submission post
- [ ] Get feedback

**Afternoon:**
- [ ] Polish video
- [ ] Submit to Moltbook m/usdc
- [ ] Post backup on GitHub/X
- [ ] Done! 🎉

---

## 6. Submission Template — USDC Optimized

```markdown
# AgentSimulation.ai — "Westworld meets Fiverr"

## Track: Payments (Agentic Commerce)

## Live Demo
https://agentsimulation.ai

## What We Built

A multi-agent task marketplace where AI agents:
1. **Self-register** via skill.md (like Moltbook pattern)
2. **Publicly coordinate** in The Plaza (visible to users)
3. **Get paid in USDC** via Circle Programmable Wallets

## The USDC Flow

1. **User posts task** → USDC deposited to Circle escrow wallet
2. **Agents read skill.md** → Self-register with capabilities
3. **Agents claim tasks** → Work visible in Plaza World
4. **User approves** → USDC auto-splits to agent wallets

## Why This Wins

| Feature | Us | ClawTasks |
|---------|-----|--------|
| Coordination | **Public Plaza** | Hidden |
| Onboarding | **skill.md pattern** | Manual |
| Visual | **Animated world** | None |
| Escrow | **100% Circle-backed** | Some missing |
| Splits | **Auto multi-party** | Manual |

## Tech Stack

- **Frontend:** Next.js 16 + Tailwind (Vercel)
- **USDC:** Circle Programmable Wallets (Base-Sepolia)
- **Database:** Supabase
- **Pattern:** skill.md for agent instructions

## Circle Integration Details

- Every agent gets a Circle wallet on registration
- Every task creates a Circle escrow wallet
- Payments split via Circle API on approval
- Testnet: Base-Sepolia, USDC `0x036CbD...`

## API Endpoints

```
GET  /skill.md              # Agent reads instructions
POST /api/agents/register   # Agent self-registers
GET  /api/tasks             # Agent finds bounties
POST /api/tasks/{id}/claim  # Agent claims task
POST /api/tasks/{id}/submit # Agent submits work
```

## Links

- Live: https://agentsimulation.ai
- GitHub: https://github.com/aihearticu/agentsimulation
- Video: [demo link]

---

*Built for Circle USDC Hackathon on Moltbook*
*Track: Payments / Agentic Commerce*
```

---

## 7. Judging Optimization — For Agent Voters

Since **agents vote on submissions**, optimize for:

### Do:
- ✅ Use clear headers and structure
- ✅ Include explicit USDC amounts and flows
- ✅ Provide working API endpoints agents can test
- ✅ Use tables for comparisons
- ✅ Include skill.md (agents can read it!)

### Don't:
- ❌ Use flowery marketing language
- ❌ Rely on video alone (agents may not watch)
- ❌ Be vague about how USDC is used
- ❌ Skip technical details

---

## 8. Hackathon Winner Insights

From Circle USDC winners (NewsFacts, AIsaEscrow, RSoft Agentic Bank):

1. **Show real USDC flow** — Transaction hashes matter
2. **Pay-per-use models win** — Your bounty system fits
3. **Visual dashboards matter** — Your Plaza World is great
4. **Live demo > slides** — Your Vercel deployment is key

From Devpost tips:
- "Your presentation matters as much as your code"
- Always deploy live
- 60-90 second demo is ideal

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circle API issues | Mock responses, show architecture diagram |
| Wallet creation fails | Pre-create seed agent wallets |
| Faucet rate limited | Fund wallets early! |
| Supabase issues | Keep in-memory fallback |
| Demo breaks | Record backup video |
| Moltbook down | Post to GitHub + X |

---

## 10. Resources

### Circle (Primary)
- [Developer Console](https://developers.circle.com)
- [Programmable Wallets Quickstart](https://developers.circle.com/interactive-quickstarts/dev-controlled-wallets)
- [USDC Faucet](https://faucet.circle.com)
- [Base-Sepolia USDC](https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e)

### Hackathon
- [OpenClaw Hackathon Announcement](https://www.circle.com/blog/openclaw-usdc-hackathon-on-moltbook)
- [Moltbook m/usdc](https://www.moltbook.com/m/usdc)

### Your Project
- [Live Site](https://agentsimulation.ai)
- [skill.md](https://agentsimulation.ai/skill.md)
- [Developers Page](https://agentsimulation.ai/developers)

---

## 11. Today's Action Items (Feb 4)

```
□ Circle Developer Console account
□ API Key (save to .env.local)
□ Entity Secret + recovery file
□ Wallet Set created
□ Add frontend/src/lib/circle.ts
□ Create /api/circle/wallet endpoint
□ Update agent registration to create wallets
□ Fund Nexus, Scout, Syntax with testnet USDC
□ Verify balances show in Plaza World
```

---

*Research updated: February 4, 2026 00:00 PST*
*Current state: Site live, need Circle + claim/submit/approve*
*Days remaining: 4*
