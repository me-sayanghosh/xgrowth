# XGrowth AI — Master Implementation Plan (142 Steps)

This document specifies the complete, sequential implementation plan for **XGrowth AI**. It decomposes the entire product specification ([PRD.md](file:///Users/sayanghosh/Personal%20Projects/xgrowth/PRD.md), [WORKFLOW.md](file:///Users/sayanghosh/Personal%20Projects/xgrowth/WORKFLOW.md), [PROMPT.md](file:///Users/sayanghosh/Personal%20Projects/xgrowth/PROMPT.md), and [docs/](file:///Users/sayanghosh/Personal%20Projects/xgrowth/docs/)) into **142 granular, verifiable steps** across **14 phases (sub-plans)**.

---

## Operating Protocol for Each Step

Every step must strictly adhere to the following sequence:
1. **Execute Tasks**: Create or modify the specified files and write production-grade code adhering to `TypeScript strict mode`.
2. **Execute Verification**: Run the exact verification command. Verify that the command succeeds and all assertions pass.
3. **Commit to Current Branch**: Execute git commit on the current branch (`main`) using the specified commit message.
4. **Handoff**: Only proceed to the next step once the current step's verification passes cleanly. Never batch unverified changes across steps.

---

# Plan 1: Phase 0 — Discovery, Governance & ADRs (Steps 001–007)

### Step 001: Architecture Decision Record: Monorepo & Technology Stack
- **Tasks**: Create `docs/adr/0001-monorepo-tech-stack.md` documenting npm workspaces monorepo architecture (`apps/api`, `apps/web`, `packages/shared`, `packages/config`), Node.js v24 runtime, Express backend, React/Vite/Tailwind frontend, MongoDB/Mongoose ORM, and Vitest test runner.
- **Verification**: `test -f docs/adr/0001-monorepo-tech-stack.md && grep -q "0001-monorepo-tech-stack" docs/adr/0001-monorepo-tech-stack.md`
- **Git Commit**: `git add docs/adr/0001-monorepo-tech-stack.md && git commit -m "docs(adr): record monorepo and tech stack architecture decision"`

### Step 002: Architecture Decision Record: Buffer API Boundary & Rate Limits
- **Tasks**: Create `docs/adr/0002-buffer-api-boundary.md` documenting Buffer GraphQL boundary (`https://api.buffer.com`), single-owner personal API key authentication, Free plan 1,000 req/month limits, caching policy, absence of native comment/reply API, and public media URL prerequisites.
- **Verification**: `test -f docs/adr/0002-buffer-api-boundary.md && grep -q "https://api.buffer.com" docs/adr/0002-buffer-api-boundary.md`
- **Git Commit**: `git add docs/adr/0002-buffer-api-boundary.md && git commit -m "docs(adr): record buffer graphql boundary and rate limit constraints"`

### Step 003: Architecture Decision Record: Cryptographic Approval Hash Invariant
- **Tasks**: Create `docs/adr/0003-cryptographic-approval-hash.md` defining SHA-256 canonical hashing over normalized draft text, thread parts, target channel, and media URLs. Explicitly document that any post-approval edit invalidates approval state.
- **Verification**: `test -f docs/adr/0003-cryptographic-approval-hash.md && grep -q "SHA-256" docs/adr/0003-cryptographic-approval-hash.md`
- **Git Commit**: `git add docs/adr/0003-cryptographic-approval-hash.md && git commit -m "docs(adr): record cryptographic approval hash invariant"`

### Step 004: Architecture Decision Record: Dual-Gate Safety & Global Pause
- **Tasks**: Create `docs/adr/0004-dual-gate-safety-and-pause.md` detailing the dual-gate enforcement: (1) content approval status check, and (2) persistent global pause boolean check. Outlines how external writes are intercepted while allowing local research and drafting.
- **Verification**: `test -f docs/adr/0004-dual-gate-safety-and-pause.md && grep -q "global_pause" docs/adr/0004-dual-gate-safety-and-pause.md`
- **Git Commit**: `git add docs/adr/0004-dual-gate-safety-and-pause.md && git commit -m "docs(adr): record dual-gate safety and emergency pause architecture"`

### Step 005: Architecture Decision Record: Ambiguous Submissions & Idempotency
- **Tasks**: Create `docs/adr/0005-ambiguous-submissions-idempotency.md` detailing timeout handling, client-generated duplicate prevention keys, transition to `unknown` state, and reconciliation requirements before any retry attempt.
- **Verification**: `test -f docs/adr/0005-ambiguous-submissions-idempotency.md && grep -q "unknown" docs/adr/0005-ambiguous-submissions-idempotency.md`
- **Git Commit**: `git add docs/adr/0005-ambiguous-submissions-idempotency.md && git commit -m "docs(adr): record ambiguous submission recovery and idempotency policy"`

### Step 006: Workspace Hygiene & Clean `.gitignore`
- **Tasks**: Update `.gitignore` to strictly exclude `.DS_Store`, `node_modules`, `dist`, `.env`, `.env.local`, `coverage`, and temporary build artifacts. Remove any tracked `.DS_Store` files.
- **Verification**: `grep -q "node_modules" .gitignore && grep -q ".env" .gitignore && git status --porcelain | grep -v "\.DS_Store" || true`
- **Git Commit**: `git add .gitignore && git commit -m "chore: configure root gitignore for monorepo and secrets hygiene"`

### Step 007: Phase 0 Governance Verification & Sign-off
- **Tasks**: Create `docs/reports/phase-0-signoff.md` summarizing the ADRs, verified API constraints, and readiness to initiate Phase 1 monorepo scaffolding.
- **Verification**: `test -f docs/reports/phase-0-signoff.md && grep -q "Phase 0 Sign-off" docs/reports/phase-0-signoff.md`
- **Git Commit**: `git add docs/reports/phase-0-signoff.md && git commit -m "docs(report): record phase 0 governance sign-off and baseline checklist"`

---

# Plan 2: Phase 1A — Monorepo Scaffolding & Tooling (Steps 008–018)

### Step 008: Root Monorepo Package Setup
- **Tasks**: Create root `package.json` with `private: true`, configuring npm workspaces for `packages/*` and `apps/*`, scripts for `build`, `test`, `lint`, `typecheck`, and `dev`.
- **Verification**: `node -e 'const pkg = require("./package.json"); if (!pkg.workspaces) process.exit(1);'`
- **Git Commit**: `git add package.json && git commit -m "build: scaffold root npm workspaces package.json"`

### Step 009: Root TypeScript Base Configurations
- **Tasks**: Create `tsconfig.base.json` with strict mode enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `esModuleInterop: true`, `target: ES2022`, `moduleResolution: node16/nodenext`) and root `tsconfig.json`.
- **Verification**: `test -f tsconfig.base.json && test -f tsconfig.json`
- **Git Commit**: `git add tsconfig.base.json tsconfig.json && git commit -m "chore: setup root typescript base configuration with strict mode"`

### Step 010: Code Formatting & Linting Tooling
- **Tasks**: Add `.prettierrc`, `.prettierignore`, `eslint.config.mjs` supporting TypeScript linting and workspace package resolution.
- **Verification**: `test -f .prettierrc && test -f eslint.config.mjs`
- **Git Commit**: `git add .prettierrc .prettierignore eslint.config.mjs && git commit -m "chore: configure root prettier and eslint tooling"`

### Step 011: Shared Package Scaffolding (`packages/shared`)
- **Tasks**: Initialize `packages/shared` with `package.json`, `tsconfig.json`, and entrypoint `src/index.ts`. Configure package name `@xgrowth/shared`.
- **Verification**: `test -f packages/shared/package.json && test -f packages/shared/src/index.ts`
- **Git Commit**: `git add packages/shared && git commit -m "build(shared): scaffold shared domain package"`

### Step 012: Config Package Scaffolding (`packages/config`)
- **Tasks**: Initialize `packages/config` with `package.json`, `tsconfig.json`, and entrypoint `src/index.ts`. Configure package name `@xgrowth/config`.
- **Verification**: `test -f packages/config/package.json && test -f packages/config/src/index.ts`
- **Git Commit**: `git add packages/config && git commit -m "build(config): scaffold configuration package"`

### Step 013: Environment Variables Validation in `packages/config`
- **Tasks**: Implement `src/env.ts` in `packages/config` using Zod to parse and validate `NODE_ENV`, `PORT`, `APP_URL`, `API_URL`, `MONGODB_URI`, `APP_SESSION_SECRET`, `BUFFER_API_KEY`, and `GEMINI_API_KEY`.
- **Verification**: `test -f packages/config/src/env.ts`
- **Git Commit**: `git add packages/config/src/env.ts && git commit -m "feat(config): add zod environment validation schema"`

### Step 014: Settings Loader in `packages/config`
- **Tasks**: Implement `src/settings-loader.ts` to read, parse, and validate YAML settings against `config/settings.example.yaml` using Zod schemas.
- **Verification**: `test -f packages/config/src/settings-loader.ts`
- **Git Commit**: `git add packages/config/src/settings-loader.ts && git commit -m "feat(config): implement yaml settings parser and validator"`

### Step 015: Backend Application Scaffolding (`apps/api`)
- **Tasks**: Initialize `apps/api` with `package.json`, `tsconfig.json`, source directory `src/`, entrypoint `src/index.ts`, and server bootstrap skeleton.
- **Verification**: `test -f apps/api/package.json && test -f apps/api/src/index.ts`
- **Git Commit**: `git add apps/api && git commit -m "build(api): scaffold express backend application"`

### Step 016: Frontend Application Scaffolding (`apps/web`)
- **Tasks**: Initialize `apps/web` with `package.json`, Vite configuration `vite.config.ts`, Tailwind configuration `tailwind.config.ts`, `postcss.config.js`, `index.html`, and `src/App.tsx`.
- **Verification**: `test -f apps/web/package.json && test -f apps/web/vite.config.ts && test -f apps/web/src/App.tsx`
- **Git Commit**: `git add apps/web && git commit -m "build(web): scaffold react vite tailwind web application"`

### Step 017: Vitest Workspace Test Configuration
- **Tasks**: Create root `vitest.workspace.ts` and `vitest.config.ts` configuring multi-project test runners for shared, config, api, and web.
- **Verification**: `test -f vitest.config.ts`
- **Git Commit**: `git add vitest.config.ts && git commit -m "test: configure root vitest multi-project test environment"`

### Step 018: Monorepo Dependency Installation & Compilation Test
- **Tasks**: Run `npm install` across all packages and run initial root typecheck.
- **Verification**: `npm run typecheck || npx tsc --build`
- **Git Commit**: `git add package-lock.json && git commit -m "build: install dependencies and verify clean typescript compilation"`

---

# Plan 3: Phase 1B — Shared Contracts, Domain Types & Schemas (Steps 019–030)

### Step 019: Content Status & Format Enums in `@xgrowth/shared`
- **Tasks**: Implement `src/enums/content.ts` in `packages/shared` defining `ContentStatus` (`idea`, `researched`, `draft`, `needs_review`, `approved`, `submitted_to_buffer`, `queued`, `published`, `rejected`, `archived`, `failed`, `unknown`, `needs_source_review`, `paused`) and `ContentFormat` (`single_post`, `educational_tip`, `build_in_public`, `opinion_with_reasoning`, `thread_draft`).
- **Verification**: `test -f packages/shared/src/enums/content.ts`
- **Git Commit**: `git add packages/shared/src/enums/content.ts && git commit -m "feat(shared): define content status and format domain enums"`

### Step 020: Result & Either Type Abstractions in `@xgrowth/shared`
- **Tasks**: Implement `src/types/result.ts` defining `Result<T, E>`, `ok(value)`, `err(error)`, and `UnsupportedCapabilityError`.
- **Verification**: `test -f packages/shared/src/types/result.ts`
- **Git Commit**: `git add packages/shared/src/types/result.ts && git commit -m "feat(shared): implement Result type and unsupported capability abstractions"`

### Step 021: Content Item Zod Schema & Interfaces in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/content-item.ts` matching `schemas/content-item.schema.json` with full Zod validation including `threadParts`, `qualityFlags`, and `riskFlags`.
- **Verification**: `test -f packages/shared/src/schemas/content-item.ts`
- **Git Commit**: `git add packages/shared/src/schemas/content-item.ts && git commit -m "feat(shared): add content item zod schema and typescript interfaces"`

### Step 022: Approval Record & Hash Types in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/approval.ts` defining `ApprovalRecord`, `approvedBy`, `approvedAt`, `approvedHash`, and canonical hash input schema.
- **Verification**: `test -f packages/shared/src/schemas/approval.ts`
- **Git Commit**: `git add packages/shared/src/schemas/approval.ts && git commit -m "feat(shared): define approval record schema and hash contracts"`

### Step 023: Buffer Integration Types & Channel Schemas in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/buffer.ts` defining `BufferChannel`, `BufferPostInput`, `BufferPostResponse`, `BufferSubmissionRecord`, and provider error schemas.
- **Verification**: `test -f packages/shared/src/schemas/buffer.ts`
- **Git Commit**: `git add packages/shared/src/schemas/buffer.ts && git commit -m "feat(shared): define buffer integration and channel schemas"`

### Step 024: Research Source & Topic Brief Types in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/research.ts` defining `ResearchSource`, `CandidateTopic`, `ResearchBrief`, fact/opinion lists, and freshness/credibility scores.
- **Verification**: `test -f packages/shared/src/schemas/research.ts`
- **Git Commit**: `git add packages/shared/src/schemas/research.ts && git commit -m "feat(shared): define research source and brief schemas"`

### Step 025: Audit Event Schema & Event Actions in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/audit.ts` defining `AuditEvent`, action enums (`APPROVAL_GRANTED`, `APPROVAL_INVALIDATED`, `BUFFER_SUBMISSION`, `PAUSE_TOGGLED`, `SETTINGS_UPDATED`), user identity, IP address, and sanitized metadata.
- **Verification**: `test -f packages/shared/src/schemas/audit.ts`
- **Git Commit**: `git add packages/shared/src/schemas/audit.ts && git commit -m "feat(shared): define audit event schema and action types"`

### Step 026: Analytics Snapshot & Weekly Report Types in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/analytics.ts` defining `AnalyticsSnapshot`, `MetricRecord`, source attribution, missingness tags, and `WeeklyReport` schema.
- **Verification**: `test -f packages/shared/src/schemas/analytics.ts`
- **Git Commit**: `git add packages/shared/src/schemas/analytics.ts && git commit -m "feat(shared): define analytics and weekly report schemas"`

### Step 027: Scheduled Job Types in `@xgrowth/shared`
- **Tasks**: Implement `src/schemas/job.ts` defining `ScheduledJob`, job types (`RESEARCH_SYNC`, `STATUS_RECONCILIATION`, `ANALYTICS_IMPORT`), cron expression, and execution log entry.
- **Verification**: `test -f packages/shared/src/schemas/job.ts`
- **Git Commit**: `git add packages/shared/src/schemas/job.ts && git commit -m "feat(shared): define persistent scheduled job schemas"`

### Step 028: Shared Package Export Barrel File
- **Tasks**: Update `packages/shared/src/index.ts` to export all enums, schemas, and types with clean namespace organization.
- **Verification**: `npm run build --workspace=@xgrowth/shared`
- **Git Commit**: `git add packages/shared/src/index.ts && git commit -m "refactor(shared): consolidate domain schema exports in barrel file"`

### Step 029: Unit Tests: Content Item Schema Validation
- **Tasks**: Create `packages/shared/src/schemas/content-item.test.ts` testing valid content items, invalid status transitions, max character limits (10,000), and malformed URIs.
- **Verification**: `npm test --workspace=@xgrowth/shared -- src/schemas/content-item.test.ts`
- **Git Commit**: `git add packages/shared/src/schemas/content-item.test.ts && git commit -m "test(shared): add unit tests for content item zod validation"`

### Step 030: Unit Tests: Approval Hash & Serialization Integrity
- **Tasks**: Create `packages/shared/src/schemas/approval.test.ts` verifying hash input serialization consistency across whitespace, line endings, and property order.
- **Verification**: `npm test --workspace=@xgrowth/shared -- src/schemas/approval.test.ts`
- **Git Commit**: `git add packages/shared/src/schemas/approval.test.ts && git commit -m "test(shared): add unit tests for approval hash consistency"`

---

# Plan 4: Phase 2A — Backend Persistence Layer (MongoDB / Mongoose) (Steps 031–041)

### Step 031: MongoDB Connection Lifecycle & Resilient Reconnection
- **Tasks**: Implement `apps/api/src/db/connection.ts` managing Mongoose connection, retry with backoff, connection pool tuning, and graceful disconnection on `SIGINT`/`SIGTERM`.
- **Verification**: `test -f apps/api/src/db/connection.ts`
- **Git Commit**: `git add apps/api/src/db/connection.ts && git commit -m "feat(api): implement resilient mongodb connection manager"`

### Step 032: Mongoose Model: `UserSettingsModel`
- **Tasks**: Implement `apps/api/src/db/models/user-settings.model.ts` mapping brand pillars, voice traits, preferred publishing windows, and `global_pause`.
- **Verification**: `test -f apps/api/src/db/models/user-settings.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/user-settings.model.ts && git commit -m "feat(api): create user settings mongoose model"`

### Step 033: Mongoose Model: `ResearchSourceModel`
- **Tasks**: Implement `apps/api/src/db/models/research-source.model.ts` with compound indexes on `url` (unique) and `enabled`.
- **Verification**: `test -f apps/api/src/db/models/research-source.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/research-source.model.ts && git commit -m "feat(api): create research source mongoose model"`

### Step 034: Mongoose Model: `TopicModel`
- **Tasks**: Implement `apps/api/src/db/models/topic.model.ts` with status indexing, freshness timestamps, and credibility scores.
- **Verification**: `test -f apps/api/src/db/models/topic.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/topic.model.ts && git commit -m "feat(api): create topic mongoose model"`

### Step 035: Mongoose Model: `ContentItemModel`
- **Tasks**: Implement `apps/api/src/db/models/content-item.model.ts` with indexes on `status`, `createdAt`, `updatedAt`, `topicPillar`, and compound index on `buffer.channelId` + `buffer.submissionId`.
- **Verification**: `test -f apps/api/src/db/models/content-item.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/content-item.model.ts && git commit -m "feat(api): create content item mongoose model with composite indexes"`

### Step 036: Mongoose Model: `ApprovalRecordModel`
- **Tasks**: Implement `apps/api/src/db/models/approval-record.model.ts` ensuring append-only records with immutable timestamps and approved content hashes.
- **Verification**: `test -f apps/api/src/db/models/approval-record.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/approval-record.model.ts && git commit -m "feat(api): create immutable approval record mongoose model"`

### Step 037: Mongoose Model: `ProviderSubmissionModel`
- **Tasks**: Implement `apps/api/src/db/models/provider-submission.model.ts` with unique index on client idempotency key (`idempotencyKey`) and provider submission IDs.
- **Verification**: `test -f apps/api/src/db/models/provider-submission.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/provider-submission.model.ts && git commit -m "feat(api): create provider submission model with idempotency index"`

### Step 038: Mongoose Model: `AnalyticsSnapshotModel`
- **Tasks**: Implement `apps/api/src/db/models/analytics-snapshot.model.ts` storing time-stamped metric records with explicit provider source metadata.
- **Verification**: `test -f apps/api/src/db/models/analytics-snapshot.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/analytics-snapshot.model.ts && git commit -m "feat(api): create analytics snapshot mongoose model"`

### Step 039: Mongoose Model: `AuditEventModel`
- **Tasks**: Implement `apps/api/src/db/models/audit-event.model.ts` with TTL and indexed fields for `action`, `actor`, and `timestamp`.
- **Verification**: `test -f apps/api/src/db/models/audit-event.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/audit-event.model.ts && git commit -m "feat(api): create audit event mongoose model"`

### Step 040: Mongoose Model: `ScheduledJobModel`
- **Tasks**: Implement `apps/api/src/db/models/scheduled-job.model.ts` tracking task names, status (`idle`, `running`, `failed`), last run time, next run time, and run logs.
- **Verification**: `test -f apps/api/src/db/models/scheduled-job.model.ts`
- **Git Commit**: `git add apps/api/src/db/models/scheduled-job.model.ts && git commit -m "feat(api): create scheduled job mongoose model"`

### Step 041: In-Memory MongoDB Integration Tests for Models
- **Tasks**: Implement `apps/api/src/db/models/models.integration.test.ts` utilizing `mongodb-memory-server` to verify index uniqueness, schema validations, and cascade constraints across all models.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/db/models/models.integration.test.ts`
- **Git Commit**: `git add apps/api/src/db/models/models.integration.test.ts && git commit -m "test(api): add in-memory mongodb integration tests for database models"`

---

# Plan 5: Phase 2B — Core Security, Middlewares & Server Infrastructure (Steps 042–051)

### Step 042: Express Server Bootstrap & Lifecycle Management
- **Tasks**: Implement `apps/api/src/server.ts` creating Express app instance, registering middlewares, handling process termination hooks, and managing port binding.
- **Verification**: `test -f apps/api/src/server.ts`
- **Git Commit**: `git add apps/api/src/server.ts && git commit -m "feat(api): implement express application bootstrap and lifecycle handlers"`

### Step 043: Security Middleware: Helmet & Strict CORS
- **Tasks**: Implement `apps/api/src/middlewares/security.ts` configuring `helmet` with custom CSP and strict `cors` restricted to `APP_URL`.
- **Verification**: `test -f apps/api/src/middlewares/security.ts`
- **Git Commit**: `git add apps/api/src/middlewares/security.ts && git commit -m "feat(api): configure helmet and restrictive cors middleware"`

### Step 044: Request Trace ID & Correlation Middleware
- **Tasks**: Implement `apps/api/src/middlewares/correlation.ts` assigning `x-correlation-id` UUID to all incoming requests and attaching it to response headers.
- **Verification**: `test -f apps/api/src/middlewares/correlation.ts`
- **Git Commit**: `git add apps/api/src/middlewares/correlation.ts && git commit -m "feat(api): implement request correlation id middleware"`

### Step 045: PII & Token Redaction Logger Middleware
- **Tasks**: Implement `apps/api/src/middlewares/logger.ts` using Pino/Winston with redaction filters for `authorization`, `cookie`, `buffer_api_key`, `token`, and user email.
- **Verification**: `test -f apps/api/src/middlewares/logger.ts`
- **Git Commit**: `git add apps/api/src/middlewares/logger.ts && git commit -m "feat(api): implement sensitive token and pii redaction logger"`

### Step 046: Rate Limiting & DoS Protection Middleware
- **Tasks**: Implement `apps/api/src/middlewares/rate-limit.ts` using `express-rate-limit` to protect API endpoints (general limit and tighter limit on mutation/auth endpoints).
- **Verification**: `test -f apps/api/src/middlewares/rate-limit.ts`
- **Git Commit**: `git add apps/api/src/middlewares/rate-limit.ts && git commit -m "feat(api): add rate limiting and abuse prevention middleware"`

### Step 047: Standardized Error Handler Middleware
- **Tasks**: Implement `apps/api/src/middlewares/error-handler.ts` transforming internal errors into standardized JSON error responses without leaking stack traces in production.
- **Verification**: `test -f apps/api/src/middlewares/error-handler.ts`
- **Git Commit**: `git add apps/api/src/middlewares/error-handler.ts && git commit -m "feat(api): add standardized api error handler middleware"`

### Step 048: Single-Owner Authentication Middleware
- **Tasks**: Implement `apps/api/src/middlewares/auth.ts` validating session cookie or Bearer API token against `APP_SESSION_SECRET` for single-owner operations.
- **Verification**: `test -f apps/api/src/middlewares/auth.ts`
- **Git Commit**: `git add apps/api/src/middlewares/auth.ts && git commit -m "feat(api): implement single-owner authentication middleware"`

### Step 049: CSRF Defense Middleware
- **Tasks**: Implement `apps/api/src/middlewares/csrf.ts` validating custom CSRF header (`x-xgrowth-csrf`) on all state-modifying requests (`POST`, `PATCH`, `PUT`, `DELETE`).
- **Verification**: `test -f apps/api/src/middlewares/csrf.ts`
- **Git Commit**: `git add apps/api/src/middlewares/csrf.ts && git commit -m "feat(api): implement header-based csrf defense middleware"`

### Step 050: System Health & Readiness Endpoints
- **Tasks**: Implement `apps/api/src/routes/health.router.ts` providing `GET /health` (liveness) and `GET /ready` (database connection check).
- **Verification**: `test -f apps/api/src/routes/health.router.ts`
- **Git Commit**: `git add apps/api/src/routes/health.router.ts && git commit -m "feat(api): implement liveness and readiness health routes"`

### Step 051: Integration Tests: Middleware Pipeline & Health Checks
- **Tasks**: Create `apps/api/src/routes/health.router.test.ts` using Supertest to verify security headers, correlation IDs, and health responses.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/health.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/health.router.test.ts && git commit -m "test(api): add integration tests for server middlewares and health endpoints"`

---

# Plan 6: Phase 3 — Settings Management, Audit Logging & Emergency Stop (Steps 052–060)

### Step 052: Audit Logging Service
- **Tasks**: Implement `apps/api/src/services/audit.service.ts` writing immutable events to `AuditEventModel` with actor, action, target entity, and sanitized metadata.
- **Verification**: `test -f apps/api/src/services/audit.service.ts`
- **Git Commit**: `git add apps/api/src/services/audit.service.ts && git commit -m "feat(api): implement immutable audit logging service"`

### Step 053: Global Emergency Pause Service
- **Tasks**: Implement `apps/api/src/services/emergency-pause.service.ts` managing `isPaused()` status, toggling pause, and recording audit events upon state changes.
- **Verification**: `test -f apps/api/src/services/emergency-pause.service.ts`
- **Git Commit**: `git add apps/api/src/services/emergency-pause.service.ts && git commit -m "feat(api): implement global emergency pause service"`

### Step 054: User Settings Service & Defaults Synchronization
- **Tasks**: Implement `apps/api/src/services/settings.service.ts` loading defaults from YAML and providing typed getters and update operations.
- **Verification**: `test -f apps/api/src/services/settings.service.ts`
- **Git Commit**: `git add apps/api/src/services/settings.service.ts && git commit -m "feat(api): implement settings management service with default sync"`

### Step 055: Settings Controller & Router: `GET` and `PATCH /api/settings`
- **Tasks**: Implement `apps/api/src/controllers/settings.controller.ts` and `apps/api/src/routes/settings.router.ts` with Zod payload validation.
- **Verification**: `test -f apps/api/src/routes/settings.router.ts`
- **Git Commit**: `git add apps/api/src/controllers/settings.controller.ts apps/api/src/routes/settings.router.ts && git commit -m "feat(api): implement settings query and update routes"`

### Step 056: Emergency Pause Router: `POST /api/settings/emergency-pause`
- **Tasks**: Implement endpoint allowing the owner to instantly enable or disable global pause, returning new pause state.
- **Verification**: `grep -q "emergency-pause" apps/api/src/routes/settings.router.ts`
- **Git Commit**: `git add apps/api/src/routes/settings.router.ts && git commit -m "feat(api): add emergency pause toggle route"`

### Step 057: Audit Log Router: `GET /api/audit-logs`
- **Tasks**: Implement `apps/api/src/routes/audit.router.ts` providing paginated access to audit records with filters for date range and action type.
- **Verification**: `test -f apps/api/src/routes/audit.router.ts`
- **Git Commit**: `git add apps/api/src/routes/audit.router.ts && git commit -m "feat(api): implement paginated audit log inspection route"`

### Step 058: Unit Tests: Emergency Pause Invariants
- **Tasks**: Create `apps/api/src/services/emergency-pause.service.test.ts` testing default pause status, state toggling, and audit event triggers.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/services/emergency-pause.service.test.ts`
- **Git Commit**: `git add apps/api/src/services/emergency-pause.service.test.ts && git commit -m "test(api): add unit tests for emergency pause service invariants"`

### Step 059: Unit Tests: Settings Service & Validation
- **Tasks**: Create `apps/api/src/services/settings.service.test.ts` testing brand pillar updates, invalid posting window formats, and voice property modifications.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/services/settings.service.test.ts`
- **Git Commit**: `git add apps/api/src/services/settings.service.test.ts && git commit -m "test(api): add unit tests for settings service and validation"`

### Step 060: Integration Tests: Settings and Pause APIs
- **Tasks**: Create `apps/api/src/routes/settings.router.test.ts` testing HTTP endpoints for settings retrieval, patch updates, and emergency pause activation.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/settings.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/settings.router.test.ts && git commit -m "test(api): add integration tests for settings and emergency pause routes"`

---

# Plan 7: Phase 4 — Research Desk & Source Ingestion Engine (Steps 061–070)

### Step 061: URL Sanitizer & Safe HTTP Request Dispatcher
- **Tasks**: Implement `apps/api/src/services/research/safe-fetcher.ts` with anti-SSRF protections, private IP blocking, request timeouts (5s), and header spoofing defenses.
- **Verification**: `test -f apps/api/src/services/research/safe-fetcher.ts`
- **Git Commit**: `git add apps/api/src/services/research/safe-fetcher.ts && git commit -m "feat(api): implement anti-ssrf safe http fetcher for research"`

### Step 062: RSS & News Feed Parser Service
- **Tasks**: Implement `apps/api/src/services/research/feed-parser.ts` using `rss-parser` to ingest entries from configured trusted RSS/Atom feeds.
- **Verification**: `test -f apps/api/src/services/research/feed-parser.ts`
- **Git Commit**: `git add apps/api/src/services/research/feed-parser.ts && git commit -m "feat(api): implement rss and news feed parser service"`

### Step 063: Source Credibility & Freshness Evaluator
- **Tasks**: Implement `apps/api/src/services/research/evaluator.ts` scoring candidate articles based on source allowlist, domain authority, and age (<72 hours).
- **Verification**: `test -f apps/api/src/services/research/evaluator.ts`
- **Git Commit**: `git add apps/api/src/services/research/evaluator.ts && git commit -m "feat(api): implement source credibility and freshness evaluator"`

### Step 064: Fact / Opinion Separation & Brief Extractor
- **Tasks**: Implement `apps/api/src/services/research/brief-extractor.ts` structuring raw articles into research briefs with separate fact bullets and opinion flags.
- **Verification**: `test -f apps/api/src/services/research/brief-extractor.ts`
- **Git Commit**: `git add apps/api/src/services/research/brief-extractor.ts && git commit -m "feat(api): implement fact/opinion separation and brief extraction service"`

### Step 065: Candidate Topic Deduplication Service
- **Tasks**: Implement `apps/api/src/services/research/deduplicator.ts` utilizing URL normalization and title Jaccard/Levenshtein distance to filter duplicate candidates.
- **Verification**: `test -f apps/api/src/services/research/deduplicator.ts`
- **Git Commit**: `git add apps/api/src/services/research/deduplicator.ts && git commit -m "feat(api): implement candidate topic deduplication service"`

### Step 066: Research Sources API Routes: `GET` and `POST /api/research/sources`
- **Tasks**: Implement `apps/api/src/controllers/research-source.controller.ts` and router for managing configured trusted feeds and URLs.
- **Verification**: `test -f apps/api/src/controllers/research-source.controller.ts`
- **Git Commit**: `git add apps/api/src/controllers/research-source.controller.ts && git commit -m "feat(api): implement research sources management routes"`

### Step 067: Candidate Topics API Routes: `GET` and `POST /api/research/candidates`
- **Tasks**: Implement routes to list candidate topics with filtering by freshness, credibility score, and topic pillar.
- **Verification**: `test -f apps/api/src/routes/research.router.ts`
- **Git Commit**: `git add apps/api/src/routes/research.router.ts && git commit -m "feat(api): implement candidate topics query and creation routes"`

### Step 068: Convert Candidate to Research Brief Route: `POST /api/research/candidates/:id/to-brief`
- **Tasks**: Implement endpoint to promote a validated candidate topic into an official Research Brief ready for AI drafting.
- **Verification**: `grep -q "to-brief" apps/api/src/routes/research.router.ts`
- **Git Commit**: `git add apps/api/src/routes/research.router.ts && git commit -m "feat(api): implement candidate-to-brief promotion route"`

### Step 069: Unit Tests: Credibility Scoring & Anti-SSRF Fetcher
- **Tasks**: Create `apps/api/src/services/research/evaluator.test.ts` and `safe-fetcher.test.ts` testing private IP rejections and score computations.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/services/research/evaluator.test.ts`
- **Git Commit**: `git add apps/api/src/services/research/*.test.ts && git commit -m "test(api): add unit tests for safe fetcher and credibility scoring"`

### Step 070: Integration Tests: Research Ingestion Flow
- **Tasks**: Create `apps/api/src/routes/research.router.test.ts` testing feed parsing, candidate ingestion, and brief conversion.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/research.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/research.router.test.ts && git commit -m "test(api): add integration tests for research desk api endpoints"`

---

# Plan 8: Phase 5 — AI Content Studio & Gemini Provider Adapter (Steps 071–080)

### Step 071: AI Provider Interface & Model Registry
- **Tasks**: Implement `apps/api/src/services/ai/ai-provider.interface.ts` defining `generatePostVariants(input: GenerateInput): Promise<Result<DraftVariant[], AIError>>`.
- **Verification**: `test -f apps/api/src/services/ai/ai-provider.interface.ts`
- **Git Commit**: `git add apps/api/src/services/ai/ai-provider.interface.ts && git commit -m "feat(api): define ai provider interface and model contracts"`

### Step 072: Google Gemini Adapter Implementation
- **Tasks**: Implement `apps/api/src/services/ai/gemini.adapter.ts` calling Google Gemini API with system instructions enforcing brand voice, temperature, and JSON output formatting.
- **Verification**: `test -f apps/api/src/services/ai/gemini.adapter.ts`
- **Git Commit**: `git add apps/api/src/services/ai/gemini.adapter.ts && git commit -m "feat(api): implement google gemini content generation adapter"`

### Step 073: Mock AI Adapter for Testing & Offline Development
- **Tasks**: Implement `apps/api/src/services/ai/mock.adapter.ts` returning deterministic high-quality drafts without calling external APIs.
- **Verification**: `test -f apps/api/src/services/ai/mock.adapter.ts`
- **Git Commit**: `git add apps/api/src/services/ai/mock.adapter.ts && git commit -m "feat(api): implement deterministic mock ai adapter for testing"`

### Step 074: Content Format Prompt Templates
- **Tasks**: Implement `apps/api/src/services/ai/prompts.ts` structuring prompts for Single Post, Educational Tip, Practical Checklist, Build-in-Public, Opinion, and Thread.
- **Verification**: `test -f apps/api/src/services/ai/prompts.ts`
- **Git Commit**: `git add apps/api/src/services/ai/prompts.ts && git commit -m "feat(api): implement format-specific prompt engineering templates"`

### Step 075: Editorial Policy & Tone Linter
- **Tasks**: Implement `apps/api/src/services/ai/tone-linter.ts` scanning generated drafts for buzzwords, fake controversy, hashtag stuffing (>2 tags), and missing source attributions.
- **Verification**: `test -f apps/api/src/services/ai/tone-linter.ts`
- **Git Commit**: `git add apps/api/src/services/ai/tone-linter.ts && git commit -m "feat(api): implement editorial tone linter and policy validator"`

### Step 076: X Platform Character Counter & Constraint Validator
- **Tasks**: Implement `apps/api/src/services/ai/character-validator.ts` accurately counting Twitter characters (URLs as 23 chars, emojis, CJK weights) against standard 280-char limit.
- **Verification**: `test -f apps/api/src/services/ai/character-validator.ts`
- **Git Commit**: `git add apps/api/src/services/ai/character-validator.ts && git commit -m "feat(api): implement x character counter and constraint validator"`

### Step 077: Draft Generation Service Orchestrator
- **Tasks**: Implement `apps/api/src/services/ai/draft-generator.service.ts` coordinating prompt building, AI generation, tone linting, character checks, and database persistence as `needs_review`.
- **Verification**: `test -f apps/api/src/services/ai/draft-generator.service.ts`
- **Git Commit**: `git add apps/api/src/services/ai/draft-generator.service.ts && git commit -m "feat(api): implement draft generation service orchestrator"`

### Step 078: Draft Generation API Routes: `POST /api/content/generate`
- **Tasks**: Implement `apps/api/src/routes/content-generate.router.ts` accepting topic brief ID and format, returning generated draft variants.
- **Verification**: `test -f apps/api/src/routes/content-generate.router.ts`
- **Git Commit**: `git add apps/api/src/routes/content-generate.router.ts && git commit -m "feat(api): implement draft generation api routes"`

### Step 079: Unit Tests: Character Counter & Tone Linter
- **Tasks**: Create `apps/api/src/services/ai/character-validator.test.ts` and `tone-linter.test.ts` testing URL weighting, emoji handling, and hashtag threshold violations.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/services/ai/character-validator.test.ts`
- **Git Commit**: `git add apps/api/src/services/ai/*.test.ts && git commit -m "test(api): add unit tests for character validation and tone linter"`

### Step 080: Integration Tests: Content Generation Pipeline
- **Tasks**: Create `apps/api/src/routes/content-generate.router.test.ts` utilizing `MockAIAdapter` to test end-to-end generation from brief to validated draft.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/content-generate.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/content-generate.router.test.ts && git commit -m "test(api): add integration tests for content generation pipeline"`

---

# Plan 9: Phase 6 — Editorial Workflow & Cryptographic Approval Gate (Steps 081–090)

### Step 081: Canonical Content Hasher Utility
- **Tasks**: Implement `apps/api/src/services/content/hasher.ts` computing deterministic SHA-256 hash over normalized text, thread parts, and target channel.
- **Verification**: `test -f apps/api/src/services/content/hasher.ts`
- **Git Commit**: `git add apps/api/src/services/content/hasher.ts && git commit -m "feat(api): implement canonical sha-256 content hasher utility"`

### Step 082: State Machine Enforcement Engine
- **Tasks**: Implement `apps/api/src/services/content/state-machine.ts` enforcing valid state transitions as defined in `WORKFLOW.md` and throwing `IllegalStateTransitionError` on violations.
- **Verification**: `test -f apps/api/src/services/content/state-machine.ts`
- **Git Commit**: `git add apps/api/src/services/content/state-machine.ts && git commit -m "feat(api): implement editorial state machine transition engine"`

### Step 083: Approval Service: `approveDraft`
- **Tasks**: Implement `apps/api/src/services/content/approval.service.ts` computing content hash, creating immutable `ApprovalRecord`, updating state to `approved`, and recording audit event.
- **Verification**: `test -f apps/api/src/services/content/approval.service.ts`
- **Git Commit**: `git add apps/api/src/services/content/approval.service.ts && git commit -m "feat(api): implement draft approval service with hash recording"`

### Step 084: Post-Approval Edit Invalidator
- **Tasks**: Implement mutation interceptor in `apps/api/src/services/content/content-item.service.ts`: if an approved draft is edited, invalidate approval, clear `approval` metadata, and reset state to `needs_review`.
- **Verification**: `grep -q "needs_review" apps/api/src/services/content/content-item.service.ts`
- **Git Commit**: `git add apps/api/src/services/content/content-item.service.ts && git commit -m "feat(api): implement automatic approval invalidation on draft edit"`

### Step 085: Content Item Query & Filter Service
- **Tasks**: Implement queries for review queue, scheduled queue, and editorial calendar filtering by status, date range, and pillar.
- **Verification**: `test -f apps/api/src/controllers/content-item.controller.ts`
- **Git Commit**: `git add apps/api/src/controllers/content-item.controller.ts && git commit -m "feat(api): implement content item query and filter services"`

### Step 086: API Routes: `GET /api/content/items` and `GET /api/content/items/:id`
- **Tasks**: Implement endpoints for listing items by status (`needs_review`, `approved`, etc.) and inspecting individual item details.
- **Verification**: `test -f apps/api/src/routes/content-item.router.ts`
- **Git Commit**: `git add apps/api/src/routes/content-item.router.ts && git commit -m "feat(api): implement content item list and detail routes"`

### Step 087: API Route: `PATCH /api/content/items/:id` (Edit Draft)
- **Tasks**: Implement endpoint to update text, format, or pillar, automatically triggering approval invalidation if item was previously approved.
- **Verification**: `grep -q "patch" apps/api/src/routes/content-item.router.ts`
- **Git Commit**: `git add apps/api/src/routes/content-item.router.ts && git commit -m "feat(api): implement content item edit route with approval guard"`

### Step 088: API Route: `POST /api/content/items/:id/approve`
- **Tasks**: Implement endpoint to formally approve a draft, recording approver identity and canonical content hash.
- **Verification**: `grep -q "approve" apps/api/src/routes/content-item.router.ts`
- **Git Commit**: `git add apps/api/src/routes/content-item.router.ts && git commit -m "feat(api): implement draft approval route"`

### Step 089: API Route: `POST /api/content/items/:id/reject`
- **Tasks**: Implement endpoint to reject or archive a draft with reason notes and transition state to `rejected` or `archived`.
- **Verification**: `grep -q "reject" apps/api/src/routes/content-item.router.ts`
- **Git Commit**: `git add apps/api/src/routes/content-item.router.ts && git commit -m "feat(api): implement draft rejection and archival route"`

### Step 090: Unit & Integration Tests: Approval Flow & Invalidation
- **Tasks**: Create `apps/api/src/routes/content-item.router.test.ts` testing approval creation, hash verification, edit invalidation, and illegal state transitions.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/content-item.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/content-item.router.test.ts && git commit -m "test(api): add tests for approval lifecycle and edit invalidation"`

---

# Plan 10: Phase 7 — Buffer GraphQL Connector & Safe Publishing Pipeline (Steps 091–103)

### Step 091: Buffer Provider Interface & Type Contracts
- **Tasks**: Implement `apps/api/src/services/buffer/buffer-provider.interface.ts` defining methods: `listChannels()`, `submitPost()`, `getPostStatus()`, and `reconcileSubmission()`.
- **Verification**: `test -f apps/api/src/services/buffer/buffer-provider.interface.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/buffer-provider.interface.ts && git commit -m "feat(api): define buffer provider interface contracts"`

### Step 092: Buffer GraphQL Client Wrapper
- **Tasks**: Implement `apps/api/src/services/buffer/buffer-graphql.client.ts` executing GraphQL requests to `https://api.buffer.com` with `Authorization: Bearer <BUFFER_API_KEY>`, rate-limit tracking, and timeout controls (10s).
- **Verification**: `test -f apps/api/src/services/buffer/buffer-graphql.client.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/buffer-graphql.client.ts && git commit -m "feat(api): implement buffer graphql client with bearer auth"`

### Step 093: Mock Buffer Provider for Dry-Run & Test Environments
- **Tasks**: Implement `apps/api/src/services/buffer/mock-buffer.provider.ts` simulating realistic channel listings, successful submissions, and controlled timeout scenarios.
- **Verification**: `test -f apps/api/src/services/buffer/mock-buffer.provider.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/mock-buffer.provider.ts && git commit -m "feat(api): implement mock buffer provider for safe local testing"`

### Step 094: Buffer Channel Discovery Service
- **Tasks**: Implement `apps/api/src/services/buffer/channel-discovery.service.ts` querying channels, filtering for `service === "twitter" || service === "x"`, and caching channel metadata.
- **Verification**: `test -f apps/api/src/services/buffer/channel-discovery.service.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/channel-discovery.service.ts && git commit -m "feat(api): implement buffer channel discovery and caching service"`

### Step 095: Idempotency Key & Client Duplicate Key Generator
- **Tasks**: Implement `apps/api/src/services/buffer/idempotency.ts` generating unique deterministic submission keys: `sha256(contentItemId + approvedHash + channelId)`.
- **Verification**: `test -f apps/api/src/services/buffer/idempotency.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/idempotency.ts && git commit -m "feat(api): implement deterministic idempotency key generator"`

### Step 096: Pre-Submission Verification Gatekeeper
- **Tasks**: Implement `apps/api/src/services/buffer/submission-gatekeeper.ts` verifying all 4 pre-conditions: (1) `global_pause === false`, (2) `item.status === 'approved'`, (3) `currentHash === approvedHash`, (4) no existing pending/successful submission record with same idempotency key.
- **Verification**: `test -f apps/api/src/services/buffer/submission-gatekeeper.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/submission-gatekeeper.ts && git commit -m "feat(api): implement pre-submission safety gatekeeper"`

### Step 097: Buffer Post Submission Execution Service
- **Tasks**: Implement `apps/api/src/services/buffer/submission.service.ts` executing post creation (`createPost` GraphQL mutation), handling `addToQueue` or scheduled slot, saving provider post ID, and updating state to `submitted_to_buffer`.
- **Verification**: `test -f apps/api/src/services/buffer/submission.service.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/submission.service.ts && git commit -m "feat(api): implement buffer post submission execution service"`

### Step 098: Ambiguous Submission & Timeout Handler
- **Tasks**: Implement timeout interceptor: on network disconnect or timeout after request dispatch, set status to `unknown`, record failure details, and lock automatic retry.
- **Verification**: `grep -q "unknown" apps/api/src/services/buffer/submission.service.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/submission.service.ts && git commit -m "feat(api): implement ambiguous submission recovery and unknown state handling"`

### Step 099: Submission Status Reconciliation Service
- **Tasks**: Implement `apps/api/src/services/buffer/reconciliation.service.ts` querying Buffer post status by provider ID to transition `unknown` or `submitted_to_buffer` items to `queued` or `published`.
- **Verification**: `test -f apps/api/src/services/buffer/reconciliation.service.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/reconciliation.service.ts && git commit -m "feat(api): implement buffer submission status reconciliation service"`

### Step 100: API Route: `GET /api/buffer/channels`
- **Tasks**: Implement endpoint to retrieve available connected Buffer channels for X with status indicators.
- **Verification**: `test -f apps/api/src/routes/buffer.router.ts`
- **Git Commit**: `git add apps/api/src/routes/buffer.router.ts && git commit -m "feat(api): implement buffer channels discovery route"`

### Step 101: API Route: `POST /api/buffer/submit`
- **Tasks**: Implement endpoint accepting `contentItemId` and `channelId`, executing submission through the gatekeeper.
- **Verification**: `grep -q "submit" apps/api/src/routes/buffer.router.ts`
- **Git Commit**: `git add apps/api/src/routes/buffer.router.ts && git commit -m "feat(api): implement buffer content submission route"`

### Step 102: API Route: `POST /api/buffer/reconcile/:id`
- **Tasks**: Implement endpoint allowing manual or scheduled reconciliation of items in `unknown` or `submitted_to_buffer` states.
- **Verification**: `grep -q "reconcile" apps/api/src/routes/buffer.router.ts`
- **Git Commit**: `git add apps/api/src/routes/buffer.router.ts && git commit -m "feat(api): implement submission reconciliation route"`

### Step 103: Unit & Integration Tests: Buffer Guardrails & Idempotency
- **Tasks**: Create `apps/api/src/routes/buffer.router.test.ts` testing pause interception, unapproved rejection, stale hash rejection, duplicate prevention, and timeout handling.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/buffer.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/buffer.router.test.ts && git commit -m "test(api): add unit and integration tests for buffer publishing gatekeepers"`

---

# Plan 11: Phase 8 — Persistent Job Scheduler & Status Reconciliation (Steps 104–112)

### Step 104: Persistent Job Scheduler Engine
- **Tasks**: Implement `apps/api/src/services/scheduler/scheduler.service.ts` backed by MongoDB `ScheduledJobModel` with distributed lease locking to prevent concurrent execution.
- **Verification**: `test -f apps/api/src/services/scheduler/scheduler.service.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/scheduler.service.ts && git commit -m "feat(api): implement persistent mongodb job scheduler engine"`

### Step 105: Scheduled Task: Research Feeds Synchronization Job
- **Tasks**: Implement `apps/api/src/services/scheduler/tasks/research-sync.task.ts` polling configured RSS feeds, scoring freshness, and queuing candidate topics.
- **Verification**: `test -f apps/api/src/services/scheduler/tasks/research-sync.task.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/tasks/research-sync.task.ts && git commit -m "feat(api): implement research sync scheduled background task"`

### Step 106: Scheduled Task: Buffer Status Reconciliation Job
- **Tasks**: Implement `apps/api/src/services/scheduler/tasks/buffer-sync.task.ts` reconciling pending and unknown submissions respecting Buffer rate limits (max 1 run / 6 hours).
- **Verification**: `test -f apps/api/src/services/scheduler/tasks/buffer-sync.task.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/tasks/buffer-sync.task.ts && git commit -m "feat(api): implement buffer reconciliation scheduled task"`

### Step 107: Scheduled Task: Weekly Analytics Generation Job
- **Tasks**: Implement `apps/api/src/services/scheduler/tasks/weekly-report.task.ts` running every Monday at 10:00 to generate weekly insights.
- **Verification**: `test -f apps/api/src/services/scheduler/tasks/weekly-report.task.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/tasks/weekly-report.task.ts && git commit -m "feat(api): implement weekly report scheduled task"`

### Step 108: Stale Job Recovery & Concurrency Guard
- **Tasks**: Implement `apps/api/src/services/scheduler/lease-manager.ts` releasing abandoned job locks after timeout (10m) and preventing duplicate execution.
- **Verification**: `test -f apps/api/src/services/scheduler/lease-manager.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/lease-manager.ts && git commit -m "feat(api): implement job lease manager and stale lock reclaimer"`

### Step 109: API Route: `GET /api/jobs` and `POST /api/jobs/:id/trigger`
- **Tasks**: Implement `apps/api/src/routes/jobs.router.ts` allowing dashboard inspection of job statuses and manual on-demand triggers.
- **Verification**: `test -f apps/api/src/routes/jobs.router.ts`
- **Git Commit**: `git add apps/api/src/routes/jobs.router.ts && git commit -m "feat(api): implement job management and manual trigger routes"`

### Step 110: Rate-Limit Awareness & Throttle Control
- **Tasks**: Implement `apps/api/src/services/buffer/rate-limiter.ts` tracking monthly API call consumption and throttling background sync when approaching quota.
- **Verification**: `test -f apps/api/src/services/buffer/rate-limiter.ts`
- **Git Commit**: `git add apps/api/src/services/buffer/rate-limiter.ts && git commit -m "feat(api): implement buffer api quota tracker and throttler"`

### Step 111: Unit Tests: Job Scheduling Engine
- **Tasks**: Create `apps/api/src/services/scheduler/scheduler.service.test.ts` testing cron parsing, lock acquisition, and error status updates.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/services/scheduler/scheduler.service.test.ts`
- **Git Commit**: `git add apps/api/src/services/scheduler/scheduler.service.test.ts && git commit -m "test(api): add unit tests for job scheduler and lease management"`

### Step 112: Integration Tests: Scheduler Background Execution
- **Tasks**: Create `apps/api/src/routes/jobs.router.test.ts` testing job triggering, execution logging, and audit recording.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/jobs.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/jobs.router.test.ts && git commit -m "test(api): add integration tests for scheduler api routes"`

---

# Plan 12: Phase 9 — Analytics Normalization & Weekly Report Engine (Steps 113–120)

### Step 113: Analytics Snapshot Ingestion Service
- **Tasks**: Implement `apps/api/src/services/analytics/snapshot.service.ts` recording raw metrics with provider timestamp and data source label.
- **Verification**: `test -f apps/api/src/services/analytics/snapshot.service.ts`
- **Git Commit**: `git add apps/api/src/services/analytics/snapshot.service.ts && git commit -m "feat(api): implement analytics snapshot ingestion service"`

### Step 114: Metric Missingness & Source Attribution Tagging
- **Tasks**: Implement `apps/api/src/services/analytics/normalizer.ts`: if metric is absent (e.g. impressions on unsupported tiers), explicitly tag as `"Not available from connected provider"`. Never fabricate values.
- **Verification**: `test -f apps/api/src/services/analytics/normalizer.ts`
- **Git Commit**: `git add apps/api/src/services/analytics/normalizer.ts && git commit -m "feat(api): implement metric normalizer and source attribution tagger"`

### Step 115: Performance Aggregator by Topic Pillar & Format
- **Tasks**: Implement `apps/api/src/services/analytics/aggregator.ts` aggregating metrics across posts grouped by pillar (`Full-Stack`, `AI Tools`, `BIP`) and format.
- **Verification**: `test -f apps/api/src/services/analytics/aggregator.ts`
- **Git Commit**: `git add apps/api/src/services/analytics/aggregator.ts && git commit -m "feat(api): implement content pillar and format performance aggregator"`

### Step 116: Weekly Performance Report Generator
- **Tasks**: Implement `apps/api/src/services/analytics/weekly-reporter.ts` formatting reports into Markdown matching `templates/WEEKLY_REPORT.md` with directional notes on small samples.
- **Verification**: `test -f apps/api/src/services/analytics/weekly-reporter.ts`
- **Git Commit**: `git add apps/api/src/services/analytics/weekly-reporter.ts && git commit -m "feat(api): implement weekly markdown report generator"`

### Step 117: Next Week Experiment Recommender
- **Tasks**: Implement `apps/api/src/services/analytics/experiment-engine.ts` identifying undertested pillars and proposing 2–3 concrete editorial experiments.
- **Verification**: `test -f apps/api/src/services/analytics/experiment-engine.ts`
- **Git Commit**: `git add apps/api/src/services/analytics/experiment-engine.ts && git commit -m "feat(api): implement next week content experiment recommender"`

### Step 118: API Routes: `GET /api/analytics/summary` and `GET /api/analytics/reports`
- **Tasks**: Implement `apps/api/src/routes/analytics.router.ts` serving normalized metrics and past weekly report archives.
- **Verification**: `test -f apps/api/src/routes/analytics.router.ts`
- **Git Commit**: `git add apps/api/src/routes/analytics.router.ts && git commit -m "feat(api): implement analytics summary and reports routes"`

### Step 119: API Route: `POST /api/analytics/reports/generate`
- **Tasks**: Implement endpoint to manually trigger weekly report generation for a custom date window.
- **Verification**: `grep -q "generate" apps/api/src/routes/analytics.router.ts`
- **Git Commit**: `git add apps/api/src/routes/analytics.router.ts && git commit -m "feat(api): implement on-demand report generation route"`

### Step 120: Unit & Integration Tests: Analytics & Reporting
- **Tasks**: Create `apps/api/src/routes/analytics.router.test.ts` verifying missingness attribution, formula correctness, and Markdown template output.
- **Verification**: `npm test --workspace=@xgrowth/api -- src/routes/analytics.router.test.ts`
- **Git Commit**: `git add apps/api/src/routes/analytics.router.test.ts && git commit -m "test(api): add tests for analytics normalization and reporting engine"`

---

# Plan 13: Phase 10 — Frontend Web Application (React + Vite + Tailwind) (Steps 121–134)

### Step 121: Web App Shell, Layout & Global Context
- **Tasks**: Implement `apps/web/src/components/layout/AppLayout.tsx`, header, sidebar, navigation routes, and `AppContext` for owner state and active settings.
- **Verification**: `test -f apps/web/src/components/layout/AppLayout.tsx`
- **Git Commit**: `git add apps/web/src/components/layout/AppLayout.tsx && git commit -m "feat(web): implement application shell and navigation layout"`

### Step 122: Global Emergency Pause Banner Component
- **Tasks**: Implement `apps/web/src/components/common/EmergencyPauseBanner.tsx` displaying prominent warning when paused and providing one-click toggle.
- **Verification**: `test -f apps/web/src/components/common/EmergencyPauseBanner.tsx`
- **Git Commit**: `git add apps/web/src/components/common/EmergencyPauseBanner.tsx && git commit -m "feat(web): implement global emergency pause banner and toggle"`

### Step 123: Dashboard View: Overview Cards & Metric Indicators
- **Tasks**: Implement `apps/web/src/views/DashboardView.tsx` showing queue counts, review items, Buffer connection health, and recent submissions.
- **Verification**: `test -f apps/web/src/views/DashboardView.tsx`
- **Git Commit**: `git add apps/web/src/views/DashboardView.tsx && git commit -m "feat(web): implement main dashboard overview view"`

### Step 124: Research Inbox View & Brief Creator
- **Tasks**: Implement `apps/web/src/views/ResearchInboxView.tsx` displaying candidate topics, credibility scores, source links, and brief creation dialog.
- **Verification**: `test -f apps/web/src/views/ResearchInboxView.tsx`
- **Git Commit**: `git add apps/web/src/views/ResearchInboxView.tsx && git commit -m "feat(web): implement research inbox and brief creation view"`

### Step 125: Content Studio View & AI Generator Form
- **Tasks**: Implement `apps/web/src/views/ContentStudioView.tsx` with topic selection, format selector, tone hints, and variant generation triggers.
- **Verification**: `test -f apps/web/src/views/ContentStudioView.tsx`
- **Git Commit**: `git add apps/web/src/views/ContentStudioView.tsx && git commit -m "feat(web): implement content studio and ai draft generation view"`

### Step 126: Review Queue View & Live Character Counter
- **Tasks**: Implement `apps/web/src/views/ReviewQueueView.tsx` with split-pane draft editing, live 280-char count badge, and policy compliance flags.
- **Verification**: `test -f apps/web/src/views/ReviewQueueView.tsx`
- **Git Commit**: `git add apps/web/src/views/ReviewQueueView.tsx && git commit -m "feat(web): implement review queue with live character counter"`

### Step 127: Approval Action Modal & Content Hash Verification Display
- **Tasks**: Implement `apps/web/src/components/content/ApprovalModal.tsx` displaying exact content snapshot, target channel, and computed hash before approval.
- **Verification**: `test -f apps/web/src/components/content/ApprovalModal.tsx`
- **Git Commit**: `git add apps/web/src/components/content/ApprovalModal.tsx && git commit -m "feat(web): implement approval modal with content hash verification"`

### Step 128: Editorial Calendar View
- **Tasks**: Implement `apps/web/src/views/EditorialCalendarView.tsx` displaying scheduled queue slots, preferred windows (09:00, 13:00, 19:00), and draft statuses.
- **Verification**: `test -f apps/web/src/views/EditorialCalendarView.tsx`
- **Git Commit**: `git add apps/web/src/views/EditorialCalendarView.tsx && git commit -m "feat(web): implement editorial calendar schedule view"`

### Step 129: Buffer Management & Channel Selector View
- **Tasks**: Implement `apps/web/src/views/BufferChannelsView.tsx` showing connected X channels, quota usage counter, and test connection action.
- **Verification**: `test -f apps/web/src/views/BufferChannelsView.tsx`
- **Git Commit**: `git add apps/web/src/views/BufferChannelsView.tsx && git commit -m "feat(web): implement buffer channels and quota management view"`

### Step 130: Ambiguous Submission Reconciliation Drawer
- **Tasks**: Implement `apps/web/src/components/buffer/ReconciliationDrawer.tsx` allowing owner to inspect `unknown` submissions and safely trigger status checks.
- **Verification**: `test -f apps/web/src/components/buffer/ReconciliationDrawer.tsx`
- **Git Commit**: `git add apps/web/src/components/buffer/ReconciliationDrawer.tsx && git commit -m "feat(web): implement submission reconciliation recovery drawer"`

### Step 131: Analytics & Weekly Report Markdown Viewer
- **Tasks**: Implement `apps/web/src/views/AnalyticsView.tsx` with Markdown report renderer, source attribution badges, and experiment recommendation cards.
- **Verification**: `test -f apps/web/src/views/AnalyticsView.tsx`
- **Git Commit**: `git add apps/web/src/views/AnalyticsView.tsx && git commit -m "feat(web): implement analytics and weekly report markdown viewer"`

### Step 132: User Settings & Voice Configuration View
- **Tasks**: Implement `apps/web/src/views/SettingsView.tsx` editing brand pillars, voice traits, publishing windows, and testing API credentials.
- **Verification**: `test -f apps/web/src/views/SettingsView.tsx`
- **Git Commit**: `git add apps/web/src/views/SettingsView.tsx && git commit -m "feat(web): implement user settings and voice configuration view"`

### Step 133: Audit Log Explorer View
- **Tasks**: Implement `apps/web/src/views/AuditLogView.tsx` with searchable and filterable table of all system and administrative events.
- **Verification**: `test -f apps/web/src/views/AuditLogView.tsx`
- **Git Commit**: `git add apps/web/src/views/AuditLogView.tsx && git commit -m "feat(web): implement audit log explorer view"`

### Step 134: Frontend Component Unit & Snapshot Tests
- **Tasks**: Create unit tests in `apps/web/src/**/*.test.tsx` verifying character counter accuracy, pause banner toggle, and modal hash confirmation.
- **Verification**: `npm test --workspace=@xgrowth/web`
- **Git Commit**: `git add apps/web/src/**/*.test.tsx && git commit -m "test(web): add component unit and render tests"`

---

# Plan 14: Phase 11 — End-to-End User Journeys, Security Hardening & Packaging (Steps 135–142)

### Step 135: E2E Test: Journey A (Topic -> Draft -> Edit -> Approve -> Hash Stored)
- **Tasks**: Implement `apps/api/test/e2e/journey-a-approval.e2e.test.ts` testing the complete flow from candidate topic ingestion through content hashing and approval.
- **Verification**: `npm test --workspace=@xgrowth/api -- test/e2e/journey-a-approval.e2e.test.ts`
- **Git Commit**: `git add apps/api/test/e2e/journey-a-approval.e2e.test.ts && git commit -m "test(e2e): verify journey a draft generation and approval hashing"`

### Step 136: E2E Test: Journey B (Approved Item -> Buffer Submission -> ID Stored)
- **Tasks**: Implement `apps/api/test/e2e/journey-b-submission.e2e.test.ts` verifying approved item dispatch to Buffer, idempotency key verification, and status update.
- **Verification**: `npm test --workspace=@xgrowth/api -- test/e2e/journey-b-submission.e2e.test.ts`
- **Git Commit**: `git add apps/api/test/e2e/journey-b-submission.e2e.test.ts && git commit -m "test(e2e): verify journey b approved buffer submission pipeline"`

### Step 137: E2E Test: Journey C (Timeout -> Unknown State -> Safe Reconciliation)
- **Tasks**: Implement `apps/api/test/e2e/journey-c-recovery.e2e.test.ts` simulating network timeout, ensuring no duplicate retry, and verifying reconciliation.
- **Verification**: `npm test --workspace=@xgrowth/api -- test/e2e/journey-c-recovery.e2e.test.ts`
- **Git Commit**: `git add apps/api/test/e2e/journey-c-recovery.e2e.test.ts && git commit -m "test(e2e): verify journey c ambiguous submission recovery"`

### Step 138: E2E Test: Journey D (Analytics Ingestion -> Weekly Report Generation)
- **Tasks**: Implement `apps/api/test/e2e/journey-d-reporting.e2e.test.ts` verifying metric ingestion, missingness attribution, and Markdown report synthesis.
- **Verification**: `npm test --workspace=@xgrowth/api -- test/e2e/journey-d-reporting.e2e.test.ts`
- **Git Commit**: `git add apps/api/test/e2e/journey-d-reporting.e2e.test.ts && git commit -m "test(e2e): verify journey d analytics and report synthesis"`

### Step 139: Security Hardening: Token Leakage & Injection Audit
- **Tasks**: Implement `apps/api/test/security/security-audit.test.ts` verifying that API keys and Bearer tokens are redacted from logs and never present in API responses.
- **Verification**: `npm test --workspace=@xgrowth/api -- test/security/security-audit.test.ts`
- **Git Commit**: `git add apps/api/test/security/security-audit.test.ts && git commit -m "test(security): add token leakage and injection regression tests"`

### Step 140: Database Seeding Script (`npm run seed`)
- **Tasks**: Implement `apps/api/src/db/seed.ts` seeding default settings, sample trusted research feeds, brand pillars, and fixture content items.
- **Verification**: `test -f apps/api/src/db/seed.ts`
- **Git Commit**: `git add apps/api/src/db/seed.ts && git commit -m "feat(api): implement database seed script with operational defaults"`

### Step 141: Production Dockerfile & Container Build
- **Tasks**: Create multi-stage `Dockerfile` and `docker-compose.yml` orchestrating API, Web, and local MongoDB for containerized deployment.
- **Verification**: `test -f Dockerfile && test -f docker-compose.yml`
- **Git Commit**: `git add Dockerfile docker-compose.yml && git commit -m "build: create multi-stage production dockerfile and compose configuration"`

### Step 142: Production Operations Runbook & Acceptance Sign-off
- **Tasks**: Create `docs/OPERATIONS_RUNBOOK.md` documenting deployment steps, secret rotation, emergency pause procedures, and owner acceptance checklist.
- **Verification**: `test -f docs/OPERATIONS_RUNBOOK.md`
- **Git Commit**: `git add docs/OPERATIONS_RUNBOOK.md && git commit -m "docs: finalize production operations runbook and owner acceptance sign-off"`
