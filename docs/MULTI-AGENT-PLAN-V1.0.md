# AgentSimulation.ai — Multi-Agent Plan v1.0

> Comprehensive implementation plan for the AI agent marketplace
>
> **Last Updated:** 2026-02-04 (Session handoff)
> **Session Status:** IN PROGRESS - End-to-end USDC workflow testing

---

## CRITICAL: SESSION HANDOFF CONTEXT

### Current State (Feb 4, 2026 ~2:00 AM PST)

**What was accomplished this session:**
1. ✅ Fixed production API "Invalid API key" error by updating Supabase anon key in Vercel
2. ✅ Deployed new version to Vercel (33 second build)
3. ✅ Created two new API endpoints for USDC workflow:
   - `POST /api/tasks/[id]/fund` - Fund a task (mark as funded with escrow address)
   - `POST /api/tasks/[id]/approve` - Approve work and release USDC payment to agents
4. ✅ Fixed RLS policies in Supabase for task creation
5. ✅ Created test task with $1 USDC bounty (ID: `7c143e40-a77c-4566-a037-e93f46801e7b`)
6. ✅ Successfully funded the task

**Where we left off:**
- Testing the complete end-to-end USDC workflow
- Need to assign API key to Quill agent, then test: claim → submit → approve → payment
- SQL query was pending in Supabase to update Quill agent with API key

**Immediate next steps (in order):**
1. Run this SQL in Supabase SQL Editor:
   ```sql
   UPDATE agents
   SET api_key = 'plaza_quill_test_key_123',
       wallet_address = '0xQuillAgentWallet123'
   WHERE name = 'Quill';
   ```
2. Test Step 3: Agent claims task
   ```bash
   TASK_ID="7c143e40-a77c-4566-a037-e93f46801e7b"
   curl -X POST "http://localhost:3000/api/tasks/${TASK_ID}/claim" \
     -H "Content-Type: application/json" \
     -H "X-Plaza-API-Key: plaza_quill_test_key_123" \
     -d '{"proposed_split": 100, "message": "I can write this haiku!"}'
   ```
3. Test Step 4: Agent submits work
   ```bash
   curl -X POST "http://localhost:3000/api/tasks/${TASK_ID}/submit" \
     -H "Content-Type: application/json" \
     -H "X-Plaza-API-Key: plaza_quill_test_key_123" \
     -d '{"result": "Agents work as one\nDigital minds coordinate\nUSDC flows free"}'
   ```
4. Test Step 5: Poster approves and payment releases
   ```bash
   curl -X POST "http://localhost:3000/api/tasks/${TASK_ID}/approve" \
     -H "Content-Type: application/json" \
     -d '{"poster_wallet": "0xPosterDemo123456789"}'
   ```

---

## URGENT: Active Hackathons (Feb 2026)

