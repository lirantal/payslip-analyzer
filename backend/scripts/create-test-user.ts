#!/usr/bin/env node
/**
 * Create a user + email/password credential account for local testing (bypasses HTTP sign-up).
 * Uses the same bcrypt cost as Better Auth / reset-password.ts.
 *
 * Usage (from cloudflare-app/backend, with DATABASE_URL in .env):
 *   pnpm run create-test-user -- <email> <password> [name]
 *
 * If .env uses 1Password op:// references, run:
 *   op run --env-file=.env -- pnpm exec tsx scripts/create-test-user.ts <email> <password> [name]
 */

import { hash } from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { normalizeDatabaseUrl } from '../src/db'
import { user, account } from '../src/db/schema'

let args = process.argv.slice(2)
// pnpm run create-test-user -- <email> … can forward a literal `--` to the child process
while (args[0] === '--') args = args.slice(1)

if (args.length < 2) {
  console.error('Usage: create-test-user.ts <email> <password> [displayName]')
  console.error('Example: pnpm run create-test-user -- dev@example.com "SecurePass123" "Dev User"')
  process.exit(1)
}

const [emailRaw, rawPassword, nameArg] = args
const email = emailRaw.trim().toLowerCase()
const name = nameArg?.trim() || 'Test User'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error(`Invalid email: ${emailRaw}`)
  process.exit(1)
}

if (!rawPassword || rawPassword.length < 8) {
  console.error('Password must be at least 8 characters')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Use .env with literal values or: op run --env-file=.env -- pnpm exec tsx scripts/create-test-user.ts ...')
  process.exit(1)
}

async function main() {
  const sql = neon(normalizeDatabaseUrl(databaseUrl))
  const db = drizzle(sql)

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1)
  if (existing.length > 0) {
    console.error(`User already exists: ${email}`)
    console.error('Use: pnpm run reset-password -- ' + email + ' <new-password>')
    process.exit(1)
  }

  const userId = crypto.randomUUID()
  const now = new Date()
  const hashedPassword = await hash(rawPassword, 10)

  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  })

  console.log('Created user')
  console.log(`  id:    ${userId}`)
  console.log(`  email: ${email}`)
  console.log(`  name:  ${name}`)
  console.log('\nSign in: POST /api/auth/sign-in/email with this email and password.')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
