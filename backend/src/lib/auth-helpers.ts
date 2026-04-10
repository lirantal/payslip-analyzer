import { auth } from './better-auth'

/**
 * Session type matching better-auth session structure
 */
export type Session = {
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
 * Type guard to check if a value is a valid session
 */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  
  const obj = value as Record<string, unknown>
  if (!('user' in obj) || !('session' in obj)) {
    return false
  }
  
  const user = obj.user as Record<string, unknown>
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string'
  )
}

/**
 * Helper to get session - checks context first (for testing), then falls back to real auth
 * 
 * This function checks for a session in the Hono context first (which can be set by
 * test middleware or other middleware), and if not found, falls back to real
 * authentication via better-auth.
 */
export async function getSession(c: { env?: Env; get: (key: string) => unknown; req: { raw: { headers: Headers } } }): Promise<Session | null> {
  // Check for session in context first (set by test middleware or other middleware)
  const sessionFromContext = c.get('session')
  if (sessionFromContext && isSession(sessionFromContext)) {
    return sessionFromContext
  }
  
  // If no env (testing without session), return null
  if (!c.env) {
    return null
  }
  
  // Fall back to real authentication
  const session = await auth(c.env).api.getSession({
    headers: c.req.raw.headers
  })
  
  return isSession(session) ? session : null
}

