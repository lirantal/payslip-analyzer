import type { Context, Next } from 'hono'
import type { Database } from '../db'
import { createNeonDatabase } from '../db'

/**
 * Middleware that injects a database connection into the Hono context.
 * 
 * In production: Creates a Neon connection from env.DATABASE_URL
 * In testing: Use a pre-created database instance (set via c.set('db', db) before this middleware)
 */
export async function databaseMiddleware(c: Context<{ Bindings: Env; Variables: { db?: Database } }>, next: Next) {
  // Check if database is already set (useful for testing)
  let db = c.get('db')
  
  // If not set, create from environment (production)
  if (!db && c.env.DATABASE_URL) {
    db = createNeonDatabase(c.env.DATABASE_URL)
    c.set('db', db)
  }
  
  await next()
}

