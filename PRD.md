# Product Requirements Document (PRD)
## XGrowth AI — Buffer-first X Content & Growth Automation

**Status:** Draft for implementation  
**Product type:** Personal-brand content operations platform  
**Primary channel:** X (formerly Twitter)  
**Publishing system:** Buffer  
**Build environment:** Google Antigravity  
**Initial operating mode:** Human-in-the-loop; automation can expand after reliability is demonstrated

---

## 1. Product vision

Create a dependable AI-assisted system that researches relevant technology topics, proposes high-quality content, manages an editorial calendar, routes approved posts into Buffer, monitors available performance data, and recommends practical improvements.

The product should reduce repetitive content work without creating spam, fake engagement, or unsafe autonomous behavior.

## 2. Goals

1. Generate a consistent stream of original posts aligned with the account owner's expertise and voice.
2. Discover timely topics in software engineering, AI, web development, JavaScript/TypeScript, React, Node.js, startups, and building in public.
3. Provide an editorial review and approval workflow.
4. Send approved posts to Buffer through supported, documented integration methods.
5. Keep an auditable record of drafts, approvals, submissions, queue results, and publishing outcomes.
6. Import available analytics and produce weekly recommendations.
7. Make the system inexpensive to operate, with Buffer handling the publishing queue wherever feasible.

## 3. Non-goals

- No automated mass following, unfollowing, liking, reposting, or unsolicited replies.
- No engagement pods, artificial impressions, trend manipulation, or deceptive identity.
- No scraping or browser automation of X/Buffer when an official API or permitted integration is required.
- No guarantee of follower growth or virality.
- No autonomous public replies in the MVP.
- No direct X API publishing in the MVP; Buffer is the intended publishing provider.
- No assumption that Buffer exposes every desired endpoint or metric. Validate before implementation.

## 4. Users and primary use cases

### Primary user
A developer building a personal brand around software engineering, MERN/full-stack development, AI tooling, learning in public, and startup/product building.

### Use cases
- As the account owner, I want daily topic suggestions so I can publish relevant content consistently.
- I want AI-generated drafts that sound natural and technically credible.
- I want to edit and approve drafts before they enter Buffer.
- I want approved posts added to a selected Buffer channel/queue.
- I want to see whether Buffer accepted a post and whether it is queued, published, failed, or needs attention.
- I want a weekly report showing what worked and what to test next.
- I want to pause all submissions immediately.

## 5. Core product modules

### 5.1 Dashboard
Show:
- Today's research opportunities
- Drafts awaiting review
- Approved items ready for Buffer
- Buffer submission status
- Upcoming scheduled content (only where supported by Buffer data)
- Recent publishing outcomes
- Weekly performance summary
- Integration health and last successful sync

### 5.2 Research desk
Inputs:
- Topic pillars and keywords
- Trusted source list
- Optional RSS/news feeds or approved search provider
- User-submitted links and notes

Outputs:
- Topic title
- Why it matters now
- Source URL(s)
- Verified facts and uncertainty notes
- Suggested angle
- Content format recommendation
- Freshness timestamp

Research must distinguish facts from opinions and must not invent sources, quotes, statistics, or product capabilities.

### 5.3 AI content studio
Supported formats:
- Single post
- Short educational post
- Practical tip/checklist
- Build-in-public update
- Opinion with reasoning
- Multi-post thread (only if Buffer integration supports the intended format; otherwise export as a sequence or manual workflow)

Every draft should include:
- Draft text
- Format
- Topic pillar
- Intended audience
- Source references, if factual/current
- Hook/angle
- Suggested CTA (optional)
- Hashtag suggestions (optional; avoid stuffing)
- Quality score with explanations
- Risk flags
- Character count validated against current X constraints

### 5.4 Editorial approval
States:
`idea → researched → draft → needs_review → approved → submitted_to_buffer → queued/published/failed/unknown`

Rules:
- Only `approved` content may be submitted to Buffer.
- Edits after approval invalidate the approval and require re-approval.
- Approval records user, timestamp, and content hash.
- Every external submission must be idempotent where supported; otherwise maintain a local duplicate-prevention key and reconcile before retry.

### 5.5 Buffer publishing connector
Responsibilities:
- For this single-owner MVP, use a personal Buffer API key stored server-side. Do not build OAuth unless the product later supports other users connecting their own Buffer accounts.
- Discover/select the correct Buffer organization/channel.
- Submit approved content using documented endpoints and supported payloads.
- Store provider IDs and response metadata.
- Reconcile queue/publishing status using supported read endpoints or webhooks if available.
- Handle rate limits, token expiry, validation failures, and provider outages.
- Never claim a post is scheduled unless Buffer confirms it.

**Gate:** Do not implement against guessed endpoints. First inspect official current docs and verify account/API eligibility.

