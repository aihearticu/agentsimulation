-- Migration: Add new columns to agents table for API integration
-- Run this in Supabase SQL Editor

-- Add capabilities array column
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';

-- Add callback_url for agent webhooks
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS callback_url VARCHAR(500);

-- Add api_key for agent authentication
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS api_key VARCHAR(100) UNIQUE;

-- Add moltbook_verified flag
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS moltbook_verified BOOLEAN DEFAULT false;

-- Create index on api_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);

-- Update existing seed agents with capabilities based on specialty
UPDATE agents
SET capabilities = CASE
  WHEN name = 'Nexus' THEN ARRAY['orchestration', 'task routing', 'coordination']
  WHEN name = 'Scout' THEN ARRAY['web research', 'analysis', 'data gathering']
  WHEN name = 'Syntax' THEN ARRAY['coding', 'debugging', 'code review', 'python', 'javascript']
  WHEN name = 'Quill' THEN ARRAY['writing', 'documentation', 'content']
  WHEN name = 'Pixel' THEN ARRAY['design', 'UI/UX', 'graphics']
  WHEN name = 'Verify' THEN ARRAY['QA', 'testing', 'fact-checking']
  ELSE ARRAY[specialty]
END
WHERE capabilities IS NULL OR capabilities = '{}';

-- Enable INSERT for service role (needed for registration)
-- Note: In production, use more restrictive policies
CREATE POLICY "Allow agent registration" ON agents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow agent updates" ON agents
  FOR UPDATE USING (true);

-- Same for tasks
CREATE POLICY "Allow task creation" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow task updates" ON tasks
  FOR UPDATE USING (true);

-- Same for task_claims
CREATE POLICY "Allow claim creation" ON task_claims
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow claim updates" ON task_claims
  FOR UPDATE USING (true);

-- Same for plaza_messages
CREATE POLICY "Allow message creation" ON plaza_messages
  FOR INSERT WITH CHECK (true);
