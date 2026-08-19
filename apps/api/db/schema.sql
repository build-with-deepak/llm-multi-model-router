-- Idempotent schema, executed on every API boot (see db.service.ts). One
-- table on purpose: the router's persistence needs are an append-only
-- request log that the dashboard aggregates over — normalizing sessions or
-- models into their own tables would add joins to every dashboard query
-- without changing any answer, at this scale.

CREATE TABLE IF NOT EXISTS requests (
  id               uuid PRIMARY KEY,
  session_id       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  route            text NOT NULL CHECK (route IN ('local', 'cloud')),
  provider         text NOT NULL,
  model            text NOT NULL,
  complexity       real NOT NULL,
  sensitive        boolean NOT NULL,
  latency_budget   text NOT NULL,
  input_tokens     integer NOT NULL,
  output_tokens    integer NOT NULL,
  cost_usd         numeric(12, 6) NOT NULL,
  baseline_cost_usd numeric(12, 6) NOT NULL,
  ttfb_ms          integer NOT NULL,
  total_ms         integer NOT NULL,
  fallback_used    boolean NOT NULL DEFAULT false,
  -- Seed rows make the dashboard meaningful on first visit; flagging them
  -- keeps them out of the demo-data cleanup and lets a reader filter them.
  seed             boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests (created_at);
CREATE INDEX IF NOT EXISTS idx_requests_session ON requests (session_id);