### 5.6 Engagement intelligence
MVP:
- Analyze imported or API-provided post performance and public conversation data where lawfully and technically available.
- Recommend relevant conversations and draft possible replies for owner review.
- Notify owner about mentions only if a supported data source is connected.

Excluded:
- Automatic unsolicited replies
- Automated likes/follows/reposts
- Repetitive reply templates
- Mass outreach

### 5.7 Analytics and reporting
Track only metrics available from Buffer or a connected authorized data source:
- Posts published
- Impressions/reach (if provided)
- Likes, replies, reposts, clicks (if provided)
- Engagement rate (document denominator and formula)
- Follower count changes (only if sourced)
- Top posts and content pillars
- Posting cadence

Reports:
- Daily concise status
- Weekly performance review
- Monthly content-pillar review

Every metric must record its source and collection timestamp. Missing metrics must be shown as unavailable, not estimated.

### 5.8 Settings
- Topic pillars
- Brand voice
- Posting frequency
- Preferred publishing windows (editable; do not assert they are universally optimal)
- Review mode
- Buffer channel mapping
- Research sources
- Notification preferences
- Retention and deletion controls
- Emergency pause

## 6. Operating modes

1. **Review-everything (default):** every generated draft requires approval.
2. **Approved-category automation:** only explicitly allowlisted formats/categories can auto-submit; new topics and factual claims remain review-gated.
3. **Full auto-submit (not recommended initially):** only after a prolonged safe test period, with strict limits, audit logs, and an immediate kill switch. This still must obey platform and provider rules.

The MVP must default to mode 1.

## 7. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Create, edit, archive, and search content ideas | P0 |
| FR-02 | Generate drafts from approved topic briefs | P0 |
| FR-03 | Validate content length and formatting | P0 |
| FR-04 | Review, edit, approve, and reject drafts | P0 |
| FR-05 | Connect Buffer via documented supported method | P0 after API validation |
| FR-06 | Submit approved drafts to a selected Buffer channel | P0 after API validation |
| FR-07 | Store Buffer response/provider identifiers | P0 |
| FR-08 | Prevent accidental duplicate submissions | P0 |
| FR-09 | Show submission and queue status | P0 where API supports it |
| FR-10 | Pause all external submissions | P0 |
| FR-11 | Import available analytics | P1 |
| FR-12 | Generate weekly performance reports | P1 |
| FR-13 | Research current topics with source references | P1 |
| FR-14 | Recommend replies for manual approval | P2 |
| FR-15 | Multi-channel support | P2 |

## 8. Non-functional requirements

- Secrets must never reach client-side bundles or logs.
- Use TLS for all external communication.
- Validate all inputs and provider responses.
- Apply request timeouts, bounded retries, and exponential backoff.
- Use idempotency keys where supported.
- Maintain audit logs for approvals and external actions.
- Provide graceful degradation when AI or Buffer is unavailable.
- Keep the MVP deployable with a low-cost footprint.
- Add tests for approval gates, duplicate prevention, and provider error handling.
- Provide a clear data export and deletion path.

## 9. Suggested success metrics

These are product-operating targets, not growth guarantees:
- 100% of external submissions have a recorded approval or explicit automation-policy authorization.
- 0 duplicate posts caused by retries in acceptance tests.
- 100% of submissions have a traceable local record.
- At least 5 days of planned content visible in the editorial queue when the owner has supplied sufficient ideas.
- Weekly report generated with source-backed metrics and no fabricated values.
- Owner can pause submissions in one action.

## 10. MVP acceptance criteria

The MVP is accepted when:
1. Owner can create a topic and generate a draft.
2. Owner can edit and approve the draft.
3. Unapproved content is rejected by the submission service.
4. Approved content can be submitted to Buffer through a verified supported API path.
5. Provider confirmation and IDs are saved.
6. Duplicate retry tests do not create duplicate submissions.
7. Failed/ambiguous submissions are clearly marked and not blindly retried.
8. Owner can disable all Buffer submissions immediately.
9. Secrets are stored outside source control.
10. Setup, API limitations, and deployment steps are documented.

## 11. Risks and dependencies

- Buffer API capabilities, permissions, request limits, channel support, and plan entitlements may change.
- Buffer may not expose every queue status or analytics metric needed.
- X content limits and platform rules can change.
- AI can hallucinate or produce repetitive/low-quality content.
- API limits and outages can delay submissions.
- Token handling and account security are critical.

Mitigation: verify provider docs first, maintain human approval, preserve source links, log every action, and design graceful fallbacks.

## 12. Open decisions

- Exact Buffer API access and authentication method for the owner's account.
- Whether the desired X channel is connected and authorized in Buffer.
- Whether thread publishing is supported by the verified integration.
- Preferred content language (English, Bengali, or mixed).
- Brand voice examples and topics to avoid.
- Hosting and notification provider.
