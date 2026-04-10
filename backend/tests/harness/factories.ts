import { eq } from 'drizzle-orm'
import { user, account } from '../../src/db/schema'
import type { Database } from '../../src/db'
import type { MockSession } from './mock-auth'

export async function createTestUser(db: Database, mockSession: MockSession): Promise<void> {
  await db.insert(user).values({
    id: mockSession.user.id,
    name: mockSession.user.name,
    email: mockSession.user.email,
    emailVerified: mockSession.user.emailVerified,
    image: mockSession.user.image ?? null,
    createdAt: mockSession.user.createdAt,
    updatedAt: mockSession.user.updatedAt,
  })
}

export async function createTestCredentialAccount(
  db: Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export async function deleteUserById(db: Database, userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId))
}
