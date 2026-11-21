# Antigravity Master Build Prompt — XGrowth AI

You are the lead product engineer and architect. Build **XGrowth AI**, a reliable, low-cost, Buffer-first content operations platform for one creator's X account.

Read these files before coding:
- `PRD.md`
- `WORKFLOW.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/BUFFER_INTEGRATION.md`
- `docs/CONTENT_POLICY.md`
- `docs/SECURITY.md`
- `config/settings.example.yaml`
- `schemas/content-item.schema.json`

## Product context

The owner is a software developer building a personal brand around:
- Software engineering and full-stack development
- MERN, React, Node.js, JavaScript and TypeScript
- AI tools, practical AI engineering, and developer productivity
- Building projects, lessons learned, and build-in-public updates
- Startups and product engineering

Default language: English. Keep the system configurable for Bengali or mixed-language content. Do not assume personal achievements, project metrics, employer details, or experience that the owner has not explicitly entered.

## Non-negotiable implementation rules

1. Buffer is the publishing provider. Do not add direct X API publishing in the MVP.
2. Do not guess Buffer endpoints, GraphQL operations, scopes, authentication, rate limits, or plan entitlements.
3. First inspect the current official Buffer developer documentation and identify exactly which required operations are supported.
4. If Buffer API access is unavailable or a required operation is unsupported, implement a clean adapter interface and a manual export/queue handoff. Do not fake a successful connection.
5. Do not automate the X or Buffer websites through browser clicking, DOM scripting, or scraping.
6. Default to human approval for every post.
7. No automated likes, follows, unfollows, mass replies, unsolicited replies, reposts, or trend manipulation.
8. Never expose secrets to frontend code, logs, source control, or generated reports.
9. Never claim a post is queued or published without provider confirmation.
10. Build an emergency pause switch before enabling any live submission.

## Required delivery

Build a complete, runnable MVP, not merely a static UI mockup.

### Recommended stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + TypeScript + Express
- Database: MongoDB + Mongoose (keep repository layer abstract enough to swap later)
- Validation: Zod
- Tests: Vitest/Jest and Supertest as appropriate
- AI: provider abstraction with Gemini implementation; model and API key configurable
- Scheduling: a backend scheduler with persistent job records; avoid relying on an interactive IDE session for production jobs
- Publishing: `BufferProvider` adapter based only on verified current Buffer API documentation

If a simpler stack materially reduces cost and complexity, explain the trade-off before changing the stack.

## Required modules

1. Dashboard
2. Research inbox
3. Topic and source library
4. AI content studio
5. Editorial calendar
6. Review and approval queue
7. Buffer connection and channel selector
8. Submission history and status reconciliation
9. Analytics and weekly reports
10. Settings, audit log, and emergency pause

## Core data entities

Implement at minimum:
- UserSettings
- Topic
- ResearchSource
- ContentItem
- ApprovalRecord
- ConnectedProvider
- ProviderSubmission
- AnalyticsSnapshot
- AuditEvent
- ScheduledJob

Use the provided JSON schema as a starting point. Add migrations/versioning where appropriate.

## Buffer integration discovery gate

Before writing the real adapter:
1. Read official docs.
2. For this single-owner app, verify and implement a personal API key first. OAuth is only needed if later allowing other Buffer users to authorize the app.
3. Confirm how to list/select organizations and channels.
4. Confirm create/schedule post operations for X.
5. Confirm supported post types, character/media limitations, and scheduling behavior.
6. Confirm post retrieval/status operations, experimental metrics, and whether webhooks exist. Do not rely on experimental metrics for production analytics.
7. Confirm rate limits, token lifecycle, scopes, and account/plan prerequisites.
8. Write findings and source links in `docs/BUFFER_API_VERIFICATION.md`.
9. Mark each capability `verified`, `unsupported`, or `requires account test`.
10. Only then implement the adapter.

Never invent a Buffer API route or use undocumented private endpoints.

## Required user journeys

### Journey A — create and approve a post
Owner creates a topic → AI generates draft → quality checks run → draft appears in review queue → owner edits and approves → exact text hash is recorded.

### Journey B — send approved content to Buffer
Owner chooses a connected X channel → submission service checks pause state and approval hash → Buffer adapter submits → response and provider ID are stored → UI shows confirmed state or actionable error.

### Journey C — recover from ambiguous submission
A timeout occurs → state becomes `unknown` → reconciliation checks provider state if supported → no blind retry → owner receives a clear status and safe next action.

### Journey D — weekly review
System imports available metrics → identifies best-performing themes and formats → labels sample size and metric sources → generates evidence-based recommendations.

## UX expectations

- Clean, professional, responsive dashboard.
- Clear distinction between local approval, provider acceptance, queued, and published.
- Empty states that explain what to do next.
- Loading, error, and retry states.
- Character counter and validation.
- Source citations/links visible on research-backed drafts.
- Visible global pause status.
- Accessible forms and keyboard navigation.

## Engineering expectations

- Modular feature-based architecture.
- Typed provider interfaces.
- Server-side validation.
- Structured logs with secrets and personal data redacted.
- Rate limiting on sensitive endpoints.
- Authentication suitable for a single-owner deployment; do not leave an open admin dashboard.
- CSRF protection where cookie sessions are used.
- Secure cookies, restrictive CORS, and security headers.
- Tests for approval enforcement, stale approval hashes, pause switch, duplicate submission prevention, and provider errors.
- `.env.example`, README setup, seed data, and deployment instructions.
- No hardcoded credentials.
- No fake analytics or fake Buffer connection states.

## Build phases

Phase 0: Inspect docs, write architecture decisions and Buffer API verification.
Phase 1: Scaffold app, authentication, settings, database, audit log.
Phase 2: Topics, research inbox, AI draft generation and validation.
Phase 3: Review queue, approval hash, editorial calendar.
Phase 4: Buffer adapter and safe submission flow, only for verified capabilities.
Phase 5: Status reconciliation, retry controls, emergency pause.
Phase 6: Analytics import and weekly report.
Phase 7: Tests, security review, deployment docs, production checklist.

At the end of each phase:
- Run lint, typecheck, tests, and build.
- Summarize files changed and decisions.
- List known limitations.
- Do not proceed past a blocked Buffer verification gate by making assumptions.

Start with Phase 0. Do not generate implementation code until the Buffer capability verification report and architecture decision record are written.
