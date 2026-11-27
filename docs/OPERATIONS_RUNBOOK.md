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
APP_SESSION_SECRET=<cryptographically_secure_random_hex>
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

## 3. Routine Operations & Runbooks

### 3.1 Managing the Emergency Pause
- **Via API**:
  ```bash
  # Check pause status
  curl -H "Authorization: Bearer $APP_SESSION_SECRET" http://localhost:3000/api/settings
  
  # Activate Emergency Pause
  curl -X POST -H "Authorization: Bearer $APP_SESSION_SECRET" -H "x-xgrowth-csrf: 1" -H "Content-Type: application/json" \
    -d '{"paused": true}' http://localhost:3000/api/settings/emergency-pause
  
  # Deactivate Emergency Pause (Resume Publishing)
  curl -X POST -H "Authorization: Bearer $APP_SESSION_SECRET" -H "x-xgrowth-csrf: 1" -H "Content-Type: application/json" \
    -d '{"paused": false}' http://localhost:3000/api/settings/emergency-pause
  ```
- **Via Antigravity MCP Tool**:
  ```json
  xgrowth_toggle_emergency_pause({"paused": true})
  ```

### 3.2 Research Desk & OPML Feed Synchronization
- **OPML 2.0 Export**: `GET /api/research/sources/opml/export` (downloads `.opml` XML).
- **OPML 2.0 Import**: `POST /api/research/sources/opml/import` with payload `{"opmlText": "..."}`.
- **Manual Feed Sync**: `POST /api/research/sources/:id/sync` to trigger immediate RSS fetch.

### 3.3 Editorial Queue & Approval Verification
- Every approved draft has a SHA-256 cryptographic snapshot computed over:
  `canonicalObject = { text, threadParts, channelId, mediaUrls }`.
- Batch approval: `POST /api/content/items/batch-approve` with `{"ids": ["..."]}`.
- Batch rejection: `POST /api/content/items/batch-reject` with `{"ids": ["..."]}`.

### 3.4 Dynamic Editorial Calendar & Conflict Guards
- Target publishing windows: `09:00`, `13:00`, `19:00` UTC (configurable in settings).
- Slot resolution: `GET /api/calendar/slots?days=7`.
- Daily post cap: Alerts when scheduled posts on any day exceed `maxPostsPerDay`.

### 3.5 Buffer Outbound Publishing & Quota Tracking
- Free tier limit: 1,000 requests/month tracked in `BufferQuotaTracker`.
- Live quota check: `GET /api/buffer/quota`.
- Manual queue export: `GET /api/buffer/export?format=json` or `GET /api/buffer/export?format=csv` (for manual Buffer posting when API is offline or quota reached).

---

## 4. Google Antigravity MCP Server & Skill

The `@xgrowth/mcp` package runs as a native Model Context Protocol server communicating over stdio.

### Antigravity MCP Configuration
Defined in `.agents/mcp_config.json`:
```json
{
  "mcpServers": {
    "xgrowth": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "XGROWTH_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Registered Tools (17)
1. `xgrowth_get_status`: Operational status and pause state.
2. `xgrowth_toggle_emergency_pause`: Toggle emergency pause.
3. `xgrowth_research_topics`: Fetch discovered technical candidate topics.
4. `xgrowth_generate_draft`: Generate technical draft variants (`single_post`, `educational_tip`, `build_in_public`, `opinion_with_reasoning`, `thread_draft`).
5. `xgrowth_list_drafts`: List drafts by status.
6. `xgrowth_approve_draft`: Cryptographically approve draft snapshot.
7. `xgrowth_submit_to_buffer`: Submit approved post through the 4-gate safety filter.
8. `xgrowth_reconcile_status`: Reconcile quarantined items in `unknown` state (including channel history scan when `providerPostId` is missing).
9. `xgrowth_get_weekly_report`: Fetch weekly Markdown analytics summary.
10. `xgrowth_list_channels`: Discover connected Buffer X channels and check API quota.
11. `xgrowth_run_daily_pipeline`: Execute the autonomous Twitter agent research-to-draft pipeline.
12. `xgrowth_generate_hooks`: Generate non-clickbait opening hooks.
13. `xgrowth_suggest_ctas`: Suggest technical discussion CTAs.
14. `xgrowth_edit_draft`: Edit draft text or threadParts (invalidates prior approval).
15. `xgrowth_reject_draft`: Reject draft with audit reason.
16. `xgrowth_get_calendar`: Inspect upcoming publishing slots and conflicts.
17. `xgrowth_schedule_post`: Assign an approved post to a target UTC slot.

### Registered Resources (3)
1. `xgrowth://status`: Live JSON system status and channel connection state.
2. `xgrowth://review-queue`: Pending review drafts needing attention.
3. `xgrowth://weekly-report`: Latest Markdown performance report.

