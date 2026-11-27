# Security and Privacy Requirements

## Secrets
- Keep `.env` out of version control.
- Use server-side environment variables or a managed secret store.
- Never place Buffer tokens or AI API keys in frontend code.
- Never log access tokens, refresh tokens, cookies, or authorization headers.
- Rotate credentials if exposed.

## Authentication & Rate Limiting
- Protect the dashboard behind single-owner authentication (`singleOwnerAuthMiddleware` using constant-time SHA-256 `crypto.timingSafeEqual` verification).
- Never accept development fallback tokens (`dev-owner-token`) when `NODE_ENV === 'production'`.
- Enforce `x-xgrowth-csrf: 1` CSRF defense for state-modifying requests (`POST`, `PATCH`, `PUT`, `DELETE`).
- Enforce Helmet CSP, restrictive CORS (`configureSecurityMiddlewares`), global API rate limiting (`globalRateLimiter`), and strict mutation rate limiting (`mutationRateLimiter`).

## SSRF, Prompt Injection & Error Hardening
- `SafeFetcher` validates URLs and resolved DNS A/AAAA addresses (`dns.lookup`) to block IPv4/IPv6 loopback, RFC 1918 private subnets, cloud metadata (`169.254.169.254`), `.local`/`.internal` hostnames, alternate IP encodings (hex/octal/integer), embedded URL credentials, unsafe HTTP redirects (`redirect: 'manual'`), and responses > 2 MB.
- `GeminiAIAdapter`, `HookGeneratorService`, and `CtaRecommenderService` pass keys via `x-goog-api-key` headers (never query URLs), enforce `AbortController` timeouts, and isolate untrusted external research content inside `<untrusted_source_data>` delimiters.
- `errorHandler` maps Mongoose `CastError` to HTTP `400 INVALID_ID` and sanitizes `?key=` and `Bearer ...` tokens before logging or returning responses.

## Token storage
- Encrypt provider tokens at rest using a key stored separately from the database.
- Limit token access to the provider adapter.
- Support disconnect and token revocation.
- Avoid requesting broader scopes than required.

## Data minimization
- Store only content and analytics needed for the product.
- Avoid collecting private messages or sensitive personal data.
- Do not store unnecessary audience-level personal information.
- Provide export and deletion functionality.

## Audit
Record:
- User approvals/rejections
- Content edits after approval
- Buffer submission attempts and results
- Pause/unpause events
- Provider connection/disconnection
- Settings changes

Redact secrets and sensitive payload fields.

## Incident response
- Emergency pause blocks all external writes.
- Disconnect provider credentials if compromise is suspected.
- Preserve sanitized audit events.
- Rotate credentials and review recent external actions.

## Buffer personal API key
For the initial single-owner version, use a personal Buffer API key. It can access all organizations and channels in that Buffer account, so store it encrypted or in a server-side secret manager, restrict backend access, and rotate it if exposed. Do not send it to the browser.
