# XGrowth AI — Zero-DB Local Agent Guide (Antigravity + VS Code)

This guide covers running XGrowth AI in **Zero-DB, Zero-Frontend Local Mode**, where **Antigravity** or **VS Code** acts as the AI writer & operator, local JSON files in `data/` store drafts/styles/audit logs, and **Buffer GraphQL** (`https://api.buffer.com`) publishes approved posts to your X (Twitter) account.

---

## 1. Architecture

```text
Antigravity / VS Code (MCP + CLI + Tasks)
          │
          ▼
  @xgrowth/mcp (Local JSON Store + 4-Gate Safety)
          │   reads/writes data/*.json & data/audit.jsonl
          ▼
  Buffer GraphQL API (https://api.buffer.com) ──▶ Connected X Account
```

- **No MongoDB** required (`data/settings.json`, `data/drafts.json`, `data/references.json`, `data/topics.json`, `data/quota.json`, `data/audit.jsonl`).
- **No React frontend** or Express server required.
- **No `GEMINI_API_KEY`** required — Antigravity or VS Code Copilot writes drafts directly and persists them with `xgrowth_create_draft` or `npm run cli -- draft create`.

---

## 2. Environment Setup

Only `BUFFER_API_KEY` is required in `.env` at the repository root:

```env
BUFFER_API_KEY=<your_buffer_personal_api_key>
```

Build the workspace once (and after any code changes):

```bash
npm run build
```

---

## 3. Using from VS Code

### A. VS Code Copilot / MCP Agent Mode
`.vscode/mcp.json` automatically registers the `xgrowth` stdio MCP server:
- Tools: `xgrowth_get_status`, `xgrowth_list_channels`, `xgrowth_save_reference_account`, `xgrowth_list_reference_accounts`, `xgrowth_get_style_profile`, `xgrowth_create_draft`, `xgrowth_edit_draft`, `xgrowth_approve_draft`, `xgrowth_schedule_post`, `xgrowth_submit_to_buffer`, `xgrowth_reconcile_status`, `xgrowth_toggle_emergency_pause`, `xgrowth_get_weekly_report`, and more.
- Resources: `xgrowth://status`, `xgrowth://review-queue`, `xgrowth://style-profile`, `xgrowth://weekly-report`.

### B. VS Code Tasks (`Cmd+Shift+P` → `Tasks: Run Task`)
`.vscode/tasks.json` provides one-click tasks:
- `XGrowth: Status`
- `XGrowth: List Buffer Channels`
- `XGrowth: List Review Queue`
- `XGrowth: List Reference Accounts`
- `XGrowth: Emergency Pause ON` / `XGrowth: Emergency Pause OFF`

### C. VS Code Integrated Terminal CLI
```bash
npm run cli -- status
npm run cli -- channels
npm run cli -- channel default <buffer_channel_id>
npm run cli -- ref add --handle @example --traits "concise,trade-offs" --sample "Example post text"
npm run cli -- draft create --text "Your 280-char post" --pillar "Software engineering"
npm run cli -- draft list needs_review
npm run cli -- draft approve <draft_id>
npm run cli -- pause off
npm run cli -- draft submit <draft_id> --mode addToQueue
```

---

## 4. Using from Antigravity

- `.agents/mcp_config.json` launches `packages/mcp/dist/index.js` directly against `data/` and Buffer.
- `.agents/skills/xgrowth-controller/SKILL.md` guides Antigravity to:
  1. Read `xgrowth://style-profile` and your saved reference accounts.
  2. Research topics and author original posts under 280 characters via `xgrowth_create_draft`.
  3. Present `needs_review` drafts for your approval (`xgrowth_approve_draft`).
  4. Submit approved posts to Buffer (`xgrowth_submit_to_buffer`) only when `globalPause` is `false`.

---

## 5. Safety Invariants

1. **Default Emergency Pause (`globalPause: true`)**: Blocks all Buffer writes until explicitly disabled.
2. **SHA-256 Approval Binding**: Approval computes a canonical hash over `{ text, threadParts, channelId, mediaUrls }`. Editing a draft revokes approval and resets status to `needs_review`.
3. **Timeout Quarantine**: Network timeouts mark items `unknown` and block retries until `reconcile` verifies Buffer queue history.
4. **Reference Account Ethics**: Reference accounts guide structure, tone, and topic pillars only — never scrape X or copy posts verbatim.
