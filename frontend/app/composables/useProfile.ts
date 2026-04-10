import { reactive, ref, readonly } from 'vue'

// Type for backend profile response
export type ProfileResponse = {
  id: string
  name: string
  email: string
  image: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

// Type for frontend profile state
export type ProfileState = {
  name: string
  avatar: string | undefined
  bio: string | undefined
}

// Type for profile update request
export type ProfileUpdateRequest = {
  name: string
  bio?: string
}

// Type for profile update response
export type ProfileUpdateResponse = {
  success: boolean
  user: ProfileResponse
}

export const useProfile = () => {
  const apiOrigin = useApiOrigin()
  const toast = useToast()
  const resolveAvatarUrl = useResolveAvatarUrl()

  const profile = reactive<ProfileState>({
    name: '',
    avatar: undefined,
    bio: undefined
  })

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<Error | null>(null)

  const getAvatarUrl = resolveAvatarUrl

  // Load profile data
  const loadProfile = async () => {
    loading.value = true
    error.value = null

    try {
      const userData = await $fetch<ProfileResponse>(
        `${apiOrigin.value}/api/user/profile`,
        {
          credentials: 'include'
        }
      )

      // Map backend response to frontend form state
      profile.name = userData.name || ''
      profile.avatar = await getAvatarUrl(userData.image)
      profile.bio = undefined // Bio is not in backend schema
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load profile data')
      toast.add({
        title: 'Error',
        description: 'Failed to load profile data. Please refresh the page.',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  // Save profile data
  const saveProfile = async (data: ProfileUpdateRequest) => {
    if (saving.value) {
      return // Prevent concurrent saves
    }

    saving.value = true
    error.value = null

    try {
      const response = await $fetch<ProfileUpdateResponse>(
        `${apiOrigin.value}/api/user/profile`,
        {
          method: 'POST',
          body: {
            name: data.name,
            bio: data.bio
          },
          credentials: 'include'
        }
      )

      // Update local state with response
      if (response.user) {
        profile.name = response.user.name
        // Update avatar URL if image exists
        profile.avatar = await getAvatarUrl(response.user.image)
      }

      toast.add({
        title: 'Success',
        description: 'Your settings have been updated.',
        icon: 'i-lucide-check',
        color: 'success'
      })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err : new Error('Failed to update settings')
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update settings.',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    profile,
    loading: readonly(loading),
    saving: readonly(saving),
    error: readonly(error),
    loadProfile,
    saveProfile,
    getAvatarUrl
  }
}
