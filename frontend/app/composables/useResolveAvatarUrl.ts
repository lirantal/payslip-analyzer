/**
 * Maps `user.image` / profile `image` (HTTPS URL or R2 object key) to a value usable as `<img src>`.
 * Uses NUXT_PUBLIC_R2_CDN_URL + `/gallery/{key}` when set; otherwise fetches a presigned URL from GET /api/user/profile/image.
 */
export function useResolveAvatarUrl() {
  const config = useRuntimeConfig()
  const apiOrigin = useApiOrigin()

  return async (imageKey: string | null | undefined): Promise<string | undefined> => {
    if (!imageKey) {
      return undefined
    }
    if (/^https?:\/\//i.test(imageKey)) {
      return imageKey
    }
    const cdnRaw = config.public.r2CdnUrl
    const cdn = typeof cdnRaw === 'string' ? cdnRaw.trim().replace(/\/$/, '') : ''
    if (cdn) {
      return `${cdn}/gallery/${imageKey}`
    }
    try {
      const r = await $fetch<{ hasImage: boolean, downloadUrl?: string }>(
        `${apiOrigin.value}/api/user/profile/image`,
        { credentials: 'include' }
      )
      return r.hasImage && r.downloadUrl ? r.downloadUrl : undefined
    } catch {
      return undefined
    }
  }
}
