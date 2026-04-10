# Frontend Testing Documentation

This document outlines the testing strategy, architecture, best practices, and conventions for writing tests in the frontend application. It serves as the definitive guide for all testing efforts and should be followed when adding new tests.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Directory Structure](#directory-structure)
4. [Environment Setup](#environment-setup)
5. [Running Tests](#running-tests)
6. [Writing Tests](#writing-tests)
   - [Composable Tests](#composable-tests)
   - [Page Tests](#page-tests)
   - [Integration Tests](#integration-tests)
7. [Mocking Strategies](#mocking-strategies)
8. [Testing Patterns](#testing-patterns)
9. [Best Practices](#best-practices)
10. [Code Coverage](#code-coverage)
11. [Troubleshooting](#troubleshooting)
12. [References](#references)

---

## Testing Philosophy

Our testing approach follows Nuxt's official testing best practices with a clear multi-layered strategy:

### Core Principles

1. **Test Behavior, Not Implementation**: Focus on what users see and experience, not internal details
2. **Isolation**: Each test is independent and can run in any order with no shared state
3. **Composable-First Architecture**: Business logic lives in composables; components delegate to them
4. **Fast Feedback Loop**: Unit tests run in Node for speed; Nuxt runtime tests provide integration confidence
5. **Clarity**: Test names read like documentation; use Arrange-Act-Assert pattern

### Testing Pyramid

```
        ┌─────────────┐
        │  E2E Tests  │  ← Future: Playwright (full user journeys)
        ├─────────────┤
        │ Integration │  ← Complete data flow across components
        ├─────────────┤
        │   Nuxt RT   │  ← Pages/components requiring Nuxt runtime
        ├─────────────┤
        │    Unit     │  ← Composables, utilities (fastest, most numerous)
        └─────────────┘
```

---

## Architecture Overview

### Two Test Environments

We use **Vitest** with separate test projects for optimal performance:

| Environment | Directory | Use Case | Speed |
|------------|-----------|----------|-------|
| **Node** | `test/unit/` | Pure logic, utilities, composables without Nuxt runtime | ⚡ Fast |
| **Nuxt Runtime** | `test/nuxt/` | Pages, components, composables using Nuxt APIs | 🔄 Full context |

### When to Use Each Environment

```
Does the code use Nuxt composables/APIs (useRuntimeConfig, useFetch, etc.)?
├─ NO  → test/unit/  (Node environment)
└─ YES → test/nuxt/  (Nuxt runtime environment)
```

### Test Type Breakdown

| Type | Location | Description |
|------|----------|-------------|
| **Unit Tests** | `test/unit/` | Test composables and utilities in isolation |
| **Composable Tests** | `test/nuxt/composables/` | Test composables that require Nuxt runtime |
| **Page Tests** | `test/nuxt/pages/` | Test page components and their composable integration |
| **Integration Tests** | `test/nuxt/integration/` | Test complete user flows across features |

---

## Directory Structure

```
frontend/
├── test/
│   ├── README.md                           # Quick reference (existing)
│   ├── unit/                               # Unit tests (Node environment)
│   │   ├── setup.ts                        # Unit test setup and global mocks
│   │   └── [feature]/                      # Feature-specific tests
│   │       └── *.test.ts
│   │
│   └── nuxt/                               # Nuxt runtime tests
│       ├── setup.ts                        # Nuxt runtime test setup
│       ├── composables/                    # Composable tests
│       │   ├── useAvatarUpload.test.ts
│       │   ├── useNotifications.test.ts
│       │   └── useProfile.test.ts
│       ├── pages/                          # Page component tests
│       │   └── settings/
│       │       ├── index.test.ts           # Profile settings page
│       │       └── notifications.test.ts   # Notifications settings page
│       └── integration/                    # End-to-end flow tests
│           ├── settings-profile.test.ts
│           └── settings-notifications.test.ts
│
├── app/
│   ├── composables/                        # Source composables
│   │   ├── useAvatarUpload.ts
│   │   ├── useNotifications.ts
│   │   └── useProfile.ts
│   └── pages/                              # Source pages
│       └── settings/
│           ├── index.vue
│           └── notifications.vue
│
└── vitest.config.ts                        # Vitest configuration
```

### Naming Conventions

- Test files: `[source-file-name].test.ts` or `[source-file-name].spec.ts`
- Match source structure: `app/composables/useProfile.ts` → `test/nuxt/composables/useProfile.test.ts`

---

## Environment Setup

### Vitest Configuration

The `vitest.config.ts` defines separate test projects:

```typescript
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      // Unit tests - Node environment (fast, no Nuxt runtime)
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          environment: 'node',
          setupFiles: ['./test/unit/setup.ts']
        }
      },
      // Nuxt runtime tests - Nuxt environment
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          environment: 'nuxt',
          setupFiles: ['./test/nuxt/setup.ts']
        }
      })
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/types/**',
        '**/*.d.ts'
      ]
    }
  }
})
```

### Setup Files

**Unit Test Setup** (`test/unit/setup.ts`):

```typescript
import { vi } from 'vitest'

// Mock global fetch for unit tests (Node environment)
global.fetch = global.fetch || vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
}
```

**Nuxt Runtime Test Setup** (`test/nuxt/setup.ts`):

```typescript
import { vi } from 'vitest'

// Mock window.URL.createObjectURL for file upload tests (browser environment)
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-url')
  window.URL.revokeObjectURL = vi.fn()
}

// Mock global fetch for Nuxt runtime tests
global.fetch = global.fetch || vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
}
```

### Nuxt Configuration

The `@nuxt/test-utils/module` is added to `nuxt.config.ts` for DevTools integration:

```typescript
export default defineNuxtConfig({
  modules: [
    // ... other modules
    '@nuxt/test-utils/module'
  ]
})
```

### Required Dependencies

```json
{
  "devDependencies": {
    "@nuxt/test-utils": "^3.21.0",
    "@vue/test-utils": "^2.4.6",
    "@vitest/ui": "^3.2.0",
    "happy-dom": "^15.11.6",
    "vitest": "^3.2.0"
  }
}
```

---

## Running Tests

### Available Commands

```bash
# Run all tests (both unit and nuxt runtime)
pnpm test

# Run tests in watch mode (development)
pnpm test --watch

# Run tests with UI (interactive browser interface)
pnpm test:ui

# Run tests once (CI mode)
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test --project unit

# Run only Nuxt runtime tests
pnpm test --project nuxt

# Run specific test file
pnpm test test/nuxt/composables/useProfile.test.ts

# Run tests matching a pattern
pnpm test --grep "useProfile"
```

---

## Writing Tests

### Import Paths

**Unit Tests** (Node environment):
- Use relative paths: `import { something } from '../../../app/utils/something'`
- Nuxt path aliases (`~`, `@`) are NOT available

**Nuxt Runtime Tests** (Nuxt environment):
- Use Nuxt path aliases: `import { useComposable } from '~/composables/useComposable'`
- Aliases are automatically resolved by Nuxt

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set up mocks at module level
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Feature Name', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Specific Behavior', () => {
    it('should do something when condition is met', () => {
      // Arrange: Set up test data
      const input = 'test data'
      
      // Act: Execute the functionality
      const result = doSomething(input)
      
      // Assert: Verify the result
      expect(result).toBe('expected output')
    })
  })
})
```

---

### Composable Tests

Composable tests verify business logic encapsulated in composables.

**Example: `test/nuxt/composables/useAvatarUpload.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAvatarUpload } from '~/composables/useAvatarUpload'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock global fetch for R2 upload
const mockGlobalFetch = vi.fn()
global.fetch = mockGlobalFetch as typeof global.fetch

describe('useAvatarUpload Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    mockGlobalFetch.mockClear()
  })

  describe('File Validation', () => {
    it('should validate image file types', () => {
      const { validateFile } = useAvatarUpload()

      const validImage = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      expect(validateFile(validImage)).toBeNull()

      const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      expect(validateFile(invalidFile)).toBe('Only image files are allowed')
    })

    it('should validate file size (1MB limit)', () => {
      const { validateFile } = useAvatarUpload()

      // Create a file that's exactly 1MB
      const validSizeFile = new File([new ArrayBuffer(1024 * 1024)], 'avatar.jpg', {
        type: 'image/jpeg'
      })
      expect(validateFile(validSizeFile)).toBeNull()

      // Create a file that's over 1MB
      const oversizedFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'avatar.jpg', {
        type: 'image/jpeg'
      })
      expect(validateFile(oversizedFile)).toBe('File size must be less than 1MB')
    })
  })

  describe('Upload Flow', () => {
    it('should upload file to R2 using pre-signed URL', async () => {
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        filename: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: testFile.size,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response)

      const { uploadFile } = useAvatarUpload()
      const result = await uploadFile(testFile)

      expect(mockGlobalFetch).toHaveBeenCalledWith(
        'https://r2.example.com/upload',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'image/jpeg'
          }),
          body: testFile
        })
      )

      expect(result).toEqual({
        filename: 'avatar-key-123',
        originalName: 'avatar.jpg',
        contentType: 'image/jpeg',
        fileSize: testFile.size,
        uploadedAt: expect.any(String)
      })
    })
  })

  describe('State Management', () => {
    it('should track uploading state', async () => {
      mockFetch.mockResolvedValue({ presignedUrl: 'https://example.com/upload', /* ... */ })
      mockGlobalFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, status: 200 } as Response), 100)
        })
      })

      const { uploadFile, uploading } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      const uploadPromise = uploadFile(testFile)
      expect(uploading.value).toBe(true)  // During upload

      await uploadPromise
      expect(uploading.value).toBe(false) // After completion
    })
  })
})
```

#### Key Composable Testing Patterns

1. **Test Initial State**: Verify default values
2. **Test Methods**: Verify composable methods work correctly
3. **Test State Transitions**: Track loading/saving/error states
4. **Test Error Handling**: Verify errors are caught and reported
5. **Test Concurrent Operation Prevention**: Ensure operations don't overlap

---

### Page Tests

Page tests verify component initialization, composable integration, and user interactions.

**Example: `test/nuxt/pages/settings/index.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock composables
const mockUseProfile = vi.fn()
const mockUseAvatarUpload = vi.fn()

