import { createAuthClient } from 'better-auth/vue'
import { resolveApiOrigin } from '~/composables/useApiOrigin'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const origin = resolveApiOrigin(config)
  const baseURL = `${origin}/api/auth`

  const authClient = createAuthClient({
    baseURL
  })

  return {
    provide: {
      authClient
    }
  }
})
