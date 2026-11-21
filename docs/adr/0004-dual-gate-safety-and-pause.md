# ADR 0004: Dual-Gate Safety and Emergency Global Pause Architecture

- **Status**: Accepted
- **Deciders**: Lead Product Engineer & System Architect
- **Date**: 2026-11-21

## Context and Problem Statement
When working with AI generation and automated publishing queues, unforeseen events (such as a breaking news crisis, credential compromise, or buggy behavior) require immediate intervention. The owner needs an instantaneous kill-switch that prevents external publishing without destroying local research, draft backlogs, or user configurations.

## Decision
1. **Dual-Gate Enforcement**: Every external write action (submitting to Buffer, creating queue slots, updating status) must pass through a two-level security gate:
   - **Gate 1 (Global Gate)**: Verify that `global_pause === false`. If `global_pause === true`, hold the post locally in an approved holding state and log a security audit event.
   - **Gate 2 (Item Gate)**: Verify that `item.status === 'approved'` and the cryptographic hash matches.
2. **Default-Safe Initialization**: The system starts with `global_pause: true` by default in `settings.example.yaml` until the owner explicitly toggles it off.
3. **Emergency Interception**: The `POST /api/settings/emergency-pause` endpoint provides a sub-millisecond toggle that locks all active workers and background scheduled tasks from dispatching requests.
4. **Local Operation Preservation**: Internal functions such as topic harvesting, RSS reading, and AI draft generation remain fully operational during a pause.

## Consequences
- **Positive**: Complete fail-safe operational control; zero external mutations occur during suspected anomalies or manual interventions.
- **Negative**: Operator must consciously disable global pause once initial integration testing succeeds.