vi.mock('~/composables/useProfile', () => ({
  useProfile: () => mockUseProfile()
}))

vi.mock('~/composables/useAvatarUpload', () => ({
  useAvatarUpload: () => mockUseAvatarUpload()
}))

describe('Settings Page - Profile Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Composable Integration', () => {
    it('should use useProfile composable for profile management', () => {
      const mockProfile = {
        profile: { name: '', avatar: undefined, bio: undefined },
        loadProfile: vi.fn(),
        saveProfile: vi.fn(),
        loading: { value: false },
        saving: { value: false },
        error: { value: null }
      }

      mockUseProfile.mockReturnValue(mockProfile)

      const result = mockUseProfile()

      expect(result).toHaveProperty('profile')
      expect(result).toHaveProperty('loadProfile')
      expect(result).toHaveProperty('saveProfile')
    })
  })

  describe('Profile Update Flow', () => {
    it('should call saveProfile with correct data format', async () => {
      const mockSaveProfile = vi.fn()
      mockUseProfile.mockReturnValue({
        profile: { name: 'John Doe', avatar: undefined, bio: undefined },
        saveProfile: mockSaveProfile,
        loadProfile: vi.fn(),
        loading: { value: false },
        saving: { value: false },
        error: { value: null }
      })

      const { saveProfile } = mockUseProfile()
      const profileData = { name: 'Jane Doe', bio: 'Test bio' }

      await saveProfile(profileData)

      expect(mockSaveProfile).toHaveBeenCalledWith(profileData)
    })

    it('should handle avatar upload before profile save', async () => {
      const mockUploadFile = vi.fn().mockResolvedValue(undefined)
      const mockSaveProfile = vi.fn().mockResolvedValue(undefined)

      mockUseAvatarUpload.mockReturnValue({
        uploadFile: mockUploadFile,
        uploading: { value: false },
        uploadProgress: { value: 0 },
        error: { value: null },
        clearError: vi.fn()
      })

      mockUseProfile.mockReturnValue({
        profile: { name: 'John Doe', avatar: undefined, bio: undefined },
        saveProfile: mockSaveProfile,
        loadProfile: vi.fn(),
        loading: { value: false },
        saving: { value: false },
        error: { value: null }
      })

      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const { uploadFile } = mockUseAvatarUpload()
      const { saveProfile } = mockUseProfile()

      await uploadFile(mockFile)
      await saveProfile({ name: 'John Doe' })

      expect(mockUploadFile).toHaveBeenCalledWith(mockFile)
      expect(mockSaveProfile).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle profile loading errors', async () => {
      const mockLoadProfile = vi.fn().mockRejectedValue(new Error('Network error'))
      mockUseProfile.mockReturnValue({
        profile: { name: '', avatar: undefined, bio: undefined },
        loadProfile: mockLoadProfile,
        saveProfile: vi.fn(),
        loading: { value: false },
        saving: { value: false },
        error: { value: new Error('Network error') }
      })

      const { loadProfile } = mockUseProfile()

      await expect(loadProfile()).rejects.toThrow('Network error')
    })
  })
})
```

#### Key Page Testing Patterns

1. **Mock Composables, Not APIs**: Mock the composable interface for cleaner tests
2. **Test Composable Integration**: Verify components use composables correctly
3. **Test User Flows**: Verify multi-step processes (upload → save)
4. **Test Error Propagation**: Verify errors from composables are handled

---

### Integration Tests

Integration tests verify complete data flows across components and APIs.

**Example: `test/nuxt/integration/settings-profile.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Settings Profile - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Profile Update Flow', () => {
    it('should complete full profile update cycle: load -> edit -> save -> refresh', async () => {
      const initialProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'avatar-key-123',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      const updatedProfile = {
        ...initialProfile,
        name: 'Jane Doe',
        updatedAt: '2024-01-02T00:00:00Z'
      }

      const mockUseFetch = vi.fn()
      mockUseFetch.mockReturnValueOnce({
        error: { value: null },
        data: { value: initialProfile },
        pending: { value: false }
      })

      const mockFetch = vi.fn()
      mockFetch.mockResolvedValueOnce({
        success: true,
        user: updatedProfile
      })

      expect(mockUseFetch).toBeDefined()
      expect(mockFetch).toBeDefined()
    })
  })

  describe('API Contract Verification', () => {
    it('should send all required fields in POST request body', async () => {
      const mockFetch = vi.fn()
      mockFetch.mockResolvedValue({ success: true, /* ... */ })

      await mockFetch('http://localhost:8787/api/user/profile', {
        method: 'POST',
        body: { name: 'John Doe', bio: 'Test bio' },
        credentials: 'include'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user/profile'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      )
    })
  })

  describe('Error Handling Flow', () => {
    it('should handle network errors during profile load', async () => {
      const mockFetch = vi.fn()
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(
        mockFetch('http://localhost:8787/api/user/profile')
      ).rejects.toThrow('Network error')
    })
  })
})
```

#### Key Integration Testing Patterns

1. **Test Complete Flows**: Load → Edit → Save → Verify
2. **Test API Contracts**: Verify request/response structures
3. **Test Error Scenarios**: Network errors, validation errors, auth errors
4. **Test Data Consistency**: Verify state matches API responses

---

## Mocking Strategies

### Global Mocks

**Best Practice**: Create properly typed mock variables at the top of the test file:

```typescript
// ✅ GOOD: Clear, readable, properly typed
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

