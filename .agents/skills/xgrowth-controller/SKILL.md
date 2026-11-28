---
name: xgrowth-controller
description: "Control and operate the XGrowth AI content automation engine: research topics, model style from reference accounts, draft directly without external AI keys, review pending queue, request approval, and publish via Buffer."
---

# XGrowth AI Controller Skill

This skill guides Antigravity and VS Code agents in operating **XGrowth AI** in **zero-DB local mode** (`data/*.json`) connected directly to **Buffer** (`https://api.buffer.com`) via `@xgrowth/mcp` or `npm run cli`.

## Overview & Architecture

```text
Antigravity / VS Code Agent  -->  @xgrowth/mcp (Local JSON Store + 4-Gate Safety)  -->  Buffer API  -->  X (Twitter)
```

No MongoDB, React frontend, or external `GEMINI_API_KEY` is required in local mode. The agent acts as the strategist and writer, persisting drafts locally in `data/drafts.json` and reference styles in `data/references.json`.

## Core Safety Invariants

1. **Dual-Gate Safety & Emergency Pause**:
   - `globalPause: true` (default) blocks all outbound Buffer submissions.
   - Only disable via `xgrowth_toggle_emergency_pause` when explicitly instructed by the owner.
2. **Cryptographic Approval Invariant**:
   - Every post submitted to Buffer must have `status: 'approved'` with a canonical SHA-256 hash bound to text + threadParts + channelId + mediaUrls.
   - Modifying draft text after approval immediately revokes approval and resets status to `needs_review`.
3. **Buffer-First Outbound Publishing**:
   - Buffer is the sole publishing provider. Never use direct X bots, automated likes/follows/replies, or X scrapers.
4. **Reference Account Rules**:
   - Use saved reference accounts (`xgrowth_save_reference_account`, `xgrowth://style-profile`) for **structural/style inspiration** (hooks, pacing, archetypes, topics).
   - Never copy or paraphrase reference posts verbatim, and never fabricate personal experiences.
5. **No Blind Retries**:
   - Timeouts quarantine items in `unknown` state. Always run `xgrowth_reconcile_status` before retrying.

---

## MCP Resources

| Resource URI | Description | MIME Type |
|---|---|---|
| `xgrowth://status` | Live operational status, pause state, and queue counts | `application/json` |
| `xgrowth://review-queue` | Pending review drafts needing owner approval | `application/json` |
| `xgrowth://style-profile` | Brand pillars, voice traits, avoid list, and saved reference accounts | `application/json` |
| `xgrowth://weekly-report` | Local weekly summary report | `text/markdown` |

---

## Operating Workflows (Zero-DB Local Mode)

### 1. Check Health & Discover Buffer Channel
```json
xgrowth_get_status()
xgrowth_list_channels()
```

### 2. Save & Read Reference Account Styles
When the owner shares reference X accounts or example posts:
```json
xgrowth_save_reference_account({
  "handle": "@example_handle",
  "styleTraits": ["Short concrete takeaways", "Code or architecture trade-offs"],
  "postArchetypes": ["single_post", "build_in_public"],
  "samplePosts": ["Example post pasted by owner"],
  "topics": ["TypeScript", "Backend architecture"]
})
```
Read `xgrowth://style-profile` or call `xgrowth_get_style_profile()` before writing drafts.

### 3. Research & Author Drafts Directly (No Gemini Key Needed)
1. Save discovered source links/notes (optional):
   `xgrowth_add_research_topic({ "title": "...", "sourceUrl": "https://...", "summary": "..." })`
2. Write original posts adhering strictly to X's 280-char limit and save directly to `needs_review`:
```json
xgrowth_create_draft({
  "text": "Your original developer post under 280 characters.",
  "format": "educational_tip",
  "topicPillar": "Software engineering",
  "sourceUrls": ["https://..."]
})
```
*(For threads, pass `format: "thread_draft"` and `threadParts: ["1/3 ...", "2/3 ...", "3/3 ..."]`.)*

### 4. Review, Approve & Submit to Buffer
Present `needs_review` drafts to the owner. Once the owner confirms:
```json
xgrowth_approve_draft({
  "contentItemId": "<id>",
  "channelId": "<target_buffer_channel_id>"
})
```
Then schedule or submit:
```json
xgrowth_submit_to_buffer({
  "contentItemId": "<id>",
  "channelId": "<target_buffer_channel_id>",
  "schedulingType": "addToQueue"
})
```
