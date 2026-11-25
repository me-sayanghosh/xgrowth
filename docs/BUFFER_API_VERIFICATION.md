# Buffer API Verification Notes

**Checked:** 2026-11-26  
**Scope:** Single-owner personal-brand automation using Buffer GraphQL API (`BufferGraphQLProvider`) to publish single posts and X threads to a connected X account. Re-check before production because APIs and plan limits can change.

## Confirmed from current official documentation

| Capability | Current finding | Build implication |
|---|---|---|
| API type | GraphQL API | Use GraphQL requests to `https://api.buffer.com` |
| API access | Available on Free and paid plans | No separate developer subscription is required for basic personal use |
| Personal auth | Personal API key from Buffer Settings → API; Bearer token | Use `BUFFER_API_KEY` on backend only |
| Create/schedule posts | Supported | Submit approved posts to a connected X channel |
| Queue scheduling | `addToQueue` / automatic scheduling is documented | Let Buffer choose the next available queue slot when desired |
| X publishing | Supported | X is an available publishing destination |
| X threads | Supported | Thread metadata is documented; verify exact schema for chosen format |
| Account/channel/post retrieval | Supported | Use for channel selection and publication history/status where returned |
| Ideas | Create/list supported | Could optionally sync idea backlog to Buffer |
| Full Insights analytics | Not currently reliable through API | Do not build core analytics on this API; use Buffer dashboard or another authorized data source |
| Comments/replies | Reading/replying not supported through API | Engagement agent can recommend replies, but user handles them manually |
| Media | Public URL references; not direct binary upload | Media must be hosted at a reachable public URL until publishing |
| Rate limits | Free plan currently documented as 1 API key and 1,000 requests per connected channel per 30 days, up to 3,000 | Cache reads; avoid polling frequently |

## Official sources

- Buffer API overview and limits: https://support.buffer.com/en-us/articles/using-buffers-api-GtIYIQilz5
- Authentication: https://developers.buffer.com/guides/authentication.html
- Introduction: https://developers.buffer.com/guides/introduction.html
- Quick start: https://developers.buffer.com/guides/getting-started.html
- Posts and scheduling: https://developers.buffer.com/guides/posts-and-scheduling.html
- First post: https://developers.buffer.com/guides/your-first-post.html

## Important implementation decisions

1. This pack targets a **single-owner** deployment. Use a personal API key, not OAuth, unless multi-user account authorization becomes a requirement.
2. The personal API key has account-level access across organizations/channels available to that Buffer account. Protect it like a password.
3. Keep Buffer as the publisher. Do not implement direct X API publishing in the MVP.
4. Do not promise complete analytics, engagement inbox, or reply automation from the Buffer API.
5. Use the Buffer web dashboard for full native Insights and engagement operations.
6. Confirm exact GraphQL input fields and X metadata from the official schema/reference before coding; do not copy guessed payloads.
