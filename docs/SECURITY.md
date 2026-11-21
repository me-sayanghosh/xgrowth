# Security and Privacy Requirements

## Secrets
- Keep `.env` out of version control.
- Use server-side environment variables or a managed secret store.
- Never place Buffer tokens or AI API keys in frontend code.
- Never log access tokens, refresh tokens, cookies, or authorization headers.
- Rotate credentials if exposed.

## Authentication
- Protect the dashboard behind owner authentication.
- Use secure, HttpOnly, SameSite cookies if using cookie sessions.
- Add CSRF defenses for cookie-authenticated write requests.
- Use restrictive CORS and security headers.
- Rate-limit login and sensitive endpoints.

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
