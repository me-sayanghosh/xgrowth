# XGrowth AI — Production Operations Runbook & Acceptance Sign-Off

## 1. System Overview & Core Invariants

XGrowth AI is an autonomous, human-in-the-loop content operations platform for software engineers building their technical brand on X (Twitter).

### Fundamental Safety Invariants
1. **Buffer-First Outbound Publishing**:
   - Buffer is the sole external provider for publishing and scheduling to X.
   - Zero direct X API connections, browser automation bots, or unauthorized scraping.
2. **Dual-Gate Safety & Global Emergency Pause**:
   - `global_pause: true` is enabled by default in all new environments and database seeding.
   - When active, all external write calls (`/api/buffer/submit`) are blocked at Gate 1.
   - Local drafting, AI ideation, research ingestion, and content editing remain fully functional.
3. **Cryptographic Approval Invariant**:
   - Content items can only be published if status is `approved` and the canonical SHA-256 hash matches the approval record.
   - Any post-approval edit immediately revokes approval, transitions the item back to `needs_review`, and nullifies the stored hash.
4. **Ambiguity Quarantine & No Blind Retries**:
   - If an external call times out or returns an ambiguous network error, the item is quarantined in `unknown` state.
   - Blind retries are strictly prohibited; recovery requires explicit reconciliation via `StatusReconciliationService`.
5. **Zero Hallucination of Metrics**:
   - Metrics not provided by Buffer API (e.g. native impression analytics on free tiers) are explicitly attributed with `available: false` and `unavailableReason: "Not available from connected provider"`.

---

## 2. Deployment & Container Orchestration

### Prerequisites
- Node.js >= 22.0.0
- Docker Engine >= 24.0.0 & Docker Compose >= 2.20.0
- MongoDB >= 7.0 (or managed MongoDB Atlas cluster)

### Environment Configuration
Create a `.env` file at the repository root based on `.env.example`:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/xgrowth
BUFFER_API_KEY=<your_buffer_personal_api_key>
GEMINI_API_KEY=<your_google_gemini_api_key>
GLOBAL_PAUSE=true
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=<cryptographically_secure_random_hex>
```

### Launching the Stack via Docker Compose
```bash
# Build and run MongoDB and API containers in detached mode
docker compose up -d --build

# Verify container health status
docker compose ps
```

Healthchecks verify:
- MongoDB ping command on port 27017.
- API liveness endpoint at `http://localhost:3000/api/health`.
- API readiness endpoint at `http://localhost:3000/api/ready`.

---

## 3. Database Initialization & Seeding

Run the seed script to initialize operational settings, brand pillars, trusted research feeds, and scheduled jobs:
```bash
# In local development:
npm run seed

# In production container:
docker compose exec api npm run seed
```

This populates:
- `UserSettings` with `globalPause: true` and configured brand voice traits.
- 4 curated engineering research sources (Martin Fowler, Uber Engineering, Netflix TechBlog, Node.js).
- 3 standard background scheduler jobs (`RESEARCH_SYNC`, `STATUS_RECONCILIATION`, `ANALYTICS_IMPORT`).

---

## 4. Emergency Pause Procedures

### How to Activate Emergency Pause
- **Via Web UI**: Click "Activate Emergency Pause" on the top banner or dashboard.
- **Via REST API**:
  ```bash
  curl -X POST http://localhost:3000/api/settings/emergency-pause \
    -H "Content-Type: application/json" \
    -H "x-xgrowth-csrf: 1" \
    -d '{"paused": true}'
  ```

### Verification of Pause State
```bash
curl http://localhost:3000/api/settings | grep '"globalPause":true'
```
When paused, all calls to `POST /api/buffer/submit` will immediately fail with status 500:
`"Submission blocked: Global emergency pause is active. All outbound publishing is halted."`

---

## 5. Secret Rotation & Key Management

### Rotating `BUFFER_API_KEY`
1. Generate a new Personal API Key in Buffer Dashboard > Account > Access Tokens.
2. Update `BUFFER_API_KEY` in environment variables / secret store.
3. Perform zero-downtime rolling restart:
   ```bash
   docker compose up -d --no-deps api
   ```
4. Verify channel connectivity via `GET /api/buffer/channels`.

### Rotating `GEMINI_API_KEY`
1. Generate a new Gemini API Key in Google AI Studio.
2. Update `GEMINI_API_KEY` in environment variables.
3. Restart API service and verify generation via `POST /api/content/generate`.

---

## 6. Ambiguous Submission Recovery & Reconciliation

When an outbound Buffer submission experiences a socket timeout or 504 Gateway error:
1. Content item status is transitioned to `unknown`.
2. Inspect quarantined items in the Web UI **Reconciliation Recovery Drawer** or via API:
   ```bash
   curl http://localhost:3000/api/content/items?status=unknown
   ```
3. Trigger automated safe reconciliation:
   ```bash
   curl -X POST http://localhost:3000/api/buffer/reconcile/<content_item_id> \
     -H "x-xgrowth-csrf: 1"
   ```
4. The service queries Buffer channel history. If the post exists in Buffer queue, status transitions to `queued`. If not found, status safely resolves so the owner can review before re-submitting.

---

## 7. Buffer API Rate Limit & Monthly Quota Management

- Buffer Free Tier limits accounts to **1,000 requests per channel per 30-day period** (capped at 3,000 total requests across all channels).
- The internal `BufferRateLimiter` tracks daily and monthly request volumes.
- Channel metadata is cached for 10 minutes in `ChannelDiscoveryService` to avoid redundant calls.
- In-memory/persistent counters can be inspected at `GET /api/buffer/channels`.

---

## 8. Final Acceptance Checklist & Verification Sign-Off

| Requirement | Verified By | Status |
|:---|:---|:---:|
| Monorepo & TypeScript Strict Mode | `npm run typecheck` (`tsc --build`) | ✅ PASS |
| Complete Multi-Project Test Suite | `npm test` (all 23 test suites) | ✅ PASS |
| Single-Owner Session & CSRF Defense | `apps/api/test/security/security-audit.test.ts` | ✅ PASS |
| SafeFetcher Anti-SSRF Protection | `SafeFetcher.isSafeUrl()` & unit tests | ✅ PASS |
| Tone & Anti-Hype Linter | `ToneLinter.lintDraft()` & unit tests | ✅ PASS |
| 280-Character Tweet Validator | `TwitterCharacterValidator.validate()` | ✅ PASS |
| Canonical Approval Hash Invariant | Journey A E2E (`journey-a-approval.e2e.test.ts`) | ✅ PASS |
| Post-Approval Edit Invalidation | Journey A E2E (`journey-a-approval.e2e.test.ts`) | ✅ PASS |
| 4-Gate Buffer Submission Pipeline | Journey B E2E (`journey-b-submission.e2e.test.ts`) | ✅ PASS |
| Ambiguous Timeout & Reconciliation | Journey C E2E (`journey-c-recovery.e2e.test.ts`) | ✅ PASS |
| Metric Normalization & Report Synthesis | Journey D E2E (`journey-d-reporting.e2e.test.ts`) | ✅ PASS |
| Frontend Shell & Navigation | Component tests (`App.test.tsx`) | ✅ PASS |
| Database Seeding with Safe Defaults | `seed.ts` & `seed.test.ts` | ✅ PASS |
| Multi-Stage Production Docker Build | `Dockerfile` & `docker-compose.yml` | ✅ PASS |

**System Sign-Off**: The XGrowth AI platform meets all architectural specifications, safety boundaries, and operational constraints defined in `PRD.md`, `WORKFLOW.md`, `PROMPT.md`, and `AGENTS.md`.
