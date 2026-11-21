# ADR 0005: Ambiguous Submission Recovery, Idempotency & Duplicate Prevention

- **Status**: Accepted
- **Deciders**: Lead Product Engineer & System Architect
- **Date**: 2026-11-21

## Context and Problem Statement
When publishing to social networks via external APIs, network timeouts, socket disconnects, or upstream 502/504 errors create ambiguity: did Buffer receive and queue the post before the connection dropped, or did the request fail to reach the server? Blindly retrying an unconfirmed request can result in embarrassing duplicate posts on public timelines.

## Decision
1. **Deterministic Idempotency Key**: Prior to issuing any GraphQL creation request, calculate a deterministic idempotency key:
   $$\text{idempotencyKey} = \text{sha256}(\text{contentItemId} + \text{approvedHash} + \text{channelId})$$
   Persist this key in `ProviderSubmissionModel` with a unique index.
2. **Ambiguous Outcome Transition**: If an HTTP request times out or disconnects after dispatch, do **not** mark it as `failed` or retry. Transition the item status to `unknown`.
3. **Reconciliation Before Retry**: Items in the `unknown` state lock any automated retry. The system must query Buffer's channel posts or status endpoint to ascertain whether the post exists upstream.
4. **Manual Recovery UI**: Expose a dedicated status reconciliation drawer in the dashboard where the owner can view the correlation ID, inspect recent Buffer channel history, and safely resolve the status.

## Consequences
- **Positive**: Absolute zero risk of accidental duplicate posts on X due to blind retries.
- **Negative**: Requires a lightweight reconciliation service and occasional operator review if upstream network outages occur.
