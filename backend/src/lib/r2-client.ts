import { R2Client } from '@cfkit/r2'

/** R2 bucket name; must match `bucket_name` in wrangler.jsonc and setup-r2.sh. */
export const R2_BUCKET_NAME = 'payslip-analyzer-bucket'

/** Subset used by routes + tests (mock bucket implements this structurally). */
export type PresignR2Bucket = {
  presignedUploadUrl: (options: {
    key: string
    contentType: string
    metadata?: Record<string, string>
    expiresIn?: number
    maxFileSize?: number
    allowedContentTypes?: string[]
  }) => Promise<{ url: string; expiresIn: number }>
  presignedDownloadUrl: (
    key: string,
    options?: { expiresIn?: number },
  ) => Promise<{ url: string; expiresIn: number }>
}

/**
 * Get an R2Client instance configured from environment variables.
 */
export function getR2Client(env: Env): R2Client {
  return new R2Client({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  })
}

/**
 * Bucket instance for presigned upload/download (S3-compatible API via @cfkit/r2).
 */
export function getGalleryBucket(env: Env) {
  return getR2Client(env).bucket(R2_BUCKET_NAME)
}