const mockGlobalFetch = vi.fn()
global.fetch = mockGlobalFetch as typeof global.fetch

// ❌ BAD: Cryptic, hard to read
;(global.fetch as any).mockResolvedValue({ ... })
```

### Mocking Nuxt Composables

```typescript
// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock Nuxt app composables
const mockUseRuntimeConfig = vi.fn(() => ({
  public: {
    apiBaseUrl: 'http://localhost:8787',
    r2CdnUrl: 'https://cdn.example.com'
  }
}))

const mockToastAdd = vi.fn()
const mockUseToast = vi.fn(() => ({
  add: mockToastAdd
}))

vi.mock('#app', () => ({
  useRuntimeConfig: () => mockUseRuntimeConfig(),
  useToast: () => mockUseToast()
}))

// Also stub globally for auto-imports
vi.stubGlobal('useToast', mockUseToast)
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)
```

### Mocking API Responses

```typescript
// Mock successful response
mockFetch.mockResolvedValue({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
})

// Mock error response
mockFetch.mockRejectedValue(new Error('API Error'))

// Mock multiple sequential calls
mockFetch
  .mockResolvedValueOnce(response1)
  .mockResolvedValueOnce(response2)

// Mock with custom implementation
mockFetch.mockImplementation(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return { success: true }
})
```

### Mocking Fetch Responses

```typescript
const mockGlobalFetch = vi.fn()
global.fetch = mockGlobalFetch as typeof global.fetch

