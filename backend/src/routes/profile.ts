import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { user, account, session as sessionTable, verification } from '../db/schema'
import { getGalleryBucket, type PresignR2Bucket } from '../lib/r2-client'
import { getSession } from '../lib/auth-helpers'
import { verifyPassword } from '../lib/password'
import type { Database } from '../db'

const profile = new Hono<{
  Bindings: Env
  Variables: {
    db?: Database
    session?: unknown
    bucket?: PresignR2Bucket
  }
}>()

profile.get('/profile', async (c) => {
  try {
    const session = await getSession(c)

    if (!session) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.get('db')
    if (!db) {
      return c.json({ error: 'Database connection not available' }, 500)
    }

    const userRecord = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)

    if (userRecord.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const userData = userRecord[0]

    return c.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      image: userData.image,
      emailVerified: userData.emailVerified,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

profile.post('/profile', async (c) => {
  try {
    const session = await getSession(c)

    if (!session) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body = await c.req.json()
    const { name, image } = body as { name?: string; image?: string | null }

    if (!name) {
      return c.json({ error: 'Name is required' }, 400)
    }

    if (name.length < 1 || name.length > 100) {
      return c.json({ error: 'Name must be between 1 and 100 characters' }, 400)
    }

    const db = c.get('db')
    if (!db) {
      return c.json({ error: 'Database connection not available' }, 500)
    }

    const updateData: Record<string, unknown> = {
      name,
      updatedAt: new Date(),
    }

    if (Object.prototype.hasOwnProperty.call(body, 'image')) {
      updateData.image = image
    }

    const updatedUser = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id))
      .returning()

    if (updatedUser.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const userData = updatedUser[0]

    return c.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        emailVerified: userData.emailVerified,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

profile.get('/profile/image', async (c) => {
  try {
    const session = await getSession(c)

    if (!session) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.get('db')
    if (!db) {
      return c.json({ error: 'Database connection not available' }, 500)
    }

    const userRecord = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)

    if (userRecord.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const userData = userRecord[0]

    if (!userData.image) {
      return c.json({
        hasImage: false,
        message: 'No profile image set',
      })
    }

    const bucket = c.get('bucket') || getGalleryBucket(c.env)
    const result = await bucket.presignedDownloadUrl(userData.image, {
      expiresIn: 3600,
    })

    return c.json({
      hasImage: true,
      downloadUrl: result.url,
      filename: userData.image,
      expiresIn: result.expiresIn,
    })
  } catch (error) {
    console.error('Error generating profile image download URL:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

profile.post('/profile/image', async (c) => {
  try {
    const session = await getSession(c)

    if (!session) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body = await c.req.json()
    const { contentType, fileSize, originalFilename } = body as {
      contentType: string
      fileSize: number
      originalFilename?: string
    }

    if (!contentType || !fileSize) {
      return c.json({ error: 'contentType and fileSize are required' }, 400)
    }

    const db = c.get('db')
    if (!db) {
      return c.json({ error: 'Database connection not available' }, 500)
    }

    const userRows = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
    if (userRows.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    const currentUser = userRows[0]

    let key = currentUser.image
    if (!key) {
      key = crypto.randomUUID()
      await db.update(user).set({ image: key, updatedAt: new Date() }).where(eq(user.id, session.user.id))
    }

    const uploadedAt = new Date().toISOString()
    const effectiveOriginalFilename = (originalFilename && String(originalFilename)) || key

    const bucket = c.get('bucket') || getGalleryBucket(c.env)
    const result = await bucket.presignedUploadUrl({
      key,
      contentType,
      metadata: {
        'original-filename': effectiveOriginalFilename,
        'uploaded-by': session.user.id,
        'uploaded-at': uploadedAt,
      },
      expiresIn: 86400,
    })

    return c.json({
      presignedUrl: result.url,
      key,
      filename: key,
      contentType,
      fileSize,
      expiresIn: result.expiresIn,
      uploadedBy: session.user.id,
      uploadedAt,
      originalFilename: effectiveOriginalFilename,
    })
  } catch (error) {
    console.error('Error generating profile image upload URL:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

profile.delete('/account', async (c) => {
  try {
    const session = await getSession(c)

    if (!session) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.get('db')
    if (!db) {
      return c.json({ error: 'Database connection not available' }, 500)
    }

    const body = await c.req.json()
    const { password, confirmationText } = body as {
      password?: string
      confirmationText?: string
    }

    const credentialAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'credential')))
      .limit(1)

    const hasCredentialAccount = credentialAccount.length > 0

    if (hasCredentialAccount) {
      if (!password) {
        return c.json(
          {
            error: 'Password confirmation required',
            requiresPassword: true,
          },
          400,
        )
      }

      const storedHash = credentialAccount[0].password
      if (!storedHash) {
        return c.json({ error: 'Account password not found' }, 500)
      }

      const isValidPassword = await verifyPassword(password, storedHash)
      if (!isValidPassword) {
        return c.json({ error: 'Invalid password' }, 403)
      }
    } else {
      if (!confirmationText || confirmationText !== 'DELETE') {
        return c.json(
          {
            error: 'Please type "DELETE" to confirm account deletion',
            requiresConfirmationText: true,
          },
          400,
        )
      }
    }

    await db.delete(verification).where(eq(verification.identifier, session.user.email))
    await db.delete(sessionTable).where(eq(sessionTable.userId, session.user.id))
    await db.delete(account).where(eq(account.userId, session.user.id))
    await db.delete(user).where(eq(user.id, session.user.id))

    return c.json({
      success: true,
      message: 'Account deleted',
    })
  } catch (error) {
    console.error('Error deleting user account:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default profile
