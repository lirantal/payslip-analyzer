# Testing

This directory contains all tests for the frontend application.

> 📖 **Full Documentation**: See [`docs/testing.md`](../docs/testing.md) for the comprehensive testing guide, including architecture, patterns, mocking strategies, and best practices.

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Run only unit tests (fast, Node environment)
pnpm test --project unit

# Run only Nuxt runtime tests
pnpm test --project nuxt
```

## Directory Structure

```
test/
├── unit/                    # Unit tests (Node environment - fast)
│   ├── setup.ts            # Unit test setup
│   └── [feature]/          # Feature-specific tests
│
└── nuxt/                    # Nuxt runtime tests (full context)
    ├── setup.ts            # Nuxt test setup
    ├── composables/        # Composable tests
    ├── pages/              # Page component tests
    └── integration/        # End-to-end flow tests
```

## Which Directory?

| Code uses Nuxt APIs? | Directory |
|---------------------|-----------|
| No (pure logic)     | `test/unit/` |
| Yes (`useRuntimeConfig`, `useFetch`, etc.) | `test/nuxt/` |

## Writing Tests

See the [full testing documentation](../docs/testing.md) for:
- Mocking strategies
- Testing patterns (composables, pages, integration)
- Best practices and common mistakes
- Troubleshooting guide
