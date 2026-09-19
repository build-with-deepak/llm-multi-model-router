# llm-multi-model-router

**Live demo:** not deployed yet — planned at `router.build-with-deepak.com`.
This repo is complete and locally verified (build, lint, unit + e2e tests);
it has not yet been deployed or exercised against a live Ollama/Postgres.
See [Status](#status).

## The problem

Every team running LLMs in production is paying for capability most of
their requests don't need. The default architecture — send everything to
the most capable model — is also the most expensive one, and it sends
every prompt, including the ones containing customer emails and API keys,
to a third party. This router puts a decision in front of the model call:
classify each request's complexity, sensitivity and latency needs, route
it to the cheapest model that is actually adequate — local inference when
possible, a cloud model when necessary — and show the decision and the
money it saved, on screen, per request and cumulatively.

## Try it

Two ways in, and one account for all three demos in this suite.

**Try it now — demo account** signs you in with one click against the real
API: same routing engine, same providers, same dashboard. It is a shared
account and its token carries `demo:read` only, so it can run everything
here and cannot make the server store anything. That is what lets the front
door stay open to anyone without putting a single VPS at the mercy of
whoever finds it.

**Create a free account** — first name, last name, email, optional phone,
then a six-digit code. No password to invent. A verified account carries
`demo:read demo:write` and keeps your request history beyond the demo
cleanup window, and the same account signs you into the other two demos.

Authentication is handled by a separate service,
[id.build-with-deepak.com](https://id.build-with-deepak.com). This API does
not mint tokens — it verifies them against that service's published JWKS, so
it holds no signing secret and *cannot* issue itself a session. Every
endpoint except `/health` requires one.

## Architecture

```mermaid
flowchart TB
    subgraph Browser
        UI[Angular SPA<br/>login → playground + dashboard]
    end

    subgraph VPS -- host nginx, TLS
        Nginx[nginx :443]
    end

    subgraph "Docker Compose stack"
        Web[web container<br/>nginx serving the Angular build]
        API[api container — NestJS<br/>auth · classifier · decision · providers]
        PG[(PostgreSQL<br/>request log)]
    end

    Ollama[Ollama — on the VPS, outside Docker]
    Cloud[Cloud LLM APIs<br/>OpenAI / Anthropic / Gemini<br/>only if keys configured]

    UI -->|HTTPS| Nginx --> Web -->|/api/*| API
    API -->|local route| Ollama
    API -->|cloud route| Cloud
    API -->|log + aggregate| PG
```

Request lifecycle (`POST /api/route/stream`, SSE over POST):

1. **Sensitivity check** — regex/keyword PII detection. A hit forces local
   inference, non-negotiably, and the response says which *categories*
   matched (never echoing the matched text back).
2. **Complexity score** — length, code, reasoning language, question
   structure → 0–1 → a minimum capability the chosen model must have.
3. **Latency budget** — visitor-selected fast/balanced/quality filters the
   candidates.
4. **Cheapest adequate model wins.** Local inference costs $0, so it wins
   every prompt it can handle — which is the entire cost-control story.
5. **Execution with a fallback chain** — if the chosen provider errors or
   times out, the next-cheapest candidate runs, ending at local; each hop
   is emitted as a visible `fallback` event.
6. **Metrics + persistence** — actual cost, cloud-only baseline cost,
   saved delta, TTFB/total latency and token counts are shown per request
   and logged to Postgres for the dashboard.

The dashboard aggregates in SQL (`percentile_cont` for p50/p95 by route,
filtered sums for cost-saved) rather than fetching rows into JS — see the
comment in `dashboard.service.ts`.

## Key decisions and trade-offs

**Heuristic classification, not an LLM classifier.** Asking a model to
classify the prompt costs a model call to decide whether to spend a model
call — and for sensitivity it means sending possibly-sensitive text to
exactly the place the check exists to protect it from. Regexes run in
microseconds and are auditable line by line. The cost is recall: a
heuristic misses PII a model might catch. That is why sensitivity only
ever forces traffic *local* — the two failure directions are asymmetric
(false negative: one prompt reaches a cloud API; false positive: one
prompt runs slower), and the design leans on the safe side. The full
reasoning is a comment on `ClassifyService`.

**The decision is a pure function.** `DecisionService.decide()` does no
I/O — it maps (prompt, budget, provider availability) to a decision
object. Every policy rule in the list above is asserted by a unit test,
including "cheapest adequate wins, NOT the best available" — a test that
initially expected the premium model for a mid-complexity prompt and
failed, correctly, because the policy refuses to buy capability the
prompt doesn't need.

**Missing cloud keys degrade honestly, never silently.** A provider
without an API key is *unavailable*: the decision panel shows its models
as "provider not configured on this deployment" and routing proceeds
local-only. Nothing is stubbed or simulated — a faked cloud response would
be indistinguishable from working until the exact moment someone checks.

**Prices are config, and dated.** The catalog (`catalog.ts`) carries
per-million-token prices checked against provider pricing pages when
written (`PRICED_AT`). A production router would sync from a billing API;
a demo that pretended its numbers were live would be lying with extra
steps. The baseline for "saved" is the most capable catalog model — the
comparison a router-less team actually faces — not a cheap strawman.

**Cloud providers are non-streaming; only Ollama streams.** TTFB against
local inference is measured from a real streamed read. For cloud calls,
one non-streaming request gives exact token usage with a third of the
code; their TTFB is reported as equal to total latency. The honest
latency comparison this demo cares about — "local is slower per token,
here's by how much" — survives; per-token streaming parity across three
cloud SDKs did not justify its complexity here.

**SSE over POST via fetch, not EventSource.** EventSource only speaks GET
and cannot send an Authorization header — the prompt would ride in a
query string and the session token in a URL. Fetch-streaming costs ~40
lines of frame parsing (unit-tested, including events split across
network chunks) and removes both problems.

**One table.** The persistence layer is an append-only request log that
the dashboard aggregates. Normalizing sessions or models into their own
tables adds joins to every dashboard query without changing any answer at
this scale.

## Database setup, seed and cleanup

- **Schema** (`apps/api/db/schema.sql`) applies idempotently on every API
  boot.
- **Seed**: on first boot against an empty database, the API generates
  ~220 request rows spread over the past 7 days (`seed = true`), so the
  dashboard is meaningful before the first visitor routes anything.
  Generated at boot rather than a static SQL file because the rows carry
  now-relative timestamps.
- **Cleanup**: an hourly in-app cron deletes demo-session rows older than
  `HISTORY_RETENTION_DAYS` (default 7), keeping seed rows. Manual
  equivalents: `pnpm db:cleanup` (same deletion) and `pnpm db:reset`
  (truncate everything; next API boot re-seeds). Reset is a script, not an
  endpoint — a public demo should not expose "delete everything" over HTTP.

## What I'd change at 100x scale

The classifier is the honest bottleneck: at scale you'd want learned
complexity scoring (a small local model, trained on your own routing
outcomes) and a proper PII detection layer, with the regex tier kept as
the fast path. The catalog would sync prices from billing APIs, and
routing would incorporate live provider health and observed p95s rather
than static latency classes — the log this demo already keeps is exactly
the training data for that. Per-request cost attribution would move from
"computed at response time" to reconciliation against provider invoices,
because the number a CFO acts on has to survive an audit, and a
token-count estimate doesn't.

## Local setup

Node 22+, pnpm, and for real routing: Postgres and Ollama reachable
locally. Without them, the API still boots (migrations retry lazily) and
auth/validation work; routing needs Ollama, the dashboard needs Postgres.

```bash
corepack enable && pnpm install

# terminal 1 — API on :3000
pnpm dev:api

# terminal 2 — frontend on :4200 (proxies /api → :3000)
pnpm dev:web
```

Gate checks:

```bash
pnpm --filter api build && pnpm --filter api lint && pnpm --filter api test && pnpm --filter api test:e2e
pnpm --filter web build && pnpm --filter web test
```

## Deploying to the VPS

1. `cp .env.example .env` — set `POSTGRES_PASSWORD`
   (compose refuses to start without them). Leave cloud keys empty unless
   you've set spend caps on the provider dashboards.
2. `docker compose up -d --build` — postgres + api + web; only web binds a
   host port, on `127.0.0.1:8091`.
3. Install `nginx/router.build-with-deepak.com.conf` into the host nginx
   and run `certbot --nginx -d router.build-with-deepak.com`.
4. `GET /api/health` is the unauthenticated liveness probe for uptime
   monitoring.

## Status

- [x] Full routing engine: sensitivity/complexity classification, pure
      decision function, cost accounting, fallback chain, SSE streaming
- [x] Identity service integration — one account across all three demos,
      email-OTP registration, shared read-only demo account, `demo:write`
      scope enforced on every endpoint that stores anything
- [x] Postgres request log + SQL-aggregated dashboard + boot-time seed +
      hourly cleanup cron + manual reset/cleanup scripts
- [x] Builds, lints, passes all tests (API: 17 unit + 6 e2e; web: 6 unit
      incl. the SSE frame parser)
- [ ] **Not yet run against live Ollama/Postgres** — this environment had
      neither; verify the full pipeline before pointing recruiters at it
- [ ] Not yet deployed; cloud provider keys not yet configured (runs
      local-only until then)