// Mock successful fetch
mockGlobalFetch.mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK'
} as Response)

// Mock failed fetch
mockGlobalFetch.mockResolvedValue({
  ok: false,
  status: 500,
  statusText: 'Internal Server Error'
} as Response)
```

### Mocking File Objects

```typescript
// Create test files with actual content
const testFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })

// Create files with specific sizes
const largefile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'large.jpg', {
  type: 'image/jpeg'
})

// Use actual file properties in assertions
expect(mockFetch).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    body: expect.objectContaining({
      fileSize: testFile.size  // ✅ Use actual size
    })
  })
)
```

---

## Testing Patterns

### Arrange-Act-Assert Pattern

```typescript
it('should update profile name', async () => {
  // Arrange: Set up test data and mocks
  const mockData = { id: '123', name: 'John Doe' }
  mockFetch.mockResolvedValue(mockData)

  // Act: Execute the functionality
  const { profile, loadProfile } = useProfile()
  await loadProfile()

  // Assert: Verify the result
  expect(profile.name).toBe('John Doe')
  expect(mockFetch).toHaveBeenCalledWith(expectedUrl)
})
```

### Testing Async Operations

```typescript
describe('Async Operations', () => {
  it('should track loading state during async operation', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    )

    const { loadData, loading } = useComposable()
    const promise = loadData()

    expect(loading.value).toBe(true)   // During load

    await promise

    expect(loading.value).toBe(false)  // After completion
  })

  it('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { loadData, error } = useComposable()

    await expect(loadData()).rejects.toThrow()
    expect(error.value).toBeTruthy()
    expect(error.value?.message).toContain('Network error')
  })
})
```

### Testing Concurrent Operation Prevention

```typescript
it('should prevent concurrent saves', async () => {
  let callCount = 0

  mockFetch.mockImplementation(async () => {
    callCount++
    await new Promise(resolve => setTimeout(resolve, 100))
    return { success: true }
  })

  const { saving, saveData } = useComposable()

  // Start first save
  const promise1 = saveData()
  expect(saving.value).toBe(true)

  // Try second save while first is in progress
  const promise2 = saveData()

  await promise1
  await promise2

  // Should only have been called once
  expect(callCount).toBe(1)
})
```

### Testing State Cleanup

```typescript
it('should reset saving flag even when save fails', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'))

  const { saving, saveData } = useComposable()

  await expect(saveData()).rejects.toThrow()

  // Flag should be reset despite error
  expect(saving.value).toBe(false)
})
```

---

## Best Practices

### DO ✅

1. **Mock composables, not underlying APIs** in component tests
2. **Use `vi.clearAllMocks()` in `beforeEach`** to ensure test isolation
3. **Test behavior over implementation** - what users see, not internals
4. **Use descriptive test names** that read like documentation
5. **Keep tests focused** - one assertion per logical unit
6. **Use proper TypeScript types** for mocks and test data
7. **Test error paths** - not just happy paths
8. **Reset state between tests** - no shared mutable state

### DON'T ❌

1. **Don't test JavaScript fundamentals** (object creation, type checking)
2. **Don't use top-level await** in components - makes testing difficult
3. **Don't mock too deep** - mock at the composable boundary
4. **Don't skip error handling tests**
5. **Don't share state between tests**
6. **Don't use `any` type** for mocks - use proper types

### Common Mistakes to Avoid

```typescript
// ❌ BAD: Testing object creation (not behavior)
it('should have correct section', () => {
  const sections = [{ title: 'Account' }]
  expect(sections[0].title).toBe('Account')  // Just testing JS
})

