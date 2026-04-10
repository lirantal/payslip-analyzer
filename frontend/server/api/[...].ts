/**
 * API Proxy Route
 *
 * This catch-all route proxies all /api/* requests to the backend Worker.
 * This solves the cross-domain cookie issue where session cookies set by
 * the backend (*.workers.dev) aren't sent when making requests from the
 * frontend (*.pages.dev).
 *
 * By proxying through the frontend, cookies are set on the frontend's domain,
 * making session management work correctly.
 *
 * Configuration:
 * - BACKEND_URL environment variable must be set in production
 * - For local dev, set NUXT_PUBLIC_API_BASE_URL to bypass the proxy
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.backendUrl) {
    throw createError({
      statusCode: 500,
      message: 'BACKEND_URL environment variable is not configured'
    })
  }

  const targetUrl = `${config.backendUrl}${event.path}`

  return proxyRequest(event, targetUrl)
})
