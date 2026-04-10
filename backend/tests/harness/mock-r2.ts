/**
 * Mock R2 bucket for testing
 *
 * Provides a mock implementation of the R2 bucket interface from @cfkit/r2.
 */

export interface PresignedUploadOptions {
  key: string
  contentType: string
  metadata?: Record<string, string>
  expiresIn?: number
  maxFileSize?: number
  allowedContentTypes?: string[]
}

export interface PresignedDownloadOptions {
  expiresIn?: number
}

export interface PresignedUrlResult {
  url: string
  expiresIn: number
}

export interface UploadFileOptions {
  contentType: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  key: string
  contentType: string
  fileSize: number
  etag?: string
}

export interface MockR2Bucket {
  presignedUploadUrl: (options: PresignedUploadOptions) => Promise<PresignedUrlResult>
  presignedDownloadUrl: (key: string, options?: PresignedDownloadOptions) => Promise<PresignedUrlResult>
  uploadFile: (key: string, file: Blob | File | ArrayBuffer | string, options: UploadFileOptions) => Promise<UploadResult>
  deleteObject: (key: string) => Promise<void>
  objectExists: (key: string) => Promise<boolean>
  getDeletedObjects: () => string[]
}

export function createMockR2Bucket(): MockR2Bucket {
  const deletedObjects: string[] = []
  const storage = new Map<string, { content: string; contentType: string }>()

  return {
    presignedUploadUrl: async (options: PresignedUploadOptions): Promise<PresignedUrlResult> => ({
      url: `https://mock-r2.example.com/upload/${options.key}?token=mock-token`,
      expiresIn: options.expiresIn || 86400,
    }),
    presignedDownloadUrl: async (key: string, options?: PresignedDownloadOptions): Promise<PresignedUrlResult> => ({
      url: `https://mock-r2.example.com/download/${key}?token=mock-token`,
      expiresIn: options?.expiresIn || 3600,
    }),
    uploadFile: async (key: string, file: Blob | File | ArrayBuffer | string, options: UploadFileOptions): Promise<UploadResult> => {
      const content = typeof file === 'string' ? file : 'mock-content'
      storage.set(key, { content, contentType: options.contentType })
      return {
        key,
        contentType: options.contentType,
        fileSize: content.length,
        etag: 'mock-etag',
      }
    },
    deleteObject: async (key: string): Promise<void> => {
      storage.delete(key)
      deletedObjects.push(key)
    },
    objectExists: async (key: string): Promise<boolean> => {
      return storage.has(key)
    },
    getDeletedObjects: (): string[] => {
      return [...deletedObjects]
    },
  }
}
