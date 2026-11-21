# Implementation Backlog

## Phase 0 — Provider and architecture verification
- [ ] Read current Buffer developer docs.
- [ ] Verify API access and plan/account prerequisites.
- [ ] Verify auth, channel discovery, X publishing, scheduling, status, analytics.
- [ ] Write `docs/BUFFER_API_VERIFICATION.md`.
- [ ] Write architecture decision record.
- [ ] Decide fallback if a capability is unsupported.

## Phase 1 — Foundation
- [ ] Create monorepo or clearly separated web/API apps.
- [ ] Configure TypeScript strict mode.
- [ ] Add environment validation.
- [ ] Add owner authentication.
- [ ] Add database models and indexes.
- [ ] Add audit log.
- [ ] Add global pause setting.

## Phase 2 — Research and content
- [ ] Topic pillars and settings UI.
- [ ] Research source ingestion.
- [ ] Source provenance and freshness.
- [ ] AI provider abstraction.
- [ ] Draft generation and variants.
- [ ] Character and duplicate checks.
- [ ] Content library and editorial calendar.

## Phase 3 — Approval
- [ ] Review queue.
- [ ] Edit/approve/reject actions.
- [ ] Content hashing.
- [ ] Approval invalidation on edits.
- [ ] Approval enforcement tests.

## Phase 4 — Buffer connector
- [ ] Implement only verified auth flow.
- [ ] Connect/disconnect Buffer.
- [ ] List/select X channel if supported.
- [ ] Submit approved content.
- [ ] Persist provider IDs and responses.
- [ ] Implement safe reconciliation and bounded retry.
- [ ] Add integration tests.

## Phase 5 — Operations
- [ ] Persistent scheduler.
- [ ] Submission history.
- [ ] Provider health and token-expiry handling.
- [ ] Emergency pause.
- [ ] Notifications for failures.

## Phase 6 — Analytics
- [ ] Import available metrics.
- [ ] Normalize and timestamp snapshots.
- [ ] Weekly report generator.
- [ ] Label unavailable metrics.
- [ ] Content experiment recommendations.

## Phase 7 — Production readiness
- [ ] Unit, integration, and end-to-end tests.
- [ ] Security review.
- [ ] Backup and restore instructions.
- [ ] Deployment guide.
- [ ] Monitoring and alerting.
- [ ] Owner acceptance test.
