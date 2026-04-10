/**
 * Password hashing utilities for link protection
 * Uses Web Crypto API (Cloudflare Workers compatible)
 * PBKDF2 with HMAC-SHA-256, 600k iterations (OWASP 2023 recommended)
 */

const PBKDF2_ITERATIONS = 600000 // OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
const SALT_LENGTH = 16
const HASH_LENGTH = 256 // bits

/**
 * Hash a password using PBKDF2-HMAC-SHA256
 * Returns a base64-encoded string containing salt + hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH
  )

  const hashArray = new Uint8Array(derivedBits)
  const combined = new Uint8Array(salt.length + hashArray.length)
  combined.set(salt)
  combined.set(hashArray, salt.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0))
    const salt = combined.slice(0, SALT_LENGTH)
    const storedHashBytes = combined.slice(SALT_LENGTH)

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      HASH_LENGTH
    )

    const computedHash = new Uint8Array(derivedBits)

    // Constant-time comparison to prevent timing attacks
    if (computedHash.length !== storedHashBytes.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash[i] ^ storedHashBytes[i]
    }

    return result === 0
  } catch {
    return false
  }
}
