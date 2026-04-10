# Developer Setup Guide

This guide explains how to set up the Upload Bucket development environment, run tests, and deploy the application.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Running the Application](#running-the-application)
  - [Local development with myapp.com (devcontainer)](#local-development-with-myappcom-recommended-for-devcontainer)
  - [Using PM2 only (without Caddy)](#using-pm2-only-without-caddy)
- [Running Tests](#running-tests)
- [Code Quality](#code-quality)
- [Database Migrations](#database-migrations)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v20+ | JavaScript runtime |
| pnpm | v8+ | Package manager |
| Git | Latest | Version control |

You'll also need accounts for:

| Service | Purpose |
|---------|---------|
| Cloudflare | Workers hosting, R2 storage |
| Neon | PostgreSQL database |
| Google Cloud | OAuth (optional) |

---

## Project Structure

```
shindig/
├── backend/                 # Hono API (Cloudflare Workers)
│   ├── src/
│   │   ├── db/             # Database schema and connection
│   │   ├── lib/            # Utilities (auth, R2, tier limits)
│   │   ├── middleware/     # Hono middleware
│   │   └── routes/         # API route handlers
│   ├── scripts/            # Admin CLI scripts
│   ├── tests/              # Integration tests
│   ├── drizzle/            # Database migrations
│   └── wrangler.jsonc      # Cloudflare Workers config
├── frontend/               # Nuxt 4 SPA
│   ├── app/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Vue composables (state management)
│   │   └── pages/          # Route pages
│   └── test/               # Frontend tests
├── docs/                   # Documentation
└── packages/               # Shared packages
```

---

## Environment Variables

### Backend Environment

- Environment variables in `backend/.env` are populated with 1pass secret references
- Environment variables in `backend/.env` are used for development-time only
- When running locally, `pnpm run dev` runs `wrangler dev`, which reads environment variable data from `backend/.dev.vars`
- Use environment variables in `backend/.env.production` for production-time secrets values (these get populated to Cloudflare with deploy scripts)

Create `backend/.dev.vars` for local development or `backend/.env` as an alternative.

Normally, we create the `backend/.env` file that is used for development-time, and we then run `pnpm run sync-env` coipes over the `.env` data that has 1pass secret references in it but gets injected to `backend/.dev.vars` that wrangler reads (happens when running `pnpm run dev`).

Following is the stock data expected in `backend/.env` file:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# Better Auth Configuration
BETTER_AUTH_URL=https://myapp.com
BETTER_AUTH_SECRET=your-32-character-secret-key-here

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Getting Credentials

**Neon Database:**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard

**Cloudflare R2:**
1. Log in to Cloudflare Dashboard
2. Go to R2 > Manage R2 API Tokens
3. Create a new API token with read/write access
4. Note your Account ID from the URL or dashboard

**Better Auth Secret:**
Generate a secure random string:
```bash
openssl rand -hex 16
```

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `https://myapp.com/api/auth/callback/google`
   - `http://localhost:8787/api/auth/callback/google` (development)

#### Feature Flags (Optional)

```bash
# Disable email+password authentication (Google OAuth only)
# EMAIL_PASSWORD_AUTH_ENABLED=false
```

See [Deployment Guide - Feature Flags](deployment.md#feature-flags) for details on configuring authentication methods.

### Frontend Environment

Create `frontend/.env`:

```bash
# API Base URL
NUXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

For production, use your deployed API URL:
```bash
NUXT_PUBLIC_API_BASE_URL=https://api.myapp.com
```

---

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd shindig
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy example files (if they exist) or create from scratch
cp backend/.dev.vars.example backend/.dev.vars
cp frontend/.env.example frontend/.env

# Edit with your credentials
```

### 3. Set Up R2 Bucket

Run the R2 setup script to create the storage bucket:

```bash
cd backend
pnpm run setup-r2
```

### 4. Sync Environment (Optional)

If you use 1Password for secrets management:

```bash
cd backend
pnpm run sync-env
```

### 5. Apply Database Migrations

Generate and apply migrations:

```bash
cd backend

# Generate migration files from schema
pnpm exec drizzle-kit generate

# Apply migrations to database
pnpm exec drizzle-kit push
```

### 6. Generate TypeScript Types

Generate Cloudflare Worker types:

```bash
cd backend
pnpm run cf-typegen
```

---

## Running the Application

### Local development with myapp.com (recommended for devcontainer)

To work on the project locally with the app served at **https://myapp.com** (e.g. from a devcontainer), you need two steps:

1. **On your host (outside the devcontainer)** — run the Caddy reverse proxy so that requests to `myapp.com` are routed to your local frontend and backend:
   - Ensure `myapp.com` resolves to your machine (e.g. add `127.0.0.1 myapp.com` to `/etc/hosts` on the host).
   - From your host, go to the local `infra/http-server/` directory and run the start script:
   ```bash
   cd path/to/shindig/infra/http-server
   ./start-caddy.sh
   ```
   Caddy will serve `myapp.com` with local TLS and proxy:
   - `/api/*` → backend at `localhost:8787`
   - all other requests → frontend at `localhost:3005`

2. **Inside the devcontainer** — from the monorepo root, start both backend and frontend:
   ```bash
   pnpm run dev
   ```
   This uses PM2 to run the backend (Wrangler) and frontend (Nuxt) dev servers. Use **https://myapp.com** in your browser; Caddy on the host will route traffic to the correct local ports.

**Requirements:** Caddy must be installed on the host where you run `start-caddy.sh`. See [Caddy install](https://caddyserver.com/docs/install).

### Using PM2 only (without Caddy)

The project includes a PM2 configuration for running both frontend and backend:

```bash
# From project root
pnpm exec pm2 start ecosystem.config.js

# View logs
pnpm run logs:backend
pnpm run logs:frontend

# Restart services
pnpm exec pm2 restart backend
pnpm exec pm2 restart frontend

# Stop all services
pnpm exec pm2 stop all
```

You can then open the frontend at `http://localhost:3005` and the API at `http://localhost:8787`. For auth and cookie behavior that matches production, use the [Caddy setup](#local-development-with-myappcom-recommended-for-devcontainer) above so the app is served at `https://myapp.com`.

### Running Individually

**Backend:**
```bash
cd backend
pnpm run dev
```
The API will be available at `http://localhost:8787`

**Frontend:**
```bash
cd frontend
pnpm run dev
```
The frontend will be available at `http://localhost:3005`

### Checking Service Status

```bash
# Check if backend is running
pnpm exec pm2 info backend

# Check all services
pnpm exec pm2 status
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests once
pnpm run test

# Run tests in watch mode
pnpm run test:watch
```

The backend uses Vitest with an in-memory PGlite database for integration tests.

### Frontend Tests

```bash
cd frontend

# Run all tests once
pnpm run test

# Run tests in watch mode
pnpm run test:watch
```

---

## Code Quality

### Linting

Run ESLint to check and fix code style:

```bash
# Backend
cd backend
pnpm run lint        # Check only
pnpm run lint:fix    # Check and auto-fix

# Frontend
cd frontend
pnpm run lint        # Check only
pnpm run lint:fix    # Check and auto-fix
```

### Type Checking

Run TypeScript compiler to check types:

```bash
# Backend
cd backend
pnpm run typecheck

# Frontend
cd frontend
pnpm run typecheck
```

### Full Quality Check

Run all checks before committing:

```bash
# Backend
cd backend && pnpm run lint:fix && pnpm run typecheck && pnpm run test

# Frontend
cd frontend && pnpm run lint:fix && pnpm run typecheck && pnpm run test
```

---

## Database Migrations

### After Schema Changes

When you modify `backend/src/db/schema.ts`:

```bash
cd backend

# 1. Generate new migration file
pnpm exec drizzle-kit generate

# 2. Review the generated SQL in backend/drizzle/

# 3. Apply migration to database
pnpm exec drizzle-kit push

# 4. Restart backend if running
pnpm exec pm2 restart backend
```

### Viewing Database

Use Drizzle Studio to browse your database:

```bash
cd backend
pnpm exec drizzle-kit studio
```

### Migration Files

Migrations are stored in `backend/drizzle/`:
- `XXXX_*.sql` - Migration SQL files
- `meta/` - Migration metadata and snapshots

---

## Deployment

### Backend Deployment (Cloudflare Workers)

```bash
cd backend

# Deploy to production
pnpm run deploy
```

This runs `wrangler deploy --minify` which:
1. Bundles the application
2. Uploads to Cloudflare Workers
3. Makes it available at your configured domain

### Frontend Deployment

Build the frontend for production:

```bash
cd frontend
pnpm run build
```

Deploy the `.output/` directory to your hosting provider (Cloudflare Pages, Vercel, Netlify, etc.).

### Environment Variables in Production

Set production environment variables in the Cloudflare Dashboard:
1. Go to Workers & Pages > Your Worker
2. Settings > Variables
3. Add each environment variable

Or use Wrangler:
```bash
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
# ... etc
```

### CORS Configuration

Update CORS settings for production:

```bash
cd backend
pnpm run update-cors-set-origins
```

This sets allowed origins to `https://myapp.com` and `https://www.myapp.com`.

---

## Troubleshooting

### Common Issues

**Database connection fails:**
- Verify `DATABASE_URL` is correct
- Ensure Neon project is active (free tier projects pause after inactivity)
- Check that SSL mode is included: `?sslmode=require`

**R2 uploads fail:**
- Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are correct
- Check that the R2 bucket exists: `pnpm run setup-r2`
- Ensure CORS is configured on the bucket

**Authentication not working:**
- Verify `BETTER_AUTH_URL` matches your domain
- Check that `BETTER_AUTH_SECRET` is set
- For Google OAuth, verify redirect URIs are configured

**Types not found:**
- Regenerate types: `pnpm run cf-typegen`
- Run `pnpm install` to ensure dependencies are installed

### Viewing Logs

```bash
# Backend logs (from project root)
pnpm run logs:backend

# Frontend logs (from project root)
pnpm run logs:frontend

# Or directly with PM2
pnpm exec pm2 logs backend
pnpm exec pm2 logs frontend
```

### Resetting Development Environment

```bash
# Stop all services
pnpm exec pm2 stop all

# Clear PM2 processes
pnpm exec pm2 delete all

# Reinstall dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
pnpm install

# Restart
pnpm exec pm2 start ecosystem.config.js
```

---

## Additional Resources

- [Hono Documentation](https://hono.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Better Auth Documentation](https://better-auth.com)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
- [Nuxt Documentation](https://nuxt.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2)
