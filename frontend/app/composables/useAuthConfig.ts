/**
 * Composable to expose authentication configuration flags
 *
 * Use this to check if specific auth methods are enabled/disabled
 */
export const useAuthConfig = () => {
  const config = useRuntimeConfig()

  /**
   * Whether email+password authentication is enabled
   * When false, only social login (e.g., Google OAuth) is available
   */
  const emailPasswordEnabled = computed(() => config.public.emailPasswordAuthEnabled as boolean)

  return {
    emailPasswordEnabled
  }
}
