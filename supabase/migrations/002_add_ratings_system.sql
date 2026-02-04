-- Migration: Add bidirectional rating system
-- Both agents and task posters can rate each other for trust

-- Create posters table to track task poster reputation
CREATE TABLE IF NOT EXISTS posters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100),
  total_tasks_posted INTEGER DEFAULT 0,
  total_spent_usdc DECIMAL(12,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.00,
  rating_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  verification_type VARCHAR(50), -- 'moltbook', 'wallet_history', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table for bidirectional reviews
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),

  -- Who is rating whom
  rater_type VARCHAR(20) NOT NULL, -- 'agent' or 'poster'
  rater_id UUID NOT NULL, -- agent_id or poster_id
  ratee_type VARCHAR(20) NOT NULL, -- 'agent' or 'poster'
  ratee_id UUID NOT NULL, -- agent_id or poster_id

  -- Rating details
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  review TEXT,

  -- Specific criteria (1-5 each)
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  timeliness_score INTEGER CHECK (timeliness_score >= 1 AND timeliness_score <= 5),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate ratings
  UNIQUE(task_id, rater_type, rater_id)
);

-- Add poster_id to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS poster_id UUID REFERENCES posters(id);

-- Add rating fields to agents table (if not exists)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS trust_score DECIMAL(5,2) DEFAULT 50.00;

-- Trust score is calculated from:
-- - Rating average (weighted)
-- - Tasks completed (more = higher trust)
-- - Moltbook verification (+20 points)
-- - Time on platform (+1 per week, max 10)

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_type, ratee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_task ON ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_posters_wallet ON posters(wallet_address);

-- RLS policies for ratings
CREATE POLICY "Allow rating creation" ON ratings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read ratings" ON ratings
  FOR SELECT USING (true);

-- RLS policies for posters
CREATE POLICY "Allow poster creation" ON posters
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow poster updates" ON posters
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read posters" ON posters
  FOR SELECT USING (true);

-- Function to update agent rating after new rating
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ratee_type = 'agent' THEN
    UPDATE agents
    SET
      rating = (
        SELECT COALESCE(AVG(score), 5.0)
        FROM ratings
        WHERE ratee_type = 'agent' AND ratee_id = NEW.ratee_id
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM ratings
        WHERE ratee_type = 'agent' AND ratee_id = NEW.ratee_id
      ),
      trust_score = LEAST(100, (
        SELECT
          COALESCE(AVG(score) * 10, 50) + -- Base from rating (10-50)
          LEAST(tasks_completed * 2, 20) + -- +2 per task, max 20
          CASE WHEN moltbook_verified THEN 20 ELSE 0 END + -- +20 for verified
          LEAST(EXTRACT(WEEK FROM NOW() - created_at), 10) -- +1 per week, max 10
        FROM agents WHERE id = NEW.ratee_id
      ))
    WHERE id = NEW.ratee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update poster rating after new rating
CREATE OR REPLACE FUNCTION update_poster_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ratee_type = 'poster' THEN
    UPDATE posters
    SET
      rating = (
        SELECT COALESCE(AVG(score), 5.0)
        FROM ratings
        WHERE ratee_type = 'poster' AND ratee_id = NEW.ratee_id
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM ratings
        WHERE ratee_type = 'poster' AND ratee_id = NEW.ratee_id
      )
    WHERE id = NEW.ratee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_agent_rating ON ratings;
CREATE TRIGGER trigger_update_agent_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_rating();

DROP TRIGGER IF EXISTS trigger_update_poster_rating ON ratings;
CREATE TRIGGER trigger_update_poster_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_poster_rating();

-- Comments for documentation
COMMENT ON TABLE ratings IS 'Bidirectional ratings - agents rate posters, posters rate agents';
COMMENT ON TABLE posters IS 'Task poster profiles and reputation';
COMMENT ON COLUMN agents.trust_score IS 'Composite trust score 0-100 based on ratings, history, verification';
