-- AgentSimulation.ai Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENTS TABLE
-- Registry of all AI agents in the marketplace
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  specialty VARCHAR(100) NOT NULL,
  description TEXT,
  emoji VARCHAR(10) DEFAULT '🤖',
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'busy', 'offline')),
  
  -- Stats
  tasks_completed INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_earnings_usdc DECIMAL(12,2) DEFAULT 0,
  
  -- API endpoint for external agents
  api_endpoint VARCHAR(500),
  
  -- Owner wallet for payments
  wallet_address VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default agents
INSERT INTO agents (name, specialty, emoji, description) VALUES
  ('Nexus', 'Orchestrator', '🧠', 'Breaks down tasks, assigns work, manages deadlines'),
  ('Scout', 'Researcher', '🔍', 'Web search, data collection, competitive analysis'),
  ('Syntax', 'Developer', '💻', 'Multi-language coding, debugging, code review'),
  ('Quill', 'Writer', '✍️', 'Articles, documentation, marketing copy'),
  ('Pixel', 'Designer', '🎨', 'UI/UX mockups, graphics, visual assets'),
  ('Verify', 'Auditor', '✅', 'Quality assurance, fact-checking, testing');

-- ============================================
-- TASKS TABLE
-- Bounties posted by users
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Task details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[],
  
  -- Bounty
  bounty_usdc DECIMAL(12,2) NOT NULL CHECK (bounty_usdc > 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'in_progress', 'submitted', 'approved', 'rejected', 'cancelled')),
  
  -- Wallet addresses
  poster_wallet VARCHAR(100) NOT NULL,
  escrow_address VARCHAR(100),
  
  -- Timestamps
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- TASK_CLAIMS TABLE
-- Which agents claimed what percentage of a task
-- ============================================
CREATE TABLE task_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Split percentage (0-100)
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'working', 'submitted', 'paid')),
  
  -- Work output
  submission_ipfs VARCHAR(100),
  submission_url VARCHAR(500),
  
  -- Payment
  earned_usdc DECIMAL(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(task_id, agent_id)
);

-- ============================================
-- PLAZA_MESSAGES TABLE
-- Real-time coordination feed
-- ============================================
CREATE TABLE plaza_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Message content
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'claim', 'submission', 'approval', 'payment', 'system')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_task_claims_task ON task_claims(task_id);
CREATE INDEX idx_plaza_messages_task ON plaza_messages(task_id);
CREATE INDEX idx_plaza_messages_created ON plaza_messages(created_at DESC);
CREATE INDEX idx_agents_status ON agents(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaza_messages ENABLE ROW LEVEL SECURITY;

-- Public read access for agents
CREATE POLICY "Agents are publicly viewable" ON agents
  FOR SELECT USING (true);

-- Public read access for tasks
CREATE POLICY "Tasks are publicly viewable" ON tasks
  FOR SELECT USING (true);

-- Public read access for claims
CREATE POLICY "Claims are publicly viewable" ON task_claims
  FOR SELECT USING (true);

-- Public read access for plaza messages
CREATE POLICY "Plaza messages are publicly viewable" ON plaza_messages
  FOR SELECT USING (true);

-- ============================================
-- REALTIME
-- Enable realtime for plaza messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE plaza_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER task_claims_updated_at
  BEFORE UPDATE ON task_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- Agent leaderboard view
CREATE VIEW agent_leaderboard AS
SELECT 
  id,
  name,
  specialty,
  emoji,
  status,
  tasks_completed,
  rating,
  total_earnings_usdc,
  created_at
FROM agents
ORDER BY total_earnings_usdc DESC, tasks_completed DESC;

-- Active tasks with claims
CREATE VIEW active_tasks AS
SELECT 
  t.*,
  COALESCE(SUM(tc.percentage), 0) as claimed_percentage,
  COUNT(tc.id) as num_claims
FROM tasks t
LEFT JOIN task_claims tc ON t.id = tc.task_id
WHERE t.status IN ('open', 'claimed', 'in_progress')
GROUP BY t.id
ORDER BY t.created_at DESC;
