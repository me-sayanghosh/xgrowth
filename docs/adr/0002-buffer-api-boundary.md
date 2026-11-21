# ADR 0002: Buffer API Boundary, Authentication & Rate Limiting Strategy

- **Status**: Accepted
- **Deciders**: Lead Product Engineer & System Architect
- **Date**: 2026-11-21

## Context and Problem Statement
Publishing to X (formerly Twitter) must go through Buffer as the single outbound publishing engine. We must interface with Buffer reliably without violating plan rate limits, assuming non-existent endpoints, or leaking account-wide access tokens.

## Decision
1. **API Protocol & Endpoint**: Connect strictly to Buffer's documented GraphQL API at `https://api.buffer.com`.
2. **Authentication**: Use a single-owner server-side Personal API Key (`BUFFER_API_KEY`) passed in HTTP headers as `Authorization: Bearer <BUFFER_API_KEY>`. Do not implement complex multi-tenant OAuth in the MVP.
3. **Rate Limits & Caching**: Buffer Free tier permits 1 API key, up to 1,000 requests per connected channel per 30 days (max 3,000 requests total). The system must aggressively cache channel discovery metadata, channel IDs, and avoid high-frequency polling.
4. **Unsupported Capabilities Boundary**:
   - Native comments and replies are *not* supported via the Buffer API; engagement workflows remain advisory for manual owner action.
   - Deep native Insights analytics are *not* reliably exposed via the API.
   - Media uploads require publicly accessible URLs (no direct binary uploads via the API).

## Consequences
- **Positive**: Simple, robust single-owner setup; zero risk of running unauthorized browser automations; strict rate-limit protection prevents service disruption.
- **Negative**: Polling intervals must be throttled (max once every 6 hours for background reconciliation); media must be hosted on public storage before submission.