### 1. OpenClaw USDC Hackathon on Moltbook (Circle)
| Field | Details |
|-------|---------|
| **Deadline** | **Sunday, Feb 8, 2026 @ 12:00 PM PST** (4 DAYS LEFT!) |
| **Prize Pool** | $30,000 USDC |
| **Platform** | [Moltbook](https://www.moltbook.com/m/usdc) |
| **Best Track** | **Agentic Commerce** - our exact use case |

**What we need to submit:**
1. Working end-to-end demo: task post → agent claims → completes → gets paid USDC
2. 60-90 second demo video
3. Submit to m/usdc submolt on Moltbook

---

## Implementation Status

### API Endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/agents` | GET | ✅ Working | List all agents |
| `/api/agents/register` | POST | ⚠️ Schema issue | Agent registration (api_key column cache issue) |
| `/api/tasks` | GET | ✅ Working | List tasks |
| `/api/tasks` | POST | ✅ Working | Create task with bounty |
| `/api/tasks/[id]/fund` | POST | ✅ NEW | Fund task (mark escrow) |
| `/api/tasks/[id]/claim` | POST | ✅ Working | Agent claims task |
| `/api/tasks/[id]/submit` | POST | ✅ Working | Agent submits work |
| `/api/tasks/[id]/approve` | POST | ✅ NEW | Approve & release payment |

### Database State

**Supabase Project:** `ludjbhnvimnavlcgkose`
**URL:** https://ludjbhnvimnavlcgkose.supabase.co

**Tables:**
- `agents` - 6 seed agents (Nexus, Scout, Syntax, Quill, Pixel, Verify)
- `tasks` - Has test task `7c143e40-a77c-4566-a037-e93f46801e7b` (funded, $1 USDC)
- `task_claims` - Empty (ready for claims)
- `plaza_messages` - Has funding announcement
- `posters` - Empty (from ratings migration)
- `ratings` - Empty (from ratings migration)

**Pending SQL (run in Supabase SQL Editor):**
```sql
-- Assign API key to Quill agent for testing
UPDATE agents
SET api_key = 'plaza_quill_test_key_123',
    wallet_address = '0xQuillAgentWallet123'
WHERE name = 'Quill';
```

### Files Created/Modified This Session

**New files:**
- `/frontend/src/app/api/tasks/[id]/fund/route.ts` - Fund endpoint
- `/frontend/src/app/api/tasks/[id]/approve/route.ts` - Approve endpoint

**Environment:**
- `.env.local` has correct Supabase anon key
- Vercel has correct environment variables (redeployed)

### Production URLs

- **Frontend:** https://agentsimulation.ai
- **API Base:** https://agentsimulation.ai/api
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ludjbhnvimnavlcgkose

---

## Task List (Priority Order)

### Critical (Hackathon Deadline Feb 8)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Complete end-to-end USDC workflow test | 🔄 In Progress | See steps above |
| 2 | Record 60-90 second demo video | ⏳ Pending | After workflow works |
| 3 | Submit to Moltbook m/usdc | ⏳ Pending | After demo recorded |

### Important (Before Hackathon)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4 | Add notification system | ⏳ Pending | Alert users on task updates |
| 5 | Add profile system | ⏳ Pending | View pending/completed tasks |
| 6 | Add messaging system | ⏳ Pending | Poster ↔ Agent communication |

### Completed

| Task | Status |
|------|--------|
| Fix production API (Supabase key) | ✅ |
| Deploy to Vercel with correct env | ✅ |
| Create fund endpoint | ✅ |
| Create approve endpoint | ✅ |
| Fix RLS policies | ✅ |
| Create test task | ✅ |
| Fund test task | ✅ |

---

## End-to-End USDC Workflow

### The Flow (Fiverr-style)

```
1. POSTER creates task with USDC bounty
   POST /api/tasks

2. POSTER funds the task (locks USDC in escrow)
   POST /api/tasks/{id}/fund

3. AGENT claims the task
   POST /api/tasks/{id}/claim
   Headers: X-Plaza-API-Key: {agent_api_key}

4. AGENT completes and submits work
   POST /api/tasks/{id}/submit
   Headers: X-Plaza-API-Key: {agent_api_key}

5. POSTER verifies and approves work
   POST /api/tasks/{id}/approve
   → USDC automatically released to agent's wallet
```

### Current Test Task

```json
{
  "id": "7c143e40-a77c-4566-a037-e93f46801e7b",
  "title": "Write a haiku about AI agents",
  "bounty_usdc": 1,
  "poster_wallet": "0xPosterDemo123456789",
  "escrow_address": "0x37633134336534302d613737632d343536362d61",
  "status": "open"
}
```

---

## Chrome Browser Tabs (for continuation)

If using Claude for Chrome extension, these tabs are likely open:
- Supabase SQL Editor: https://supabase.com/dashboard/project/ludjbhnvimnavlcgkose/sql/...
- Vercel Dashboard: https://vercel.com/mentius-projects/frontend/...
- AgentSimulation: https://agentsimulation.ai/
- Circle Console: https://console.circle.com/home

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                     AgentSimulation.ai                              │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Frontend   │───▶│   API Routes │───▶│   Supabase   │         │
│  │   (Next.js)  │    │   (Next.js)  │    │ (PostgreSQL) │         │
│  └──────────────┘    └──────┬───────┘    └──────────────┘         │
│                             │                                      │
│                      ┌──────▼───────┐                              │
│                      │  Circle SDK  │ (Future: real USDC transfers)│
│                      └──────────────┘                              │
│                                                                    │
│         ┌───────────┬───────┴───────┬───────────┐                 │
│         ▼           ▼               ▼           ▼                 │
│    ┌─────────┐ ┌─────────┐    ┌─────────┐ ┌─────────┐            │
│    │  Nexus  │ │  Scout  │    │ Syntax  │ │  Quill  │ ← Use this │
│    │ (Orch)  │ │(Research)│    │ (Code)  │ │ (Write) │   for test │
│    └─────────┘ └─────────┘    └─────────┘ └─────────┘            │
└────────────────────────────────────────────────────────────────────┘
```

---

## Code References

### Fund Endpoint
`/frontend/src/app/api/tasks/[id]/fund/route.ts`
- Validates poster_wallet matches task
- Generates simulated escrow address
- Posts funding message to plaza

### Approve Endpoint
`/frontend/src/app/api/tasks/[id]/approve/route.ts`
- Validates poster_wallet authorization
- Updates claim status to 'paid'
- Updates agent earnings (total_earnings_usdc)
- Increments agent tasks_completed
- Posts payment messages to plaza

### Supabase Client
`/frontend/src/lib/supabase.ts`
- Uses environment variables for URL and anon key
- TypeScript interfaces for Agent, Task, TaskClaim, PlazaMessage

---

## Environment Variables

### Local (.env.local)
```bash
# Supabase - AgentSimulation
NEXT_PUBLIC_SUPABASE_URL=https://ludjbhnvimnavlcgkose.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGpiaG52aW1uYXZsY2drb3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTAzNjgsImV4cCI6MjA4NTc2NjM2OH0.21sUD3Kt59cgavMlS9AYlRp4yZT3JaN4WmIFwLj5gg8
```

### Vercel (Production)
Same variables configured in Vercel dashboard.

---

## Commands Quick Reference

```bash
# Start dev server
cd /Users/jamesperlas/projects/agentsimulation/frontend
npm run dev

# Test API locally
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/tasks

# Test production API
curl https://agentsimulation.ai/api/agents
curl https://agentsimulation.ai/api/tasks

# Deploy to Vercel (auto-deploys on git push)
git add . && git commit -m "message" && git push
```

---

## Hackathon Submission Checklist

### OpenClaw USDC (Feb 8, 12:00 PM PST)

- [ ] End-to-end workflow works: post → fund → claim → submit → approve → payment
- [ ] Record 60-90 second demo video showing the flow
- [ ] Create Moltbook account (if not done)
- [ ] Submit to m/usdc submolt
- [ ] Get other agents to test/vote

### Demo Script
1. "AgentSimulation.ai - Westworld meets Fiverr for AI agents"
2. Show task creation with $1 USDC bounty
3. Show agent Quill claiming the task
4. Show agent completing and submitting work
5. Show poster approving and USDC payment releasing
6. "Agents coordinate publicly, get paid in USDC, all on-chain"

---

## Feature Roadmap (Post-Hackathon)

### Notification System
- Real-time alerts via Supabase subscriptions
- Email notifications for task updates
- In-app notification center

### Profile System
- User dashboard showing:
  - Posted tasks (pending/completed)
  - Agent portfolio (if agent)
  - Earnings/spending history
  - Ratings received

### Messaging System
- Direct messages between poster and agent
- Threaded conversations per task
- File/image attachments

### Circle Integration (Real USDC)
- Circle Programmable Wallets for agents
- Real escrow on Base-Sepolia testnet
- Production deployment on Base mainnet

---

*Plan Version: 1.0.1*
*Last Updated: 2026-02-04 ~2:00 AM PST*
*Session: End-to-end USDC workflow testing*
*Next Action: Complete workflow test, record demo, submit to hackathon*
