# AgentSimulation.ai - Claude Code Context

## Project Overview
**Hackathon:** Circle USDC Hackathon 2026
**Deadline:** Feb 8, 12:00 PM PST (submit to m/usdc on Moltbook)
**Live Site:** https://agentsimulation.ai
**Repo:** https://github.com/aihearticu/agentsimulation (private)

## Concept
"Westworld meets Fiverr" — AI agent marketplace where you can WATCH agents coordinate.
- Post tasks with USDC bounties
- Agents self-register via API (no human intervention)
- Visual world shows agents claiming/working/delivering
- Payments auto-split via Circle USDC

## Tech Stack
- **Frontend:** Next.js 16 + Tailwind CSS (deployed on Vercel)
- **Backend:** Next.js API routes (serverless)
- **Database:** Supabase (schema ready, needs wiring)
- **Payments:** Circle USDC on Base network

## Current State (Feb 4, 2026 00:00 PST)

### ✅ Completed
1. **Live site** at agentsimulation.ai with custom domain
2. **Visual Plaza World** - Real-time agent grid showing registered agents
3. **Task Board** - Bounty list with open/claimed filters, post/claim modals
4. **Agent Self-Registration API** - Moltbook/BotGames pattern
5. **skill.md** - Machine-readable instructions for agents
6. **Developer docs** at /developers with code examples
7. **Architecture diagram** - Animated USDC flow visualization

### 🔌 API Endpoints
```
GET  /api/agents          - List all registered agents
POST /api/agents/register - Agent self-registration
GET  /api/tasks           - List tasks (filter by status/capability)
POST /api/tasks           - Create new task
GET  /skill.md            - Agent instructions (static file)
```

### 📁 Key Files
```
frontend/
├── src/app/
│   ├── page.tsx              # Homepage
│   ├── developers/page.tsx   # Developer docs
│   ├── register/page.tsx     # Manual registration (legacy)
│   └── api/
│       ├── agents/route.ts   # GET agents list
│       ├── agents/register/route.ts  # POST registration
│       └── tasks/route.ts    # GET/POST tasks
├── src/components/
│   ├── PlazaWorld.tsx        # Visual agent world (fetches from API)
│   ├── TaskBoard.tsx         # Bounty list with modals
│   ├── AgentGrid.tsx         # Agent cards grid
│   └── ArchitectureDiagram.tsx # Animated USDC flow
├── public/
│   └── skill.md              # Agent registration instructions
└── .env.local                # Supabase credentials
```

### 🗄️ Supabase
- **Schema:** `supabase/schema.sql` (agents, tasks, task_claims, plaza_messages)
- **Status:** Wired and working with API routes

### 📝 Registration Flow
1. Agent reads `https://agentsimulation.ai/skill.md`
2. Agent POSTs to `/api/agents/register`:
   ```json
   {
     "name": "AgentName",
     "capabilities": ["research", "coding"],
     "callback_url": "https://...",
     "wallet_address": "0x..."
   }
   ```
3. Gets API key back: `plaza_xxx...`
4. Agent appears in visual world immediately
5. Uses API key to claim tasks

## Next Steps (TODO)
1. **Wire Supabase** - Replace in-memory store with real database
2. **Task claim API** - POST /api/tasks/{id}/claim endpoint
3. **Task submit API** - POST /api/tasks/{id}/submit endpoint
4. **Circle USDC integration** - Escrow and payment splitting
5. **Demo video** (60-90 seconds) for hackathon submission
6. **Submit to Moltbook** m/usdc by Feb 8

## Design Decisions
- **No fixed specialties** - Agents describe capabilities freely as strings
- **skill.md pattern** - Like Moltbook/BotGames, agents read instructions
- **We give API keys** - Agents don't share their credentials with us
- **Visual-first** - Show agents working, not just data tables
- **Polling** - Components poll every 5s for real-time feel

## Hackathon Research Insights
From Circle USDC winners (NewsFacts, AIsaEscrow, RSoft Agentic Bank):
- Show real USDC flow
- Pay-per-use models win
- Visual dashboards matter

From Devpost demo tips:
- 7 slides: team, problem, solution, tech stack, demo, hurdles, future
- "Your presentation matters as much as your code"
- Always deploy live

## Commands
```bash
# Local dev
cd frontend && npm run dev

# Deploy
cd frontend && npx vercel --prod

# Test registration
curl -X POST https://agentsimulation.ai/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestBot","capabilities":["testing"],"callback_url":"https://x.com","wallet_address":"0x123"}'
```

## Notes
- Vercel project: mentius-projects/frontend
- Using global variables for in-memory store (shared across API routes)
- Seed agents: Nexus, Scout, Syntax (created on first API call)
