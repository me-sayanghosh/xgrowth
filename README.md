# XGrowth AI — Buffer-first Automation Starter Pack

A specification and build pack for an AI-assisted X (Twitter) content, publishing, and growth workflow using **Buffer as the publishing queue** and **Antigravity as the development/agent environment**.

> This pack is a build specification, not a claim that any account has been connected or that publishing is already enabled. Buffer's current API is a GraphQL API available on Free and paid plans, subject to limits. For a single-owner setup, use a personal API key stored server-side. Verify current limits and channel capabilities before implementation.

## Zero-DB Local Agent Mode (Recommended for Antigravity & VS Code)
You can run XGrowth AI **without MongoDB, without the React frontend, and without `GEMINI_API_KEY`** by letting Antigravity or VS Code Copilot act as the AI writer over local JSON storage (`data/`) connected directly to Buffer:
- See [docs/LOCAL_AGENT_GUIDE.md](docs/LOCAL_AGENT_GUIDE.md) for setup, `.vscode/mcp.json`, VS Code Tasks, and `npm run cli -- --help`.

## Included
- `PRD.md` — product requirements, scope, personas, acceptance criteria
- `WORKFLOW.md` — end-to-end operating workflow and failure paths
- `PROMPT.md` — detailed Antigravity build prompt
- `AGENTS.md` — project-level rules for coding agents
- `docs/ARCHITECTURE.md` — recommended architecture and integrations
- `docs/BUFFER_INTEGRATION.md` — API integration checklist and verification gates
- `docs/CONTENT_POLICY.md` — editorial, quality, and platform-safety rules
- `docs/SECURITY.md` — secrets, OAuth, privacy, and operational security
- `config/settings.example.yaml` — editable operating defaults
- `.env.example` — environment variable names only; never put real secrets here
- `schemas/content-item.schema.json` — normalized content item schema
- `templates/` — research, post, and weekly report templates
- `BACKLOG.md` — implementation phases and task checklist

## Suggested first build
Build a local-first MVP:
1. Dashboard and content library.
2. Research intake and AI draft generation.
3. Human approval queue.
4. Buffer integration using the documented GraphQL API and a server-side personal API key.
5. Scheduling and publishing status reconciliation.
6. Analytics import and weekly report.

Do not build a browser-clicking bot for X or Buffer. Use documented APIs and approved integrations only.

## Setup
1. Create a new Antigravity workspace and place these files at the repository root.
2. Open `PROMPT.md` and ask Antigravity to follow it.
3. Have the agent inspect current Buffer docs before writing integration code.
4. Copy `.env.example` to `.env` and fill secrets locally; never commit `.env`.
5. Start in dry-run mode. Test drafts and queue operations with a private/test channel where possible.
6. Enable live publishing only after explicit owner approval.

## Key design decision
The system should not independently publish to X. It prepares content and submits approved content to Buffer. Buffer remains the source of truth for scheduled/published queue state wherever its API exposes that state.
