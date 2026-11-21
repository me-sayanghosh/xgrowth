# ADR 0001: Monorepo Architecture and Technology Stack Selection (0001-monorepo-tech-stack)

- **Status**: Accepted
- **Deciders**: Lead Product Engineer & System Architect
- **Date**: 2026-11-21

## Context and Problem Statement
XGrowth AI requires a tightly integrated yet modular architecture spanning an Express backend API (`apps/api`), a React web application dashboard (`apps/web`), shared TypeScript types, schemas, and enums (`packages/shared`), and centralized configuration and environment handling (`packages/config`).
We need a structure that minimizes dependency duplication, guarantees TypeScript strict mode consistency, and allows atomic commits across boundaries without external tooling friction.

## Decision
We choose an **npm workspaces** monorepo structure with Node.js v24 (`24.19.0`) and npm (`11.17.0`):
1. **Repository Layout**:
   - `apps/api`: Node.js, Express, TypeScript, Zod, Mongoose, Pino/Winston.
   - `apps/web`: React 18/19, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide icons.
   - `packages/shared`: Shared domain interfaces, JSON schemas, Zod validation schemas, Result types, and enums.
   - `packages/config`: Typed environment configuration, YAML settings loader, and runtime validation.
2. **Persistence**: MongoDB with Mongoose for document storage (indexes for fast status queries, idempotency keys, and TTL for audit logs), with in-memory Mongo test runners (`mongodb-memory-server`).
3. **AI Engine**: Google Gemini via a typed adapter interface (`AIProvider`).
4. **Testing**: Vitest for unit and integration testing across workspaces with unified coverage reporting.

## Consequences
- **Positive**: Single `npm install` manages all workspace dependencies; shared types are immediately available to both API and Web without publishing; strict TypeScript rules are universally enforced via a root `tsconfig.base.json`.
- **Negative**: Requires clean build scripts and path mapping for development and production artifact builds.
