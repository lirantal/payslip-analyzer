import { Hono } from 'hono'
import { createPGLiteDatabase, type Database, type PGLiteDatabase } from '../../src/db'
import { mockAuthMiddleware, type MockSession } from './mock-auth'
import { databaseMiddleware } from '../../src/middleware/database'
import profile from '../../src/routes/profile'
import { migrate } from 'drizzle-orm/pglite/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockR2Bucket, type MockR2Bucket } from './mock-r2'

export { createTestUser, createTestCredentialAccount, deleteUserById } from './factories'
export { createMockSession, mockAuthMiddleware, type MockSession } from './mock-auth'
export { createMockR2Bucket, type MockR2Bucket } from './mock-r2'
export type { PGLiteDatabase }

export async function applySchema(db: PGLiteDatabase): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const migrationsFolder = path.join(__dirname, '../../drizzle')
  await migrate(db, { migrationsFolder })
}

async function createBaseApp(mockSession?: MockSession | null): Promise<{
  app: Hono<{ Bindings: Env; Variables: { db?: Database; session?: unknown; bucket?: MockR2Bucket } }>
  db: Database
  bucket: MockR2Bucket
}> {
  const { db } = await createPGLiteDatabase()
  await applySchema(db)
  const bucket = createMockR2Bucket()

  const app = new Hono<{ Bindings: Env; Variables: { db?: Database; session?: unknown; bucket?: MockR2Bucket } }>()

  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('bucket', bucket)
    await next()
  })

  app.use('*', databaseMiddleware)

  if (mockSession !== undefined) {
    app.use('*', mockAuthMiddleware(mockSession))
  }

  return { app, db, bucket }
}

/** Profile routes only (avoids loading payslip route in Vitest). */
export async function createTestApp(mockSession?: MockSession | null): Promise<{
  app: Hono<{ Bindings: Env; Variables: { db?: Database; session?: unknown; bucket?: MockR2Bucket } }>
  db: Database
  bucket: MockR2Bucket
}> {
  const { app, db, bucket } = await createBaseApp(mockSession)
  app.route('/api/user', profile)
  return { app, db, bucket }
}

/** Profile + payslip (dynamic import so wasm is only loaded when needed). */
export async function createTestAppWithPayslip(mockSession?: MockSession | null): Promise<{
  app: Hono<{ Bindings: Env; Variables: { db?: Database; session?: unknown; bucket?: MockR2Bucket } }>
  db: Database
  bucket: MockR2Bucket
}> {
  const { app, db, bucket } = await createBaseApp(mockSession)
  app.route('/api/user', profile)
  const payslipMod = await import('../../src/routes/payslip')
  app.route('/api/payslip', payslipMod.default)
  return { app, db, bucket }
}

/** Minimal `Env` for route handlers that read secrets (e.g. payslip analyze). */
export function testWorkerEnv(overrides: Partial<Env> = {}): Env {
  return {
    DATABASE_URL: 'postgresql://test:test@example.com:5432/testdb',
    BETTER_AUTH_SECRET: '0'.repeat(40),
    BETTER_AUTH_URL: 'http://127.0.0.1:8787',
    CLOUDFLARE_ACCOUNT_ID: '',
    R2_ACCESS_KEY_ID: '',
    R2_SECRET_ACCESS_KEY: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GOOGLE_REDIRECT_URL: '',
    GEMINI_API_KEY: 'test-gemini-key',
    ...overrides,
  } as Env
}
