# Backend Testing Strategy Guide

This guide documents the testing strategy, patterns, and best practices for the backend project. It serves as a reference for writing maintainable, reliable integration tests.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Test Setup](#test-setup)
5. [Test Data Factories](#test-data-factories)
6. [Response Schema Validation](#response-schema-validation)
7. [Writing Tests](#writing-tests)
8. [Assertion Best Practices](#assertion-best-practices)
9. [Authentication in Tests](#authentication-in-tests)
10. [Database in Tests](#database-in-tests)
11. [Best Practices](#best-practices)
12. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
13. [Running Tests](#running-tests)

---

## Overview

Our testing strategy follows an **integration testing** approach where we:

- Test the Hono HTTP API layer end-to-end
- Use a real PostgreSQL-compatible database (PGLite in-memory)
- Mock authentication without polluting production code
- Apply the same database migrations as production
- Validate API responses against Zod schemas for contract testing

### Why Integration Tests?

Integration tests provide high confidence that the API behaves correctly from a client's perspective. They test:

- HTTP request/response handling
- Route handlers and middleware
- Database operations via Drizzle ORM
- Authentication flows
- Error handling and validation

Unlike unit tests, integration tests catch issues at the boundaries between components—where bugs often hide.

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Test Framework | [Vitest](https://vitest.dev/) | Fast, TypeScript-first test runner compatible with Vite |
| HTTP Framework | [Hono](https://hono.dev/) | Lightweight web framework with built-in test utilities |
| Database (Test) | [PGLite](https://pglite.dev/) | In-memory PostgreSQL for isolated, fast tests |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) | Type-safe database operations and migrations |
| Database (Prod) | [Neon](https://neon.tech/) | Serverless PostgreSQL for production |
| Schema Validation | [Zod](https://zod.dev/) | Runtime schema validation for contract testing |

### Why This Stack?

- **Vitest**: Native ESM support, fast watch mode, compatible with our TypeScript codebase
- **PGLite**: Real PostgreSQL semantics without Docker or external services. Runs in-process for speed and isolation.
- **Drizzle Migrations**: Same migration files used in production ensure test database schema matches production exactly
- **Zod**: Validates API responses match expected shapes, catching breaking changes early

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Test File                             │
│  (e.g., notifications.test.ts)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Test Setup                               │
│  - createTestApp()     Creates Hono app with PGLite DB      │
│  - createMockSession() Creates fake authenticated session    │
│  - createTestUser()    Factory for user records              │
│  - createTestEvent()   Factory for event records             │
│  - applySchema()       Runs Drizzle migrations               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Test App Instance                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Middleware Stack:                                        ││
│  │  1. Database Injection (PGLite → c.set('db', db))       ││
│  │  2. Database Middleware (skips - already set)           ││
│  │  3. Mock Auth Middleware (→ c.set('session', session))  ││
│  │  4. Route Handlers                                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Route Handler                            │
│  - getSession() checks c.get('session') first               │
│  - Falls back to real auth if no session in context         │
│  - Reads/writes to database via c.get('db')                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Context-Based Dependency Injection**: Database and session are injected via Hono's context (`c.set()`/`c.get()`) rather than module-level singletons. This enables test isolation.

2. **Production Code Unaware of Tests**: Routes use generic context keys (`'session'`, `'db'`) and don't import test-specific types.

3. **Same Migrations, Different Database**: Tests run the same Drizzle migrations as production but against PGLite instead of Neon.

4. **Test Data Factories**: Centralized factory functions eliminate boilerplate and ensure consistent test data creation.

5. **Schema Validation**: Zod schemas validate API response shapes, enabling contract testing.

---

## Test Setup

### File Structure

```
backend/
├── src/                     # Source code only (no tests)
│   ├── routes/
│   │   ├── events.ts
│   │   ├── notifications.ts
│   │   ├── profile.ts
│   │   └── uploads.ts
│   ├── lib/
│   │   └── auth-helpers.ts
│   └── db/
│       └── schema.ts
├── tests/                   # All test files
│   ├── harness/            # Test utilities and setup
│   │   ├── setup.ts        # Test app factory, re-exports utilities
│   │   ├── mock-auth.ts    # Mock authentication middleware
│   │   ├── factories.ts    # Test data factory functions
│   │   └── schemas.ts      # Zod schemas for response validation
│   └── integration/        # Integration tests (mirrors src/ structure)
│       └── routes/
│           ├── events.test.ts
│           └── notifications.test.ts
├── drizzle/                  # Migration SQL files
│   ├── 0000_*.sql
│   └── 0001_*.sql
└── vitest.config.ts
```

**Why this structure?**
- **Clean separation**: Source code in `src/`, tests in `tests/`
- **Scalable**: Easy to add `tests/unit/` and `tests/e2e/` later
- **Production builds**: Easy to exclude `tests/` from bundling
- **Mirrors src/**: `tests/integration/routes/` mirrors `src/routes/` for discoverability
- **Centralized utilities**: All test helpers in `harness/` with single-import pattern

### Test Utilities

#### `createTestApp(mockSession)` - Test App Factory

Creates an isolated test app with:
- Fresh PGLite database instance
- Applied schema via Drizzle migrations
- Optional mock authentication
- All routes mounted

```typescript
import { createTestApp, createMockSession } from '../../harness/setup'

// Authenticated request
const mockSession = createMockSession()
const { app, db } = await createTestApp(mockSession)

// Unauthenticated request
const { app } = await createTestApp(null)
```

**Why a factory function?** Each test gets an isolated database and app instance, preventing test interference.

#### `createMockSession(userId?)` - Mock Session Generator

Creates a valid session object matching the better-auth structure:

```typescript
const session = createMockSession()
// Returns:
// {
//   user: { id, email, name, emailVerified, image, createdAt, updatedAt },
//   session: { id, expiresAt, token, userId }
// }

// With specific user ID:
const session = createMockSession('user-123')
```

#### `applySchema(db)` - Schema Migration

Applies all Drizzle migrations from the `drizzle/` folder:

```typescript
// Internally uses:
import { migrate } from 'drizzle-orm/pglite/migrator'
await migrate(db, { migrationsFolder: './drizzle' })
```

**Why use Drizzle's migrate function?** It reads the same migration files used in production, ensuring schema parity. Hardcoding SQL in tests would drift from production over time.

---

## Test Data Factories

Factory functions centralize test data creation, reducing boilerplate and ensuring consistency. All factories are in `tests/harness/factories.ts` and re-exported from `setup.ts`.

### Available Factories

#### `createTestUser(db, mockSession)` - Create User Record

Creates a user in the database from a mock session:

```typescript
import { createTestApp, createMockSession, createTestUser } from '../../harness/setup'

const mockSession = createMockSession()
const { app, db } = await createTestApp(mockSession)

// Create user record (required for foreign key constraints)
await createTestUser(db, mockSession)
```

#### `createTestEvent(db, ownerId, overrides?)` - Create Event Record

Creates an event with sensible defaults. Returns the created event record:

```typescript
import { createTestApp, createMockSession, createTestUser, createTestEvent } from '../../harness/setup'

const mockSession = createMockSession()
const { app, db } = await createTestApp(mockSession)
await createTestUser(db, mockSession)

// Create event with default values
const event = await createTestEvent(db, mockSession.user.id)

// Create event with overrides
const customEvent = await createTestEvent(db, mockSession.user.id, {
  name: 'Custom Event Name',
  deletedAt: new Date(), // Soft-deleted event
})
```

#### `createTestNotifications(db, userId, overrides?)` - Create Notification Preferences

Creates notification preferences for a user:

```typescript
import { createTestApp, createMockSession, createTestUser, createTestNotifications } from '../../harness/setup'

const mockSession = createMockSession()
const { app, db } = await createTestApp(mockSession)
await createTestUser(db, mockSession)

// Create with defaults
await createTestNotifications(db, mockSession.user.id)

// Create with custom values
await createTestNotifications(db, mockSession.user.id, {
  email: false,
  desktop: true,
})
```

### Why Use Factories?

```typescript
// ❌ Bad: Repeated inline data creation
await db.insert(user).values({
  id: mockSession.user.id,
  name: mockSession.user.name,
  email: mockSession.user.email,
  emailVerified: mockSession.user.emailVerified,
  image: mockSession.user.image,
  createdAt: mockSession.user.createdAt,
  updatedAt: mockSession.user.updatedAt,
})

// ✅ Good: Factory function
await createTestUser(db, mockSession)
```

Benefits:
- **DRY**: Single source of truth for test data creation
- **Maintainable**: Schema changes only need updates in one place
- **Readable**: Tests focus on behavior, not setup boilerplate
- **Type-safe**: Factory return types match schema types

---

## Response Schema Validation

Zod schemas in `tests/harness/schemas.ts` validate API response shapes. This enables **contract testing** — ensuring responses match expected structures.

### Available Schemas

| Schema | Validates |
|--------|-----------|
| `EventResponseSchema` | Single event in list/detail responses |
| `EventsListResponseSchema` | GET /api/events response |
| `EventCreateResponseSchema` | POST /api/events response |
| `EventDeleteResponseSchema` | DELETE /api/events/:id response |
| `NotificationPreferencesSchema` | Notification preferences object |
| `NotificationUpdateResponseSchema` | POST /api/user/notifications response |
| `ValidationErrorResponseSchema` | 400 validation error responses |
| `ErrorResponseSchema` | General error responses |

### Using Schema Validation in Tests

```typescript
import { 
  createTestApp, 
  createMockSession, 
  createTestUser,
  EventsListResponseSchema,
  EventCreateResponseSchema,
} from '../../harness/setup'

it('should return response matching EventsListResponseSchema', async () => {
  const mockSession = createMockSession()
  const { app, db } = await createTestApp(mockSession)
  await createTestUser(db, mockSession)

  const res = await app.request('/api/events', { method: 'GET' })
  const body = await res.json()

  // Validate response shape matches schema
  expect(() => EventsListResponseSchema.parse(body)).not.toThrow()
})

it('should return validation error matching ValidationErrorResponseSchema', async () => {
  const mockSession = createMockSession()
  const { app, db } = await createTestApp(mockSession)
  await createTestUser(db, mockSession)

  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // Missing required name
  })

  const body = await res.json()
  expect(() => ValidationErrorResponseSchema.parse(body)).not.toThrow()
})
```

### Why Schema Validation?

- **Contract Testing**: Catches breaking API changes before deployment
- **Documentation**: Schemas serve as executable API documentation
- **Type Safety**: Derive TypeScript types from schemas
- **Regression Prevention**: New code can't accidentally change response shapes

---

## Writing Tests

### Test Structure

Tests follow the Arrange-Act-Assert pattern:

```typescript
import { describe, it, expect } from 'vitest'
import { 
  createTestApp, 
  createMockSession, 
  createTestUser,
  EventsListResponseSchema,
} from '../../harness/setup'

describe('Feature Name', () => {
  describe('GET /api/endpoint', () => {
    it('should return expected result when conditions are met', async () => {
      // Arrange: Set up test data and app
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      // Act: Make the HTTP request
      const res = await app.request('/api/endpoint', {
        method: 'GET',
      })

      // Assert: Verify the response
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ expected: 'data' })
    })
  })
})
```

### Hono Test Helper

Use Hono's built-in `app.request()` method for making test requests:

```typescript
// GET request
const res = await app.request('/api/user/notifications')

// POST request with JSON body
const res = await app.request('/api/user/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: true, desktop: false }),
})

// Reading response
const status = res.status
const body = await res.json()
const text = await res.text()
```

### What Good Tests Look Like

A good integration test:

1. **Tests one behavior** - Each test verifies a single API behavior
2. **Is self-contained** - Sets up its own data, doesn't depend on other tests
3. **Uses realistic data** - Mimics actual API usage patterns
4. **Asserts outcomes, not implementation** - Checks HTTP status and response body, not internal state
5. **Has a descriptive name** - Explains what is being tested and expected result

```typescript
// ✅ Good: Descriptive, tests one behavior
it('should return 401 when not authenticated', async () => {
  const { app } = await createTestApp(null)
  const res = await app.request('/api/user/notifications')
  expect(res.status).toBe(401)
})

// ❌ Bad: Vague name, tests multiple things
it('test notifications', async () => { ... })
```

---

## Assertion Best Practices

Strong assertions catch bugs; weak assertions let them slip through. Follow these guidelines for effective assertions.

### Be Specific About Error Responses

```typescript
// ❌ Bad: Only checks error exists
expect(res.status).toBe(400)
const body = await res.json()
expect(body.error).toBeDefined()

// ✅ Good: Checks exact error content
expect(res.status).toBe(400)
const body = await res.json()
expect(body.error).toEqual({
  code: 'VALIDATION_ERROR',
  message: 'Event name is required',
})
```

### Test Boundary Conditions

Always test at the boundaries of validation rules:

```typescript
// Test 100-character limit
it('should accept name with exactly 100 characters', async () => {
  const maxName = 'a'.repeat(100)
  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: maxName }),
  })
  expect(res.status).toBe(201)
})

it('should return 400 for name exceeding 100 characters', async () => {
  const longName = 'a'.repeat(101)
  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: longName }),
  })
  expect(res.status).toBe(400)
})
```

### Test Special Characters and Edge Cases

```typescript
it('should handle name with special characters', async () => {
  const specialName = "John & Jane's Wedding! (2026) - @venue #celebration"
  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: specialName }),
  })
  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.name).toBe(specialName)
})

it('should trim whitespace from name', async () => {
  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '  My Event Name  ' }),
  })
  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.name).toBe('My Event Name')
})
```

### Use Schema Validation for Contract Tests

```typescript
it('should return response matching EventCreateResponseSchema', async () => {
  // ... setup ...
  const res = await app.request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Event' }),
  })
  const body = await res.json()
  expect(() => EventCreateResponseSchema.parse(body)).not.toThrow()
})
```

### Test Authorization Boundaries

Ensure users cannot access other users' resources:

```typescript
it('should return 404 for event owned by another user', async () => {
  const mockSession = createMockSession()
  const otherSession = createMockSession()
  const { app, db } = await createTestApp(mockSession)

  await createTestUser(db, mockSession)
  await createTestUser(db, otherSession)
  const otherEvent = await createTestEvent(db, otherSession.user.id)

  const res = await app.request(`/api/events/${otherEvent.id}`, {
    method: 'GET',
  })

  expect(res.status).toBe(404)
  expect((await res.json()).error).toEqual({
    code: 'NOT_FOUND',
    message: 'Event not found',
  })
})
```

---

## Authentication in Tests

### The Mock Auth Approach

Tests bypass real authentication by injecting a mock session into Hono's context:

```typescript
// test/mock-auth.ts
export function mockAuthMiddleware(mockSession: MockSession | null) {
  return async (c: Context, next: Next) => {
    if (mockSession) {
      c.set('session', mockSession)  // Generic key, not 'mockSession'
    }
    await next()
  }
}
```

### How Production Code Handles It

The `getSession()` helper in `lib/auth-helpers.ts` checks context first:

```typescript
export async function getSession(c): Promise<Session | null> {
  // 1. Check context first (for tests or middleware-set sessions)
  const sessionFromContext = c.get('session')
  if (sessionFromContext && isSession(sessionFromContext)) {
    return sessionFromContext
  }
  
  // 2. Fall back to real auth
  if (!c.env) return null
  return await auth(c.env).api.getSession({ headers: c.req.raw.headers })
}
```

**Why this approach?**

- Production code uses a generic `'session'` key—no test-specific imports
- Same code path for test and production, just different session sources
- Routes call `getSession(c)` without knowing if it's a test or production

### Testing Different Auth Scenarios

```typescript
// Authenticated user
const mockSession = createMockSession()
const { app } = await createTestApp(mockSession)

// Unauthenticated (no session)
const { app } = await createTestApp(null)

// Specific user ID
const mockSession = createMockSession('user-specific-id')
const { app } = await createTestApp(mockSession)
```

---

## Database in Tests

### PGLite: In-Memory PostgreSQL

Each test gets a fresh PGLite instance:

```typescript
const { db, pglite } = await createPGLiteDatabase()
```

**Why PGLite?**

1. **No Docker required** - Runs in the same Node.js process
2. **Fast** - In-memory, no network latency
3. **Isolated** - Each test gets a clean database
4. **PostgreSQL-compatible** - Uses real Postgres SQL syntax and semantics
5. **Same migrations** - Uses Drizzle's migrate function with production migration files

### Database Type Compatibility

The codebase defines a union type to support both Neon (production) and PGLite (tests):

```typescript
// src/db/index.ts
export type Database = 
  | ReturnType<typeof drizzleNeon<typeof schema>> 
  | ReturnType<typeof drizzlePGLite<typeof schema>>
```

### Setting Up Test Data

Use factory functions to create required records:

```typescript
it('should return preferences for existing user', async () => {
  const mockSession = createMockSession()
  const { app, db } = await createTestApp(mockSession)

  // Create user record (required for foreign key constraints)
  await createTestUser(db, mockSession)

  // Create notification preferences with custom values
  await createTestNotifications(db, mockSession.user.id, {
    email: false,
    desktop: true,
    productUpdates: false,
    weeklyDigest: true,
    importantUpdates: false,
  })

  // Now test the endpoint
  const res = await app.request('/api/user/notifications')
  // ...
})
```

---

## Best Practices

### 1. Keep Production Code Test-Agnostic

Production code should never import test utilities or mock types:

```typescript
// ✅ Good: Production code uses generic types
const notifications = new Hono<{ 
  Bindings: Env
  Variables: { db?: Database; session?: unknown } 
}>()

// ❌ Bad: Production code imports test types
import type { MockSession } from '../test/mock-auth'
```

### 2. Use Context for Dependency Injection

Inject dependencies via Hono's context, not module globals:

```typescript
// ✅ Good: Get database from context
const db = c.get('db')

// ❌ Bad: Import global database instance
import { db } from '../db/connection'
```

### 3. One Test App Per Test

Create a fresh app instance for each test:

```typescript
// ✅ Good: Isolated test app
it('test one', async () => {
  const { app, db } = await createTestApp(mockSession)
  // ...
})

it('test two', async () => {
  const { app, db } = await createTestApp(mockSession)
  // ...
})

// ❌ Bad: Shared app across tests (state leakage)
let app: Hono
beforeAll(async () => {
  app = await createTestApp(mockSession)
})
```

### 4. Use Factory Functions for Test Data

```typescript
// ✅ Good: Use factory functions
await createTestUser(db, mockSession)
await createTestEvent(db, mockSession.user.id, { name: 'My Event' })

// ❌ Bad: Inline data creation
await db.insert(user).values({ ... })
```

### 5. Use Type Guards for Runtime Validation

Validate session structure at runtime, not just compile time:

```typescript
// ✅ Good: Type guard validates at runtime
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return 'user' in obj && 'session' in obj && typeof obj.user?.id === 'string'
}

// ❌ Bad: Type assertion without validation
const session = c.get('session') as Session
```

### 6. Test Both Success and Error Paths

Cover error cases, not just happy paths:

```typescript
describe('POST /api/user/notifications', () => {
  it('should update preferences successfully', async () => { ... })
  it('should return 401 when not authenticated', async () => { ... })
  it('should return 400 for invalid field types', async () => { ... })
  it('should return 500 when database unavailable', async () => { ... })
})
```

### 7. Use Schema Validation for Contract Tests

```typescript
// ✅ Good: Validate response matches schema
const body = await res.json()
expect(() => EventCreateResponseSchema.parse(body)).not.toThrow()
```

---

## Anti-Patterns to Avoid

### ❌ Hardcoding SQL in Test Setup

```typescript
// ❌ Bad: Hardcoded SQL drifts from production schema
const migrations = [`
  CREATE TABLE IF NOT EXISTS "user" ( ... )
`]
for (const sql of migrations) {
  await pglite.exec(sql)
}

// ✅ Good: Use Drizzle's migrate function with production files
import { migrate } from 'drizzle-orm/pglite/migrator'
await migrate(db, { migrationsFolder: './drizzle' })
```

**Why?** Hardcoded SQL becomes outdated when schema changes. Using the same migration files as production ensures tests always match.

### ❌ Test-Specific Keys in Production Code

```typescript
// ❌ Bad: Production code knows about tests
const mockSession = c.get('mockSession')  // Test-specific key

// ✅ Good: Generic key used by both test and production
const session = c.get('session')
```

**Why?** Production code shouldn't be aware of test infrastructure. Generic keys allow the same code to work with real auth or mock auth.

### ❌ Importing Test Types in Production

```typescript
// ❌ Bad: Production imports test code
import type { MockSession } from '../test/mock-auth'

// ✅ Good: Production defines its own types
type Session = { user: { id: string; ... }; session: { ... } }
```

**Why?** Creates coupling between production and test code. Changes to test infrastructure could break production.

### ❌ Sharing State Between Tests

```typescript
// ❌ Bad: Shared database leads to flaky tests
let db: Database
beforeAll(async () => {
  db = await createDatabase()
})

// ✅ Good: Each test gets isolated state
it('test', async () => {
  const { app, db } = await createTestApp(mockSession)
})
```

**Why?** Tests can interfere with each other. Isolated state makes tests deterministic and parallelizable.

### ❌ Testing Implementation Details

```typescript
// ❌ Bad: Tests internal state
expect(db.select().from(userNotifications)).toHaveLength(1)

// ✅ Good: Tests API behavior
const res = await app.request('/api/user/notifications')
expect(res.status).toBe(200)
expect(await res.json()).toEqual({ email: true, ... })
```

**Why?** Implementation details can change without changing behavior. Test the public API contract.

### ❌ Weak Error Assertions

```typescript
// ❌ Bad: Only checks error exists
expect(body.error).toBeDefined()

// ✅ Good: Checks exact error content
expect(body.error).toEqual({
  code: 'VALIDATION_ERROR',
  message: 'Event name is required',
})
```

**Why?** Weak assertions don't catch regressions. If the error message changes unexpectedly, specific assertions will fail.

### ❌ Inline Test Data Creation

```typescript
// ❌ Bad: Repeated inline data creation
await db.insert(user).values({
  id: mockSession.user.id,
  name: mockSession.user.name,
  email: mockSession.user.email,
  // ... many more fields
})

// ✅ Good: Factory function
await createTestUser(db, mockSession)
```

**Why?** Inline creation is verbose and error-prone. Factories centralize data creation logic.

---

## Running Tests

### Commands

```bash
# Run all tests once
pnpm run test

# Run tests in watch mode (re-runs on file changes)
pnpm run test:watch
```

### Configuration

Tests are configured in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,           // Use global describe, it, expect
    environment: 'node',     // Node.js environment
    include: ['tests/**/*.test.ts'],  // Test file pattern
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Test File Naming

Place test files in `tests/integration/` mirroring the `src/` structure:

```
src/                          tests/
├── routes/                   ├── integration/
│   ├── events.ts             │   └── routes/
│   ├── notifications.ts      │       ├── events.test.ts
│   └── profile.ts            │       └── notifications.test.ts
└── lib/                      └── harness/
    └── auth-helpers.ts           ├── setup.ts
                                  ├── mock-auth.ts
                                  ├── factories.ts
                                  └── schemas.ts
```

This structure:
- Keeps source code clean (no test files in `src/`)
- Makes it easy to find tests (mirror structure)
- Scales well (can add `tests/unit/`, `tests/e2e/`)

---

## Future Roadmap

This guide will evolve to include:

- **Unit Tests**: Testing individual functions and utilities in isolation
- **End-to-End Tests**: Testing complete user flows with real authentication
- **Performance Tests**: Load testing API endpoints
- **Auth Testing**: Testing actual authentication flows with better-auth

---

## Quick Reference

### Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { 
  createTestApp, 
  createMockSession, 
  createTestUser,
  createTestEvent,
  EventResponseSchema,
  type EventResponse,
} from '../../harness/setup'

describe('Feature API', () => {
  describe('GET /api/feature', () => {
    it('should return 401 when not authenticated', async () => {
      const { app } = await createTestApp(null)
      const res = await app.request('/api/feature')
      expect(res.status).toBe(401)
    })

    it('should return data when authenticated', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      const res = await app.request('/api/feature')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('data')
    })

    it('should return response matching schema', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      const res = await app.request('/api/feature')
      const body = await res.json()
      expect(() => EventResponseSchema.parse(body)).not.toThrow()
    })
  })
})
```

### Key Imports

```typescript
// Test utilities (single import from setup.ts)
import { describe, it, expect } from 'vitest'
import { 
  createTestApp, 
  createMockSession, 
  createTestUser,
  createTestEvent,
  createTestNotifications,
  // Schemas for contract testing
  EventsListResponseSchema,
  EventCreateResponseSchema,
  EventDeleteResponseSchema,
  NotificationPreferencesSchema,
  ValidationErrorResponseSchema,
  // Types derived from schemas
  type EventsListResponse,
  type EventCreateResponse,
  type ErrorResponse,
} from '../../harness/setup'

// Database schema (from src/) - only when needed for direct DB operations
import { event } from '../../../src/db/schema'
import { eq } from 'drizzle-orm'
```