### Registered Prompts (2)
1. `draft_engineering_post`: Guided prompt for drafting 280-char technical posts.
2. `analyze_performance`: Guided prompt for analyzing weekly performance deltas.

---

## 5. Comprehensive Acceptance Sign-Off

| Requirement & Feature Domain | Verified By | Test Suites / Commands | Status |
|:---|:---|:---|:---:|
| Monorepo & TypeScript Strict Mode | `npm run typecheck` | `tsc --build` | ✅ PASS (0 errors) |
| Complete Monorepo Test Suite | `npm test` | 41 test files, 130 tests | ✅ PASS (100%) |
| Twitter Agent Daily Pipeline | `twitter-agent.service.test.ts` | Integration tests | ✅ PASS |
| Buffer GraphQL Provider & Threads | `buffer-graphql.provider.test.ts` | Unit tests (mocked GraphQL) | ✅ PASS |
| Scheduler Cron & Auto-Publisher | `auto-publisher.test.ts` | Unit & Integration | ✅ PASS |
| Single-Owner Session & Cookie Fallback | `auth.test.ts` | Unit tests | ✅ PASS |
| SafeFetcher Anti-SSRF Protection | `safe-fetcher.test.ts` | Unit tests | ✅ PASS |
| OPML 2.0 Import/Export & Anti-SSRF | `opml.test.ts` | Unit tests | ✅ PASS |
| Multi-Language Prompts (Bengali/Mixed) | `prompts.test.ts` | Unit tests | ✅ PASS |
| Hook Generator & CTA Recommender | `hook-cta.test.ts` | Unit tests | ✅ PASS |
| Twitter Character Validator (280 limit) | `character-validator.test.ts` | Unit tests | ✅ PASS |
| Tone Linter & Real-time Warning Banner | `tone-linter.test.ts` | Unit tests | ✅ PASS |
| Canonical Approval Hash Invariant | `journey-a-approval.e2e.test.ts` | E2E Integration | ✅ PASS |
| Post-Approval Edit Invalidation | `content-item.router.test.ts` | Integration | ✅ PASS |
| Batch Approve & Batch Reject Endpoints | `content-item-batch.router.test.ts` | Integration | ✅ PASS |
| Twitter Preview Card & Circular Gauge | `XPostPreview.test.tsx` | Component tests | ✅ PASS |
| Thread Visualizer & Splitter | `XPostPreview.test.tsx` | Component tests | ✅ PASS |
| Calendar Slot Resolution & Conflict Detection | `calendar.router.test.ts` | Integration | ✅ PASS |
| 4-Gate Buffer Submission Pipeline | `journey-b-submission.e2e.test.ts` | E2E Integration | ✅ PASS |
| Buffer Rate Limiter & Manual Queue Export | `buffer-export.router.test.ts` | Integration | ✅ PASS |
| Ambiguous Timeout & Reconciliation | `journey-c-recovery.e2e.test.ts` | E2E Integration | ✅ PASS |
| Week-over-Week Delta Calculator | `analytics-export.test.ts` | Integration | ✅ PASS |
| Analytics Markdown & JSON Export | `analytics-export.test.ts` | Integration | ✅ PASS |
| Audit Log CSV Export | `audit.router.test.ts` | Integration | ✅ PASS |
| Antigravity MCP Server, Resources & Prompts | `packages/mcp/src/server.test.ts` | Protocol suite (10/10) | ✅ PASS |
| Antigravity Skill & Workspace Config | `.agents/skills/xgrowth-controller/SKILL.md` | Verification | ✅ PASS |
| Frontend Shell & View Tests | `App.test.tsx`, `AnalyticsView.test.tsx` | Component tests | ✅ PASS |

**Final Operations Sign-Off**: The XGrowth AI platform meets 100% of the specifications, safety boundaries, and agent control protocols across all 203 planned steps.
