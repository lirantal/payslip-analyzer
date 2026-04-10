/**
 * Resolves the API origin the SPA should call.
 * Mirrors auth.client.ts: explicit `apiBaseUrl` in dev, else same-origin (Pages proxy).
 */
export function resolveApiOrigin(config: { public: { apiBaseUrl?: string } }): string {
  const raw = config.public.apiBaseUrl
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.replace(/\/$/, '')
  }
  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

export function useApiOrigin() {
  const config = useRuntimeConfig()
  return computed(() => resolveApiOrigin(config))
}
