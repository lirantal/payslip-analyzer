import type { UploadRequest, UploadResponse, UploadedFile, UploadError } from '~/types/upload'

export const useAvatarUpload = () => {
  const apiOrigin = useApiOrigin()

  const uploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<UploadError | null>(null)

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }

    // Check file size (1MB limit)
    const maxSize = 1 * 1024 * 1024 // 1MB
    if (file.size > maxSize) {
      return 'File size must be less than 1MB'
    }

    return null
  }

  // Get pre-signed URL from API
  const getPresignedUrl = async (file: File): Promise<UploadResponse> => {
    const uploadRequest: UploadRequest = {
      contentType: file.type,
      fileSize: file.size,
      originalFilename: file.name
    }

    try {
      const response = await $fetch<UploadResponse>(`${apiOrigin.value}/api/user/profile/image`, {
        method: 'POST',
        body: uploadRequest,
        credentials: 'include'
      })

      return response
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`Failed to get pre-signed URL: ${message}`)
    }
  }

  // Upload file directly to R2
  const uploadToR2 = async (file: File, presignedUrl: string, uploadResponse: UploadResponse): Promise<void> => {
    try {
      const headers = {
        'Content-Type': file.type,
        // DO NOT include Content-Length - browser calculates it automatically
        'x-amz-meta-original-filename': uploadResponse.originalFilename,
        'x-amz-meta-uploaded-by': uploadResponse.uploadedBy,
        'x-amz-meta-uploaded-at': uploadResponse.uploadedAt
      }

      // Debug: Log the headers being sent
      // console.log('Upload headers:', headers)
      // console.log('Upload response data:', uploadResponse)

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers,
        body: file
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`Upload failed: ${message}`)
    }
  }

  // Main upload function
  const uploadFile = async (file: File): Promise<UploadedFile> => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    uploading.value = true
    uploadProgress.value = 0
    error.value = null

    try {
      // Step 1: Get pre-signed URL
      const uploadResponse = await getPresignedUrl(file)
      const { presignedUrl, filename, originalFilename, contentType, fileSize } = uploadResponse

      // Step 2: Upload file directly to R2
      await uploadToR2(file, presignedUrl, uploadResponse)

      // Step 3: Create uploaded file record
      const uploadedFile: UploadedFile = {
        filename,
        originalName: originalFilename,
        contentType,
        fileSize,
        uploadedAt: new Date().toISOString()
      }

      uploadProgress.value = 100

      return uploadedFile
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = {
        message,
        code: 'UPLOAD_FAILED',
        details: err
      }
      throw err
    } finally {
      uploading.value = false
    }
  }

  // Upload multiple files
  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = []

    for (const file of files) {
      try {
        const result = await uploadFile(file)
        results.push(result)
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
        // Continue with other files
      }
    }

    return results
  }

  // Clear error
  const clearError = () => {
    error.value = null
    uploadProgress.value = 0
  }

  return {
    // State
    uploading: readonly(uploading),
    uploadProgress: readonly(uploadProgress),
    error: readonly(error),

    // Methods
    uploadFile,
    uploadFiles,
    validateFile,
    clearError
  }
}
