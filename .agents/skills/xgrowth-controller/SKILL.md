---
name: xgrowth-controller
description: "Control and operate the XGrowth AI content automation engine: research topics, generate technically grounded drafts, review pending queue, request approval, and monitor publishing via Buffer."
---

# XGrowth AI Controller Skill

This skill guides Antigravity agents in controlling the **XGrowth AI** automation engine for X (Twitter) through its native Model Context Protocol (MCP) server.

## Overview & Architecture

XGrowth AI is a **Buffer-first**, human-in-the-loop content operations platform. It manages technical personal branding without spam, fake engagement, or direct bot scraping.

```
Antigravity Agent  -->  XGrowth MCP Server  -->  XGrowth Engine  -->  Buffer API  -->  X (Twitter)
```

## Core Safety Invariants

1. **Dual-Gate Safety & Emergency Pause**:
   - `globalPause: true` blocks all external submissions.
   - Use `xgrowth_toggle_emergency_pause` only when instructed by the owner.
2. **Cryptographic Approval Invariant**:
   - Every post submitted to Buffer must have `status: 'approved'` with a canonical SHA-256 hash.
   - Modifying draft text after approval invalidates approval and resets status to `needs_review`.
3. **Buffer-First Outbound Publishing**:
   - Buffer is the sole publishing provider. Do not use direct X bots or browser scrapers.
4. **No Blind Retries**:
   - If a submission request times out, it is quarantined in `unknown` state.
   - Use `xgrowth_reconcile_status` to safely verify with Buffer queue history before retrying.

---

## MCP Resources

Antigravity agents can directly read live contextual resources using `read_resource`:

| Resource URI | Description | MIME Type |
|---|---|---|
| `xgrowth://status` | Live operational status, emergency pause state, and channel connectivity | `application/json` |
| `xgrowth://review-queue` | Pending review drafts in the queue needing approval | `application/json` |
| `xgrowth://weekly-report` | Latest weekly content synthesis and week-over-week performance | `text/markdown` |

---

## MCP Prompts

The server exports reusable prompt templates to guide the agent:

1. **`draft_engineering_post`**:
   - Guide for drafting authentic, non-clickbait developer posts on X adhering strictly to 280-character constraints and verified facts.
   - Arguments: `topic`, `pillar` (optional), `format` (optional).
2. **`analyze_performance`**:
   - Guide for evaluating recent weekly reports, week-over-week delta metrics, and designing next-week hypotheses.
   - Arguments: `focusPillar` (optional).

---

## Operating Workflows

### 1. Check System Health & Status
```json
// Call tool
xgrowth_get_status()
```
Inspect:
- `globalPause`: whether submissions are halted.
- `pendingReviewCount`: drafts waiting for owner inspection.
- `brandPillars`: configured topic categories.

### 2. Research Timely Engineering Topics
```json
// Call tool
xgrowth_research_topics()
```
Returns curated RSS articles and technical discussions ranked by credibility and freshness.

### 3. Generate Technical Drafts
```json
// Call tool
xgrowth_generate_draft({
  "topic": "Type-Level Programming in TypeScript",
  "verifiedFacts": [
    "Conditional types and template literals enforce compile-time state transitions.",
    "Eliminates entire classes of runtime validation errors in domain models."
  ],
  "format": "single_post",
  "topicPillar": "TypeScript & Node.js",
  "variantCount": 2
})
```
Drafts are generated using Gemini, validated for Twitter's 280-character limit, linted against hype/buzzwords, and placed in `needs_review` state.

### 4. Review & Approval
Present the generated drafts to the user. When the owner confirms a draft:
```json
// Call tool
xgrowth_approve_draft({
  "contentItemId": "<id>",
  "channelId": "<target_buffer_channel_id>"
})
```
This stores the canonical cryptographic hash and transitions status to `approved`.

### 5. Schedule / Submit to Buffer
```json
// Call tool
xgrowth_submit_to_buffer({
  "contentItemId": "<id>",
  "channelId": "<target_buffer_channel_id>",
  "schedulingType": "addToQueue"
})
```

### 6. Weekly Performance Synthesis
```json
// Call tool
xgrowth_get_weekly_report()
```
Returns the executive Markdown report highlighting top-performing pillars, engagement metrics, and next experiment hypotheses.
