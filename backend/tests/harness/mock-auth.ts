import type { Context, Next } from 'hono'

/**
 * Mock session data structure matching better-auth session format
 */
export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
  }
  session: {
    id: string
    expiresAt: Date
    token: string
    userId: string
  }
}

/**
 * Middleware that injects a mock session into the context for testing.
 * This bypasses real authentication by setting a session that routes can use.
 * Uses the generic 'session' key so production code doesn't need to know about testing.
 */
export function createMockSession(userId?: string): MockSession {
  const id = userId || crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return {
    user: {
      id,
      email: `test-${id}@example.com`,
      name: `Test User ${id}`,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: crypto.randomUUID(),
      expiresAt,
      token: crypto.randomUUID(),
      userId: id,
    },
  }
}

export function mockAuthMiddleware(mockSession: MockSession | null) {
  return async (c: Context, next: Next) => {
    if (mockSession) {
      c.set('session', mockSession)
    }
    await next()
  }
}

