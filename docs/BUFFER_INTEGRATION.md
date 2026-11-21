# Buffer Integration — Verification Checklist

**Important:** This file intentionally does not specify endpoint URLs or request payloads. Verify the current official documentation before implementation.

Official starting points:
- https://developers.buffer.com/
- https://buffer.com/developers
- https://support.buffer.com/

## 1. Access and account checks
- [ ] Confirm Buffer developer/API access is currently available.
- [ ] Confirm whether API access is included in the owner's current plan.
- [ ] Confirm the X channel is connected to the correct Buffer account.
- [ ] Confirm app registration and authorization requirements.
- [ ] Confirm whether API use requires review or special approval.

## 2. Authentication
For a single-owner personal-brand tool, Buffer currently documents a personal API key:
- [ ] In Buffer, open Settings → API and create a personal API key.
- [ ] Keep the key on the backend only; send it as a Bearer token to `https://api.buffer.com`.
- [ ] Never expose the key to frontend code or logs.
- [ ] Confirm verified email and channel access prerequisites.
- [ ] Test invalid key and revoked/rotated key behavior.
- [ ] Use OAuth only if the application later allows multiple independent Buffer users to authorize their own accounts.

Official auth guide: https://developers.buffer.com/guides/authentication.html

## 3. Channel discovery
- [ ] Verify whether organizations/workspaces can be listed.
- [ ] Verify whether connected channels can be listed.
- [ ] Confirm how X channels are identified.
- [ ] Confirm whether the API exposes channel capability metadata.
- [ ] Store provider IDs; never infer them from display names.

## 4. Publishing
- [ ] Verify documented create/publish/schedule operation.
- [ ] Verify X support and accepted post formats.
- [ ] Verify text length, media, link, and thread limitations.
- [ ] Verify whether scheduling uses a queue slot or explicit timestamp.
- [ ] Verify timezone semantics.
- [ ] Verify response fields and error format.
- [ ] Verify idempotency support or define safe local reconciliation.
- [ ] Test on a low-risk account/channel before production.

## 5. Status and analytics
- [ ] Verify whether queued/scheduled/published/failed states are readable.
- [ ] Verify pagination and rate limits.
- [ ] Verify whether webhooks exist and how they are authenticated.
- [ ] Verify which analytics metrics are available for X.
- [ ] Record metric definitions and data freshness.
- [ ] Do not assume follower counts, impressions, or click data are exposed.

## 6. Rate limits and failure handling
- [ ] Record documented rate limits and reset headers.
- [ ] Test expired token, invalid scope, invalid channel, invalid payload.
- [ ] Test rate-limit response.
- [ ] Test provider timeout and ambiguous submission.
- [ ] Confirm safe reconciliation before retry.

## 7. Current capability notes (verify again before release)
Based on current Buffer documentation:
- Buffer API is a GraphQL API at `https://api.buffer.com`.
- API access is available on Buffer plans including Free, subject to request limits.
- The API supports creating/managing posts and ideas, and retrieving account, organization, channel, scheduled-post, and sent-post data.
- X is a supported publishing channel; X threaded posts are documented.
- Full reliable Insights analytics are not currently available through the API. Experimental post metrics should not be treated as production reporting.
- Reading/replying to comments is not supported through the API.
- Media is referenced by public URL rather than uploaded directly through the API; verify channel-specific constraints.

Official references:
- https://support.buffer.com/en-us/articles/using-buffers-api-GtIYIQilz5
- https://developers.buffer.com/guides/introduction.html
- https://developers.buffer.com/guides/authentication.html
- https://developers.buffer.com/guides/posts-and-scheduling.html

## 8. Verification report format

Create `docs/BUFFER_API_VERIFICATION.md` with:

| Capability | Status | Official source | Account test | Notes |
|---|---|---|---|---|
| Personal API key | verified / unsupported / account test | URL | pass/fail/not run | |
| Channel list | ... | URL | ... | |
| X post submit | ... | URL | ... | |
| Schedule/queue | ... | URL | ... | |
| Status read | ... | URL | ... | |
| Analytics | ... | URL | ... | |
| Webhooks | ... | URL | ... | |

Do not start live integration until auth and X publishing capabilities are verified. If unsupported, implement a manual handoff and explain the limitation.
