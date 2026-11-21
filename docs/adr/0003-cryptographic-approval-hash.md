# ADR 0003: Cryptographic Approval Hash and Invalidation Invariant

- **Status**: Accepted
- **Deciders**: Lead Product Engineer & System Architect
- **Date**: 2026-11-21

## Context and Problem Statement
Autonomous AI agents or human operators may inadvertently modify content after it has been reviewed and approved. If unreviewed changes reach external channels, it violates brand safety, editorial policy, and compliance standards. We need a tamper-evident mechanism to guarantee that what was approved is identically what is published.

## Decision
1. **Canonical Payload Hashing**: When a draft is approved, the system generates a deterministic SHA-256 hash over canonical JSON representation:
   $$\text{canonicalPayload} = \{\text{text: normalizeWhitespace(text)}, \text{threadParts}, \text{channelId}, \text{mediaUrls}\}$$
2. **Immutable Record**: The computed `approvedHash`, `approvedBy`, and `approvedAt` timestamp are permanently stored in an append-only `ApprovalRecord` and referenced on the `ContentItem`.
3. **Automatic Invalidation Invariant**: Any subsequent mutation to the text, thread parts, or channel resets the item status from `approved` to `needs_review` and clears the approval snapshot.
4. **Pre-Submission Verification**: The Buffer submission gatekeeper strictly recomputes the SHA-256 hash immediately prior to dispatch and aborts with an error if it does not equal `approvedHash`.

## Consequences
- **Positive**: Zero possibility of unapproved text mutations reaching Buffer or X; clear audit trail of who approved what specific character sequence.
- **Negative**: Minor edits require re-approving the draft, which is an intentional safety feature.
