/**
 * Workerd gaps vs browser/Node that some libraries assume.
 * Keep this file imported first from `index.ts`.
 */
type NavPoly = Navigator & { userAgent?: string; platform?: string }

if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (compatible; CloudflareWorker)',
      platform: 'Linux x86_64',
    },
    configurable: true,
    writable: true,
  })
} else {
  const nav = globalThis.navigator as NavPoly
  if (typeof nav.userAgent !== 'string') {
    Object.defineProperty(nav, 'userAgent', {
      value: 'Mozilla/5.0 (compatible; CloudflareWorker)',
      configurable: true,
      enumerable: true,
    })
  }
  if (typeof nav.platform !== 'string') {
    Object.defineProperty(nav, 'platform', {
      value: 'Linux x86_64',
      configurable: true,
      enumerable: true,
    })
  }
}
