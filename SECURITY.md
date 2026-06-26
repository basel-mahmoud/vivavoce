# Security policy

## Reporting

Email **security@vivavoce.app** with details and a proof-of-concept if possible.
Please do not open public issues for vulnerabilities. We aim to acknowledge
within 72 hours. We support coordinated disclosure and will credit reporters who
wish to be credited.

## Scope

- `apps/web` (marketing site + API)
- `apps/mobile` (Expo app)
- Infrastructure config in this repository

## Out of scope

- Third-party platforms (Clerk, Neon, Vercel, Google Gemini) — report to them.
- Social engineering, physical attacks, volumetric DoS.

## Handling of sensitive data

Voice recordings and transcripts are treated as the most sensitive data class.
See [docs/SECURITY.md](docs/SECURITY.md) and [docs/COMPLIANCE.md](docs/COMPLIANCE.md)
for storage, retention, and deletion guarantees.
