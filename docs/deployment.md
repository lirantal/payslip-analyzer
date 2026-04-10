# Deployment Guide — Payslip Analyzer

This guide covers deploying the Payslip Analyzer stack: a **Nuxt 4** frontend on **Cloudflare Pages**, a **Hono** API on **Cloudflare Workers**, **Neon PostgreSQL** for persistence, and **Google Gemini** (server-side) for payslip image analysis.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Naming and URLs](#naming-and-urls)
- [Production CORS and trusted origins](#production-cors-and-trusted-origins)
- [Backend (Worker) deployment](#backend-worker-deployment)
- [Frontend (Pages) deployment](#frontend-pages-deployment)
- [API proxy and session cookies](#api-proxy-and-session-cookies)
- [Environment variables](#environment-variables)
- [Feature flags](#feature-flags)
- [Custom domains](#custom-domains)
- [Commands summary](#commands-summary)
- [Troubleshooting](#troubleshooting)
- [Post-deployment checklist](#post-deployment-checklist)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare                                    │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐│
│  │   Cloudflare Pages      │    │   Cloudflare Workers          ││
│  │   (Nuxt SPA, SSR off)   │───▶│   Hono API                    ││
│  │   + Nitro /api proxy    │    │   Better Auth, /api/payslip   ││
│  └─────────────────────────┘    └──────────────┬────────────────┘│
└────────────────────────────────────────────────┼────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
            ┌───────────────┐           ┌────────────────┐           ┌─────────────────┐
            │  Neon         │           │  Google Gemini │           │  (Optional)     │
            │  PostgreSQL   │           │  (vision API)  │           │  Google OAuth   │
            └───────────────┘           └────────────────┘           └─────────────────┘
```

**Data flow (typical):**

1. Browser loads the SPA from Pages.
2. Authenticated calls go to `/api/*` on the **same origin** (Pages); Nitro proxies them to the Worker (`BACKEND_URL`).
3. The Worker serves Better Auth under `/api/auth/*`, user profile under `/api/user/*`, and payslip analysis under `POST /api/payslip/analyze` (multipart image upload, analyzed via Gemini; result rows stored in Postgres).

There is **no R2 binding** in the current Worker config for this app path; large-file gallery uploads described in older templates are not part of the core payslip deployment.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Cloudflare account | Workers + Pages |
| Wrangler | `pnpm` devDependency in `backend/` and `frontend/` |
| Neon (or compatible Postgres) | `DATABASE_URL` with `sslmode=require` |
| Gemini API key | Required for analysis (`GEMINI_API_KEY`) |
| 1Password CLI (`op`) | Used by `backend/scripts/deploy.sh` and `frontend/scripts/deploy.sh` to resolve `op://` references in `.env.production` |

Verify Wrangler login:

```bash
cd backend && pnpm exec wrangler whoami
```

---

## Naming and URLs

| Piece | Source of truth | Default / example |
|-------|------------------|-------------------|
| Worker name | `backend/wrangler.jsonc` → `name` | `payslip-analyzer` |
| Worker URL | — | `https://payslip-analyzer.<account-subdomain>.workers.dev` |
| Pages project | `frontend/wrangler.toml` `name` and `frontend/scripts/deploy.sh` `--project-name` | Currently still `upload-bucket-webapp` in repo — **align these** with your real Pages project name when you create or rename the project in Cloudflare. |
| Pages URL | — | `https://<pages-project>.pages.dev` |

---

## Production CORS and trusted origins

`backend/src/index.ts` maintains an `allowedOrigins` list used by Hono’s CORS middleware. **For production, you must add your Pages URL (and any custom domains)** to that array. Until you do, browsers will block credentialed API calls from your deployed frontend.

Also ensure **Better Auth** `trustedOrigins` (in `backend/src/lib/better-auth`) includes the same frontend origins. Keep local dev entries (`localhost` / `127.0.0.1` on the ports you use) if you still need them.

After changing origins, redeploy the Worker.

---

## Backend (Worker) deployment

### 1. Configure `backend/.env.production`

The deploy script expects `op://` references resolved by 1Password (`op inject`). See `backend/scripts/deploy.sh` for the template echoed on error.

Required secrets (validated before upload):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` — must match the **public frontend origin** users see (e.g. `https://your-app.pages.dev`), not the raw Worker URL, so redirects and cookies align with your setup.
- `GEMINI_API_KEY`

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — only if you enable Google sign-in.
- `EMAIL_PASSWORD_AUTH_ENABLED` — set to `"false"` for OAuth-only (see [Feature flags](#feature-flags)).
- `DISABLE_NEKUDOT_REFINE` — `"true"` or `"1"` to skip the second Gemini pass for nekudot box refinement.

### 2. Deploy

```bash
cd backend
pnpm run deploy          # secrets (bulk) + wrangler deploy --minify
pnpm run deploy:secrets-only
pnpm run deploy:deploy-only
```

### 3. Smoke test

```bash
curl "https://payslip-analyzer.<account>.workers.dev/"
# Expect: Payslip Analyzer API
```

Apply DB migrations for production using the same `DATABASE_URL` (e.g. `pnpm run db:migrate` or your chosen Drizzle workflow with production credentials).

---

## Frontend (Pages) deployment

### 1. Build preset

`frontend/nuxt.config.ts` sets `nitro.preset` to `cloudflare_pages`. Output for Pages deploy is **`dist`** (see `frontend/wrangler.toml` `pages_build_output_dir`).

### 2. `frontend/.env.production`

Resolved via `op run` at build time. Typical values:

```bash
NUXT_PUBLIC_API_BASE_URL=""
BACKEND_URL="https://payslip-analyzer.<account>.workers.dev"
```

Empty `NUXT_PUBLIC_API_BASE_URL` forces the browser to use relative `/api/*` URLs so the **Pages proxy** owns the cookie domain.

### 3. Deploy

```bash
cd frontend
pnpm run deploy
```

### 4. Pages secret: `BACKEND_URL`

The server route `frontend/server/api/[...].ts` requires `BACKEND_URL` in the **Pages** environment (secret or var), not only in the build env file, so the proxy can reach the Worker at runtime:

```bash
cd frontend
echo "https://payslip-analyzer.<account>.workers.dev" | \
  pnpm exec wrangler pages secret put BACKEND_URL --project-name=<your-pages-project>
```

Use the same `--project-name` as in `frontend/scripts/deploy.sh`.

### 5. Verify

```bash
cd frontend
pnpm run test:deployment
# Optional: pnpm run test:deployment https://<preview>.pages.dev
```

---

## API proxy and session cookies

Session cookies must be set on the **frontend origin**. If the SPA called the Worker URL directly, cookies would attach to `*.workers.dev` and not be sent on `*.pages.dev` requests.

**Pattern:** Browser → `https://<pages>/api/...` → Nitro proxy → Worker.

| Environment | `NUXT_PUBLIC_API_BASE_URL` | Calls |
|-------------|----------------------------|--------|
| Local | `http://localhost:8787` (or dev proxy setup) | Often direct to Worker |
| Production | `""` | Relative `/api/*` via proxy |

---

## Environment variables

### Worker secrets (typical)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon Postgres |
| `BETTER_AUTH_SECRET` | Yes | Auth signing / encryption |
| `BETTER_AUTH_URL` | Yes | Public app URL for Better Auth |
| `GEMINI_API_KEY` | Yes | Payslip vision pipeline |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `EMAIL_PASSWORD_AUTH_ENABLED` | No | `"false"` to disable email/password |
| `DISABLE_NEKUDOT_REFINE` | No | Skip refinement pass |

### Frontend build / Pages

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_API_BASE_URL` | Empty in production for proxy |
| `BACKEND_URL` | Worker URL for proxy target (build + Pages secret) |
| `NUXT_PUBLIC_EMAIL_PASSWORD_AUTH_ENABLED` | Match backend flag for UI |

---

## Feature flags

Email/password vs OAuth-only should match on both sides.

**Worker:**

```bash
cd backend
echo "false" | pnpm exec wrangler secret put EMAIL_PASSWORD_AUTH_ENABLED
```

**Pages:**

```bash
cd frontend
echo "false" | pnpm exec wrangler pages secret put NUXT_PUBLIC_EMAIL_PASSWORD_AUTH_ENABLED --project-name=<pages-project>
```

Redeploy frontend after changing public env vars.

---

## Custom domains

1. Add the zone to Cloudflare and point DNS as instructed.
2. Attach the domain to the **Pages** project; optionally add `api.` on the **Worker** custom domain.
3. Add both origins to `allowedOrigins` in `backend/src/index.ts` and to Better Auth trusted origins.
4. Set `BETTER_AUTH_URL` to the canonical frontend HTTPS URL.
5. Update OAuth redirect URIs in Google Cloud Console if used.

---

## Commands summary

**Initial**

```bash
cd backend && pnpm run deploy
cd ../frontend && pnpm run deploy
# One-time Pages secret
echo "https://payslip-analyzer.<account>.workers.dev" | \
  pnpm exec wrangler pages secret put BACKEND_URL --project-name=<pages-project>
cd ../frontend && pnpm run test:deployment
```

**Ongoing**

```bash
cd backend && pnpm run deploy
cd ../frontend && pnpm run deploy
```

---

## Troubleshooting

### Worker 500 — inspect logs

```bash
cd backend
pnpm exec wrangler tail --format json
```

### `DATABASE_URL` / Neon URL errors

The Neon serverless driver can reject URLs with unsupported query params (e.g. `channel_binding=require`). Use a clean string:

`postgresql://user:password@host.neon.tech/dbname?sslmode=require`

### Proxy: `BACKEND_URL environment variable is not configured`

Set the **Pages** secret `BACKEND_URL` (not only local `.env.production`).

### Auth works locally but not in production

- Confirm `BETTER_AUTH_URL` matches the **frontend** URL.
- Confirm production origins are in CORS `allowedOrigins` and Better Auth `trustedOrigins`.
- Confirm `NUXT_PUBLIC_API_BASE_URL=""` for production builds and that Better Auth session checks hit the **Pages** host (via `/api/...` proxy), not the Worker URL directly from the browser.

### Gemini / analyze failures

- Ensure `GEMINI_API_KEY` is set on the Worker.
- Check Wrangler logs for pipeline errors; large images or unsupported types return 400 from `POST /api/payslip/analyze`.

### Secrets not picked up

After `wrangler secret put` or `secret bulk`, redeploy if behavior is stale:

```bash
cd backend && pnpm run deploy:deploy-only
```

---

## Post-deployment checklist

- [ ] Worker root responds with “Payslip Analyzer API”.
- [ ] Frontend loads on Pages URL.
- [ ] Session probe via **Pages** origin (see `frontend/scripts/test-deployment.sh`) returns expected HTTP status for a logged-out user.
- [ ] Sign-in / sign-up flows complete and session survives refresh.
- [ ] `POST /api/payslip/analyze` succeeds for an authenticated user with a valid image (PNG/JPEG/WebP).
- [ ] Production domains appear in Worker CORS and Better Auth trusted origins.

For HTTP API details, see [backend/docs/api.md](../backend/docs/api.md). For auth configuration depth, see [backend/docs/features/auth.md](../backend/docs/features/auth.md).
