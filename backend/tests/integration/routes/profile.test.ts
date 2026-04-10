import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { user } from '../../../src/db/schema'
import { createTestApp, createMockSession, createTestUser, testWorkerEnv } from '../../harness/setup'

describe('Profile API', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await createTestApp(null)

    const res = await app.request('http://test/api/user/profile', { method: 'GET' }, testWorkerEnv())

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Authentication required')
  })

  it('returns profile for authenticated user', async () => {
    const mockSession = createMockSession()
    const { app, db } = await createTestApp(mockSession)
    await createTestUser(db, mockSession)

    const res = await app.request('http://test/api/user/profile', { method: 'GET' }, testWorkerEnv())

    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; email: string }
    expect(body.id).toBe(mockSession.user.id)
    expect(body.email).toBe(mockSession.user.email)
  })

  it('returns 404 when session user is missing from database', async () => {
    const mockSession = createMockSession()
    const { app } = await createTestApp(mockSession)

    const res = await app.request('http://test/api/user/profile', { method: 'GET' }, testWorkerEnv())

    expect(res.status).toBe(404)
  })

  describe('GET /api/user/profile/image', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await createTestApp(null)

      const res = await app.request(
        'http://test/api/user/profile/image',
        { method: 'GET' },
        testWorkerEnv(),
      )

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Authentication required')
    })

    it('returns hasImage false when user has no image', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      const res = await app.request(
        'http://test/api/user/profile/image',
        { method: 'GET' },
        testWorkerEnv(),
      )

      expect(res.status).toBe(200)
      const body = (await res.json()) as { hasImage: boolean; message?: string }
      expect(body.hasImage).toBe(false)
      expect(body.message).toBe('No profile image set')
    })

    it('returns download URL when user has image key', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)
      await db.update(user).set({ image: 'my-profile-image-key' }).where(eq(user.id, mockSession.user.id))

      const res = await app.request(
        'http://test/api/user/profile/image',
        { method: 'GET' },
        testWorkerEnv(),
      )

      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        hasImage: boolean
        downloadUrl?: string
        filename?: string
        expiresIn?: number
      }
      expect(body.hasImage).toBe(true)
      expect(body.downloadUrl).toContain('mock-r2.example.com/download/my-profile-image-key')
      expect(body.filename).toBe('my-profile-image-key')
      expect(body.expiresIn).toBe(3600)
    })
  })

  describe('POST /api/user/profile/image', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await createTestApp(null)

      const res = await app.request(
        'http://test/api/user/profile/image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: 'image/jpeg', fileSize: 1024 }),
        },
        testWorkerEnv(),
      )

      expect(res.status).toBe(401)
    })

    it('returns 400 when contentType or fileSize is missing', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      const res = await app.request(
        'http://test/api/user/profile/image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileSize: 1024 }),
        },
        testWorkerEnv(),
      )

      expect(res.status).toBe(400)
    })

    it('returns presigned URL and persists new key on first upload', async () => {
      const mockSession = createMockSession()
      const { app, db } = await createTestApp(mockSession)
      await createTestUser(db, mockSession)

      const [before] = await db.select().from(user).where(eq(user.id, mockSession.user.id)).limit(1)
      expect(before?.image).toBeNull()

      const res = await app.request(
        'http://test/api/user/profile/image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: 'image/jpeg',
            fileSize: 1024,
            originalFilename: 'my-photo.jpg',
          }),
        },
        testWorkerEnv(),
      )

      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        presignedUrl: string
        key: string
        filename: string
        contentType: string
        fileSize: number
        expiresIn: number
        uploadedBy: string
        originalFilename: string
      }
      expect(body.presignedUrl).toContain('mock-r2.example.com/upload/')
      expect(body.presignedUrl).toContain(body.key)
      expect(body.filename).toBe(body.key)
      expect(body.contentType).toBe('image/jpeg')
      expect(body.fileSize).toBe(1024)
      expect(body.expiresIn).toBe(86400)
      expect(body.uploadedBy).toBe(mockSession.user.id)
      expect(body.originalFilename).toBe('my-photo.jpg')

      const [after] = await db.select().from(user).where(eq(user.id, mockSession.user.id)).limit(1)
      expect(after?.image).toBe(body.key)
    })
  })
})
