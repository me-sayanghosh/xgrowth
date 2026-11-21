# Agent Instructions

## Source of truth
Follow `PRD.md`, `WORKFLOW.md`, `PROMPT.md`, and the documents in `docs/`. If instructions conflict, prioritize safety/security, then PRD, then workflow, then implementation convenience.

## Coding rules
- TypeScript strict mode.
- Small modules and explicit interfaces.
- Validate untrusted input at system boundaries.
- Keep provider-specific logic inside adapters.
- Use UTC for persisted timestamps; display local time in the UI.
- Store content snapshots and approval hashes.
- Redact tokens, authorization headers, and sensitive user data from logs.
- Add tests with every critical behavior.
- Never silently swallow errors.

## Publishing safety
- Only approved content can be submitted.
- Any edit after approval invalidates approval.
- Global pause blocks all external write operations.
- No blind retry after ambiguous create/schedule requests.
- Provider status must be grounded in a provider response.
- Never invent Buffer endpoints or capabilities.

## Platform conduct
Do not implement automated likes, follows, unfollows, unsolicited replies, mass replies, or manipulative engagement. Keep reply generation as a suggestion for manual review.

## Completion reporting
At the end of each task, report:
1. What changed
2. Tests and commands run
3. API/documentation assumptions verified
4. Remaining risks and next step