// ✅ GOOD: Testing actual behavior
it('should call loadProfile on mount', async () => {
  const wrapper = mount(ProfilePage)
  await flushPromises()
  expect(mockLoadProfile).toHaveBeenCalledTimes(1)
})
```

---

## Code Coverage

### Running Coverage

```bash
pnpm test:coverage
```

### Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | ≥80% |
| Branches | ≥70% |
| Functions | ≥80% |
| Lines | ≥80% |

### Current Coverage Areas

| Component | Coverage |
|-----------|----------|
| `useAvatarUpload` | ✅ File validation, upload flow, state management, errors |
| `useNotifications` | ✅ Initial state, load/save, error handling, concurrency |
| `useProfile` | ✅ Profile CRUD, avatar URL construction, state management |
| Settings Pages | ✅ Composable integration, user flows, error handling |

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `useRuntimeConfig is not defined` | Test in `test/unit/` but needs Nuxt | Move to `test/nuxt/` |
| `Cannot find module '~/composables/...'` | Using Nuxt alias in unit test | Use relative path or move to `test/nuxt/` |
| Mocks not working | Mocks not set up correctly | Use `vi.stubGlobal`, clear in `beforeEach` |
| Tests timing out | Unresolved promises | Check all async ops have `await` |
| Type errors with mocks | Improper type casting | Use proper type assertions |

### Debugging Tips

1. **Run specific test file**: `pnpm test test/nuxt/composables/useProfile.test.ts`
2. **Use watch mode**: `pnpm test --watch`
3. **Use UI mode**: `pnpm test:ui`
4. **Add console logs**: `console.log` works in tests (mocked but accessible)
5. **Check mock calls**: `expect(mockFn).toHaveBeenCalledWith(...)` with `expect.anything()`

---

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add visual regression tests
- [ ] Increase coverage for edge cases
- [ ] Add performance tests for file uploads
- [ ] Add accessibility tests (a11y)
- [ ] Add snapshot tests for UI components

---

## References

- [Official Nuxt Testing Documentation](https://nuxt.com/docs/getting-started/testing)
- [@nuxt/test-utils Module](https://nuxt.com/modules/test-utils)
- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)


