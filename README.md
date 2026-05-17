# Upload Bucket

A file collection platform that enables event organizers to create shareable upload links for attendees. Attendees upload files (photos, videos, documents) that only they and the organizer can see, ensuring privacy among participants.

## Features

- **Easy Setup**: Create an event, share a link, receive uploads
- **Privacy-First**: Attendees only see their own uploads
- **Multiple Access Modes**: Anonymous, authenticated, or password-protected links
- **Mobile-Optimized**: Fast, responsive upload experience
- **Organizer Dashboard**: View, download, and manage all uploaded files
- **Tier-Based Limits**: Freemium and Pro tiers with configurable quotas

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | [Hono](https://hono.dev) on Cloudflare Workers |
| Frontend | [Nuxt 4](https://nuxt.com) with Nuxt UI |
| Database | [Neon PostgreSQL](https://neon.tech) with Drizzle ORM |
| Storage | [Cloudflare R2](https://developers.cloudflare.com/r2) |
| Auth | [Better Auth](https://better-auth.com) |

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/user-guide.md) | How to use Upload Bucket as an organizer |
| [API Reference](backend/docs/api.md) | Worker HTTP API (auth, profile, payslip) |
| [Developer Setup](docs/development.md) | Local development and deployment guide |
| [Admin CLI](docs/admin-cli.md) | Command-line tools for administrators |
| [Product Spec](docs/spec.md) | Full product specification |

## Quick Start

### Prerequisites

- Node.js v20+
- pnpm v8+
- Cloudflare account
- Neon database

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd shindig

# Install dependencies
pnpm install

# Set up environment variables
cp backend/.dev.vars.example backend/.dev.vars
cp frontend/.env.example frontend/.env
# Edit both files with your credentials

# Apply database migrations
cd backend && pnpm exec drizzle-kit push

# Start development servers
pnpm exec pm2 start ecosystem.config.js
```

See [Developer Setup](docs/development.md) for detailed instructions.

## Project Structure

```
shindig/
├── backend/          # Hono API (Cloudflare Workers)
├── frontend/         # Nuxt 4 SPA
├── docs/             # Documentation
└── packages/         # Shared packages
```

## Development

### pnpm / `nuxt prepare` fails (`unstorage` / Invalid module `.pnpm/...`)

The published `unstorage` drivers use relative imports such as `./utils/index.mjs`. If those files under `node_modules` instead contain specifiers starting with `.pnpm/`, the install tree is corrupted or stale. From the repo root run:

```bash
pnpm run reinstall
```

That removes workspace `node_modules`, prunes the pnpm store, and reinstalls. If it still fails, delete `pnpm-lock.yaml` as well and run `pnpm install` again.

```bash
# Run tests
cd backend && pnpm run test
cd frontend && pnpm run test

# Lint and type check
cd backend && pnpm run lint:fix && pnpm run typecheck
cd frontend && pnpm run lint:fix && pnpm run typecheck
```

## Deployment

```bash
# Deploy backend to Cloudflare Workers
cd backend && pnpm run deploy

# Build frontend for production
cd frontend && pnpm run build
```

## License

Private - All rights reserved

## Contributing

Please consult [CONTRIBUTING](./CONTRIBUTING.md) for guidelines on contributing to this project.
