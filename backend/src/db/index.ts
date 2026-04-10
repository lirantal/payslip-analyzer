import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePGLite } from 'drizzle-orm/pglite'
import * as schema from './schema'

/** Wrangler/.env copy-paste sometimes produces `""url""`; neon() uses `new URL()` and rejects leading/trailing quotes. */
export function normalizeDatabaseUrl(url: string): string {
  let u = url.trim()
  while (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim()
  }
  return u
}

// Type for the database instance (works for both Neon and PGLite)
// Using a union type to support both Neon and PGLite databases
export type Database = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePGLite<typeof schema>>

// Type for PGLite database instance (needed for migrations)
export type PGLiteDatabase = ReturnType<typeof drizzlePGLite<typeof schema>>

/**
 * Creates a Neon database connection for production use
 */
export function createNeonDatabase(url: string): Database {
  const sql = neon(normalizeDatabaseUrl(url))
  return drizzleNeon(sql, { schema })
}

/**
 * Creates a PGLite database connection for testing
 * Returns both the Drizzle database instance and the underlying PGLite instance
 */
export async function createPGLiteDatabase(): Promise<{ db: PGLiteDatabase; pglite: PGlite }> {
  const pglite = new PGlite()
  await pglite.waitReady
  const db = drizzlePGLite(pglite, { schema })
  return { db, pglite }
}

