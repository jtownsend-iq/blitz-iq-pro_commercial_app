# Domains & Routing Security Runbook

## Defaults (opinionated)
- DNS: Cloudflare (or Route53 if already in AWS) with DNSSEC enabled; all records managed via Terraform + PR review.
- Edge: single TLS terminator (Cloudflare proxy or CloudFront/ALB) with SNI; never trust origin Host header.
- Certs: ACME automation (Let’s Encrypt/ZeroSSL or ACM) with renewals starting at 30 days; use DNS-01 for apex/tenant domains, HTTP-01 only for platform-owned hosts.
- Host mapping: authoritative lookup table (`custom_domains` with `host`, `tenant_id`, `status`, `ssl_cert_id`, `verified_at`, `blocked_at`); reject unknown hosts.

## Hygiene & Inventory
- Keep an inventory of every zone and hostname; forbid wildcard `*.domain.com` except explicitly isolated front-door hosts; disallow self-service arbitrary hostnames.
- Short TTL (60–300s) on front-door records to support failover; long TTL for static records only.
- DNSSEC on; remove unused CNAME/ALIAS pointing to third parties; weekly dangling-DNS scan and alert.

## Tenant domain onboarding (happy path)
1) Tenant submits domain; insert row `status=pending_validation`.
2) Provide TXT challenge value; require TXT (or CNAME) present and unique per tenant.
3) Poll DNS; once verified, set `status=validated`.
4) Request cert (DNS-01) for the hostname; store `ssl_cert_id`; on success set `status=active`.
5) Add host mapping to edge routing table; start health checks; emit audit log.
6) If verification fails for 48h, auto-expire request and notify tenant.

## Routing safeguards
- Reject requests for hosts not in the mapping (return 421/404); log and alert on unknown Host/X-Forwarded-Host.
- Bind requests to the resolved tenant ID early in the request lifecycle; never accept tenant identifiers from path/query/body for auth.
- HSTS on (`max-age` 6–12 months; `includeSubDomains` only if you own them all); OCSP stapling on; TLS 1.2+ only.
- Enforce same-host redirects by default; explicit allowlist for cross-domain redirects.
- Rate limits/WAF: per-host and per-tenant, enforced at the edge before origin.

## Certificate automation
- Renew at ≤30 days remaining; alert if <15 days.
- DNS-01 flow: create `_acme-challenge.<host>` TXT via API with limited-scope token; delete after issuance.
- HTTP-01 (platform domains only): serve `.well-known/acme-challenge/*` from edge; never depend on tenant origins for challenges.

## Decommissioning
- Offboarding: remove host mapping, revoke cert, and send “remove DNS” instruction; mark domain `blocked` to prevent reuse without re-verify.
- Sweep monthly for: certs nearing expiry, hosts with traffic but missing DB mapping, dangling DNS to third parties.

## Monitoring & alerting
- Dashboards: host-level 4xx/5xx, latency, WAF/rate-limit hits, cert expiry, DNS health, unknown-host requests.
- Alerts: unknown-host spikes, cert <15 days, dangling DNS findings, DNS change outside Terraform, verification stuck in pending.

## Terraform/IaC shape (example)
- Separate state per zone; modules for `apex`, `www`, `tenant-cname`, `_acme-challenge` records.
- Require `terraform plan` in CI + reviewer approval; deny manual console edits (detect drift via `terraform plan`/Cloudflare audit logs).

## Operational runbooks
- **Add tenant domain:** create DB row → send TXT → verify → issue cert → enable routing → notify success.
- **Disable tenant domain quickly:** set `blocked_at` + remove mapping in edge config → revoke cert → notify tenant.
- **Dangling DNS scan:** weekly script enumerates all DNS records → resolves targets → flags NXDOMAIN/parking/unknown provider; create ticket with SLA to fix.
