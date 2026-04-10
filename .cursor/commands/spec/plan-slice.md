---
description: Plan a Slice from the Product Specification Document
argument-hint: [plan]
model: opus
---

## Your Mission

Create a detailed implementation plan for the Slice specified by the user from @docs/spec.md.

**Important**: This is a PLANNING phase only. Do NOT implement any code. Your output is a plan document that will guide the implementation phase.

## Planning Process

### Step 1: Read and Understand

1. Read the Slice requirements from the spec document
2. Read the Memory Graph to understand current project state
3. Review relevant existing code patterns:
   - Database schema conventions in `backend/src/db/schema.ts`
   - API route patterns in `backend/src/routes/`
   - Test patterns in `backend/tests/integration/`
   - Frontend composables in `frontend/app/composables/`
   - Frontend components in `frontend/app/components/`
4. Review naming conventions in @frontend/.cursor/rules/nuxt_component_best_practices.mdc

### Step 2: Map the Architecture

Create a Mermaid diagram showing:
- User flows (who does what)
- Component relationships
- API endpoints
- Data flow

### Step 3: Break Down by Phase

Organize tasks into phases:
1. **Database** - Schema changes, migrations
2. **Backend API** - Routes, handlers, validation
3. **Backend Tests** - Factories, schemas, integration tests
4. **Frontend Composable** - State management, API calls
5. **Frontend Components** - UI components, pages
6. **Frontend Tests** - Composable tests

### Step 4: Define Contracts

For each API endpoint, define:
- Request format
- Response format (with JSON examples)
- Error responses

## Output Format

Create your plan using this structure:

~~~markdown
# Slice [N]: [Title]

[One-sentence summary of what this slice accomplishes]

## Architecture Overview

```mermaid
flowchart TD
    [Visual diagram of user flows, components, and API endpoints]
```

## Implementation Tasks

### Phase 1: Database Schema

**Task [N].1: [Description]**

Add to `backend/src/db/schema.ts`:

```typescript
// Exact code to add
```

Generate migration: `npx drizzle-kit generate`
⚠️ **DO NOT apply migration yet** - wait until all code is implemented and typechecks pass.
Apply migration (final step): `npx drizzle-kit push`

### Phase 2: Backend API

**Task [N].2: [Description]**

Create `backend/src/routes/[name].ts` with:
- `POST /api/...` - [Description]
- `GET /api/...` - [Description]

Follow patterns from `backend/src/routes/events.ts`:
- Use `getSession()` for auth
- Generate prefixed IDs (`xxx_...`)
- Validate ownership before operations

**API Response Contracts:**

```typescript
// POST /api/... response
{
  id: "xxx_123",
  // ... exact fields
}
```

### Phase 3: Backend Tests

**Task [N].3: Add test infrastructure**

Update `backend/tests/harness/factories.ts`:
- Add `createTest[Entity]()` factory

Update `backend/tests/harness/schemas.ts`:
- `[Entity]ResponseSchema`
- `[Entity]ListResponseSchema`

**Task [N].4: Create integration tests**

Create `backend/tests/integration/routes/[name].test.ts` covering:
- Authentication requirements
- CRUD operations
- Ownership validation
- Error cases

### Phase 4: Frontend Composable

**Task [N].5: Create composable**

Create `frontend/app/composables/use[Entity].ts`:

```typescript
export type [Entity] = {
  // Exact type definition
}

export const use[Entity] = () => {
  // State and methods to implement
}
```

Follow pattern from `frontend/app/composables/useEvents.ts`

### Phase 5: Frontend Components

**Task [N].6: [Component description]**

Create `frontend/app/components/[folder]/[Name].vue`

⚠️ **Component Naming**: Use simple filenames in subfolders:
- `components/links/Tab.vue` → `<LinksTab>` ✅
- `components/links/LinksTab.vue` → `<LinksLinksTab>` ❌

### Phase 6: Frontend Tests

**Task [N].7: Create composable tests**

Create `frontend/test/nuxt/composables/use[Entity].test.ts`

## File Changes Summary

| Layer | File | Action |
|-------|------|--------|
| Database | `backend/src/db/schema.ts` | Modify |
| Database | `backend/drizzle/XXXX_*.sql` | New (generated) |
| API | `backend/src/routes/[name].ts` | New |
| API | `backend/src/index.ts` | Modify - mount routes |
| Tests | `backend/tests/harness/factories.ts` | Modify |
| Tests | `backend/tests/harness/schemas.ts` | Modify |
| Tests | `backend/tests/integration/routes/[name].test.ts` | New |
| Frontend | `frontend/app/composables/use[Entity].ts` | New |
| Frontend | `frontend/app/pages/[path].vue` | New |
| Frontend | `frontend/app/components/[folder]/*.vue` | New |
| Frontend | `frontend/test/nuxt/composables/*.test.ts` | New |

## Demo Checkpoint

After implementation, verify:
1. [Step-by-step manual verification]
2. [Each user flow works]
3. [Error states handled]

## Quality Checks

```bash
# Backend
cd backend && pnpm run lint:fix && pnpm run typecheck && pnpm run test

# Frontend  
cd frontend && pnpm run lint:fix && pnpm run typecheck && pnpm run test

# Apply migrations (if not done)
cd backend && npx drizzle-kit push

# Browser test
# Navigate to the application via the browser and verify the feature
```
~~~

## Guidelines

- **Be concrete**: Include actual code snippets, not abstract descriptions
- **Reference existing code**: Link to files that have patterns to follow
- **Define contracts**: JSON examples for all API responses
- **Call out conventions**: Especially component naming in subfolders
- **Include verification**: Demo checkpoint + quality check commands
- **Table of files**: Summary of all files to create/modify
- **Migration timing**: Plan specifies when to generate migrations, but application should be deferred until implementation is verified
- **Design for modularity**: If a planned file would contain many unrelated responsibilities, split it into focused modules during planning - not as an afterthought during implementation
- **Match codebase patterns**: Check how similar features are organized - don't introduce new architectural patterns unnecessarily
- **Plan testable units**: Each module should be independently testable; if it's hard to describe how to test something, it might need to be broken down further

## After Planning

Once the plan is reviewed and approved, use `/spec/impl-slice` to execute the implementation.