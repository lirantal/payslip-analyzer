import type { User, Session } from 'better-auth/types'

export type DeleteAccountResponse = {
  success: boolean
  message: string
  deletedAt: string
}

export type DeleteAccountErrorResponse = {
  error: string
  requiresPassword?: boolean
  requiresConfirmationText?: boolean
}

export const useAuth = () => {
  const { $authClient } = useNuxtApp()
  const apiOrigin = useApiOrigin()

  // Use useState to share state across all components (persists across navigation)
  // This is critical: using ref() would create fresh state for each component,
  // causing the auth middleware to not see the login state from the login page
  const session = useState<Session | null>('auth-session', () => null)
  const user = useState<User | null>('auth-user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => false)
  const error = useState<string | null>('auth-error', () => null)

  // Get current session
  const getSession = async () => {
    try {
      isLoading.value = true
      error.value = null

      const client = $authClient as { getSession?: () => Promise<{ data?: { session?: Session | null, user?: User | null } | null }> } | undefined
      if (!client?.getSession) {
        console.error('Better Auth client is not available (check auth.client plugin)')
        return null
      }

      const result = await client.getSession()
      session.value = result.data?.session || null
      user.value = result.data?.user || null

      return result.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get session'
      console.error('Auth error:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      isLoading.value = true
      error.value = null

      const result = await $authClient.signIn.email({
        email,
        password
      })

      if (result.data) {
        user.value = result.data.user
        // Fetch the full session after sign in
        await getSession()
        return result.data
      }

      throw new Error('Sign in failed')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
      console.error('Sign in error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign up with email, password, and name
  const signUp = async (email: string, password: string, name: string) => {
    try {
      isLoading.value = true
      error.value = null

      const result = await $authClient.signUp.email({
        email,
        password,
        name
      })

      if (result.data) {
        user.value = result.data.user
        // Fetch the full session after sign up
        await getSession()
        return result.data
      }

      throw new Error('Sign up failed')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign up failed'
      console.error('Sign up error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      isLoading.value = true
      error.value = null

      await $authClient.signOut()

      session.value = null
      user.value = null

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign out failed'
      console.error('Sign out error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Check if user is authenticated
  const isAuthenticated = computed(() => !!session.value && !!user.value)

  // Initialize session on composable creation
  onMounted(() => {
    getSession()
  })

  // Delete account (soft-delete)
  const deleteAccount = async (options: { password?: string, confirmationText?: string }): Promise<DeleteAccountResponse> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await $fetch<DeleteAccountResponse>(`${apiOrigin.value}/api/user/account`, {
        method: 'DELETE',
        body: options,
        credentials: 'include'
      })

      // Clear local state after successful deletion
      session.value = null
      user.value = null

      return response
    } catch (err) {
      // Handle FetchError with response data
      if (err && typeof err === 'object' && 'data' in err) {
        const fetchError = err as { data: DeleteAccountErrorResponse }
        error.value = fetchError.data?.error || 'Failed to delete account'
        throw fetchError.data
      }
      error.value = err instanceof Error ? err.message : 'Failed to delete account'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    session: readonly(session),
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAuthenticated,

    // Methods
    getSession,
    signIn,
    signUp,
    signOut,
    deleteAccount
  }
}
