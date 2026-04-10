# Payslip Analyzer — Cloudflare Worker API

Hono + Better Auth + Neon Postgres + Gemini payslip analysis. The Worker exposes `/api/auth/*`, `/api/user/profile`, and `POST /api/payslip/analyze`.

## Local secrets: `.env` vs Wrangler

| Where | When to use |
|--------|-------------|
| **`.env`** | Your single source of truth on disk (copy from [`.env.example`](./.env.example)). Used by **Node scripts** (`reset-password`, `analyze-payslip-remote`) via `--env-file=.env`. |
| **`.dev.vars`** | What **`wrangler dev`** actually reads for the Worker. Wrangler does **not** load `.env` by default. |
| **`wrangler secret put …`** | **Production only** (secrets stored in Cloudflare for the deployed Worker). **Not required for local dev** if you use `.dev.vars`. |

**Recommended local flow**

1. Copy `.env.example` → `.env` and fill in real values (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GEMINI_API_KEY`, optional Google OAuth).
2. Sync into Wrangler’s file (pick one):
   - **`pnpm run sync-env`** — copies `.env` → `.dev.vars` (with `op inject` if you use 1Password `op://` references; otherwise plain copy).
   - Or **maintain `.dev.vars` by hand** with the same keys Wrangler needs.

You do **not** need `wrangler secret put GEMINI_API_KEY` for local development if `GEMINI_API_KEY` is present in `.dev.vars`.

**`BETTER_AUTH_URL` for local dev** must match the **origin the browser uses for auth API calls**:

- **Nuxt dev server proxies `/api/*` to Wrangler** (see repo root `pnpm dev` / PM2, `frontend/.env` with `NUXT_PUBLIC_API_BASE_URL` empty and `BACKEND_URL` pointing at Wrangler): the browser talks to **Nuxt** (e.g. `http://localhost:3005`). Set **`BETTER_AUTH_URL=http://localhost:3005`** (same host/port you open in the browser) so session cookies and OAuth redirects align with the proxied `/api/auth` URL.
- **SPA calls the Worker directly** (`NUXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787`): set **`BETTER_AUTH_URL=http://127.0.0.1:8787`** (or `http://localhost:8787` — stay consistent with the URL you configure in the frontend).

## Start the backend locally

From this directory (`backend/`):

```bash
pnpm install
pnpm run sync-env   # if you use .env → .dev.vars
pnpm run dev        # wrangler dev (binds 0.0.0.0; default port 8787)
```

Health check:

```bash
curl -s http://127.0.0.1:8787/
```

## Initialize the database (schema on Neon)

Migrations live under [`drizzle/`](./drizzle/). The `db:*` scripts run [`scripts/drizzle-with-op.sh`](./scripts/drizzle-with-op.sh):

- If the **1Password CLI** (`op`) is on your `PATH`, they run **`op inject -i .env`** into a temporary file, then **`node --env-file=…`** so `op://…` placeholders resolve to real secrets (same idea as `pnpm run sync-env` for `.dev.vars`).
- If `op` is not installed, they fall back to **`node --env-file=.env`** (your `.env` must contain literal values, not `op://` references).

So `db:migrate` failing with `url: ''` usually means either `DATABASE_URL` was not injected (missing `op` login / wrong reference) or `.env` has placeholders and you ran without `op`.

**Requirements:** `.env` in `cloudflare-app/backend`, Node **20+**, and for `op://` references you must be signed into 1Password CLI (`op signin`).

### Normal workflow (versioned migrations)

1. **First time / apply existing migrations** (this repo already includes `drizzle/0000_init.sql`):

   ```bash
   pnpm run db:migrate
   ```

   That runs `drizzle-kit migrate` and records applied migrations in your Neon database.

2. **After you edit** [`src/db/schema.ts`](./src/db/schema.ts):

   ```bash
   pnpm run db:generate   # writes a new SQL file under drizzle/
   pnpm run db:migrate    # apply it to Neon
   ```

You only need **`db:generate`** when the schema changes. For a fresh clone with an empty Neon DB, **`db:migrate`** alone is enough.

### Optional: `db:push` (schema sync without migration files)

```bash
pnpm run db:push
```

`drizzle-kit push` updates the remote database to match the schema directly (handy for quick experiments). The team workflow in this project is still **generate + migrate** so migration history stays in git.

### Other Node scripts and `op://`

`pnpm run reset-password` and `pnpm run analyze-payslip-remote` use **`tsx --env-file=.env`**, which does **not** expand 1Password references. If your `.env` only has `op://` values, run them under `op` instead, for example:

```bash
op run --env-file=.env -- pnpm exec tsx scripts/reset-password.ts you@example.com 'new-password'
op run --env-file=.env -- pnpm exec tsx scripts/analyze-payslip-remote.ts /path/to/slip.png
```

(Adjust paths if not run from `cloudflare-app/backend`.)

## Create a first user (sign up)

With `pnpm run dev` running and `BETTER_AUTH_URL` / `DATABASE_URL` / `BETTER_AUTH_SECRET` configured:

```bash
curl -s -X POST http://127.0.0.1:8787/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-secure-password","name":"Your Name"}'
```

Then sign-in (e.g. for cookies in a browser) uses `POST /api/auth/sign-in/email` with the same `email` and `password`.

## Test payslip analysis end-to-end

`POST /api/payslip/analyze` accepts **PNG, JPEG, or WebP** only. Do not upload PDF — rasterize on the client (or convert locally) first. The JSON response includes **`analysis`** (fields and `box_2d` coordinates), **`annotationSpecs`**, **`featureLogs`**, and **`meta`**; it does **not** include a rendered annotated image (MVP).

1. Add to `.env` (and sync to `.dev.vars` if needed):
   - `GEMINI_API_KEY`
   - `PAYSLIP_TEST_EMAIL` / `PAYSLIP_TEST_PASSWORD` (same user you signed up), or `TEST_EMAIL` / `TEST_PASSWORD`
   - `API_BASE_URL=http://127.0.0.1:8787` (optional; this is the default in the script)
   - `PAYSLIP_SCRIPT_ORIGIN=http://localhost:3000` (optional; **required** for Better Auth: Node `fetch` has no `Origin`, so the script sends this — use the same origin as your frontend, and keep it in the Worker CORS allowlist)

2. With the dev server running:

```bash
pnpm run analyze-payslip-remote -- /absolute/or/relative/path/to/payslip.png

# for example, with auth:
op run --env-file=.env -- pnpm run analyze-payslip-remote /workspaces/payslip-analyzer/payslip-known-bad1-image.png
```

The script signs in, uploads the image to `POST /api/payslip/analyze`, and prints the JSON response.

**Manual curl** (after obtaining a session cookie from sign-in):

```bash
# Sign in; capture Set-Cookie (simplified — you may need to join multiple cookies)
curl -s -i -X POST http://127.0.0.1:8787/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"you@example.com","password":"your-secure-password"}'

# Then:
curl -s -X POST http://127.0.0.1:8787/api/payslip/analyze \
  -H "Cookie: <paste-session-cookie>" \
  -F "file=@/path/to/payslip.png"
```

## Production secrets

For the deployed Worker, set secrets in Cloudflare (e.g. `wrangler secret put GEMINI_API_KEY`) or use [`scripts/deploy.sh`](./scripts/deploy.sh) with `.env.production`. See [`.env.example`](./.env.example) for the variable list.

## Other commands

| Command | Purpose |
|--------|---------|
| `pnpm run typecheck` | TypeScript |
| `pnpm run test` | Vitest (mocked Gemini / auth helpers) |
| `pnpm run lint:fix` | ESLint |
| `pnpm run cf-typegen` | Regenerate `worker-configuration.d.ts` after Wrangler config changes |
| `pnpm run create-test-user -- email@example.com 'Password123' 'Display Name'` | Insert **user** + **credential** row for local testing (uses `.env` `DATABASE_URL`; use `op run --env-file=.env -- pnpm exec tsx scripts/create-test-user.ts …` if you use `op://`) |
| `pnpm run reset-password -- email@example.com newpassword` | Admin password reset (DB + bcrypt, uses `.env`) |
| `pnpm run db:generate` | Generate a new SQL migration from `src/db/schema.ts` (needs `.env` with `DATABASE_URL` for config) |
| `pnpm run db:migrate` | Apply pending migrations in `drizzle/` to Neon |
| `pnpm run db:push` | Push schema to DB without new migration files (optional shortcut) |

## TypeScript + Hono typings

[Wrangler `types` command](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
pnpm run cf-typegen
```

Use the generated `Env` (or `CloudflareBindings` if you alias it) as the Hono bindings generic when needed.
