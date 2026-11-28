# XGrowth AI — Local Agent & Buffer Automation for X

A zero-database, zero-frontend AI content operations agent for **X (Twitter)** powered by **Antigravity / VS Code MCP + CLI** and **Buffer GraphQL** (`https://api.buffer.com`).

> Single-owner architecture: Antigravity or VS Code Copilot researches topics, learns style patterns from saved reference accounts, drafts posts locally under strict 280-character and tone checks, and submits approved posts to Buffer with cryptographic SHA-256 approval locks.

## Quick Start

1. Copy `.env.example` to `.env` and add your `BUFFER_API_KEY` (from Buffer **Settings → API**).
2. Build the packages:
   ```bash
   npm run build
   ```
3. Verify your Buffer X channel and local status:
   ```bash
   npm run cli -- channels
   npm run cli -- status
   ```
4. Operate from **Antigravity** (`.agents/mcp_config.json` + `.agents/skills/xgrowth-controller/SKILL.md`) or **VS Code** (`.vscode/mcp.json`, `.vscode/tasks.json`, or `npm run cli -- --help`).

See [docs/LOCAL_AGENT_GUIDE.md](docs/LOCAL_AGENT_GUIDE.md) for the full command and MCP reference.

## Repository Structure

- `packages/shared` — Shared Zod schemas, content enums, X 280-char validator, and tone linter
- `packages/config` — Environment loader (`BUFFER_API_KEY`, `XGROWTH_DATA_DIR`)
- `packages/mcp` — Local JSON/JSONL store, 4-gate Buffer GraphQL publisher, 23-tool MCP server, and `xgrowth` CLI
- `.agents/` — Antigravity MCP configuration and `xgrowth-controller` skill
- `.vscode/` — VS Code MCP configuration and runnable workspace tasks
- `docs/` — Architecture, Buffer API verification, security, content policy, and local agent guide
