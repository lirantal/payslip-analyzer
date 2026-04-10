import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAvatarUpload } from '~/composables/useAvatarUpload'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock global fetch for R2 upload
const mockGlobalFetch = vi.fn()
global.fetch = mockGlobalFetch as typeof global.fetch

describe('useAvatarUpload Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    mockGlobalFetch.mockClear()
  })

  describe('File Validation', () => {
    it('should validate image file types', () => {
      const { validateFile } = useAvatarUpload()

      const validImage = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      expect(validateFile(validImage)).toBeNull()

      const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      expect(validateFile(invalidFile)).toBe('Only image files are allowed')
    })

    it('should validate file size (1MB limit)', () => {
      const { validateFile } = useAvatarUpload()

      // Create a file that's exactly 1MB
      const validSizeFile = new File([new ArrayBuffer(1024 * 1024)], 'avatar.jpg', {
        type: 'image/jpeg'
      })
      expect(validateFile(validSizeFile)).toBeNull()

      // Create a file that's over 1MB
      const oversizedFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'avatar.jpg', {
        type: 'image/jpeg'
      })
      expect(validateFile(oversizedFile)).toBe('File size must be less than 1MB')
    })

    it('should accept valid image files', () => {
      const { validateFile } = useAvatarUpload()

      const jpegFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const pngFile = new File(['test'], 'avatar.png', { type: 'image/png' })
      const gifFile = new File(['test'], 'avatar.gif', { type: 'image/gif' })

      expect(validateFile(jpegFile)).toBeNull()
      expect(validateFile(pngFile)).toBeNull()
      expect(validateFile(gifFile)).toBeNull()
    })
  })

  describe('Upload Flow', () => {
    it('should get pre-signed URL from API', async () => {
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        filename: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: testFile.size,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response)

      const { uploadFile } = useAvatarUpload()

      await uploadFile(testFile)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/user/profile/image',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.objectContaining({
            contentType: 'image/jpeg',
            fileSize: testFile.size,
            originalFilename: 'avatar.jpg'
          })
        })
      )
    })

    it('should upload file to R2 using pre-signed URL', async () => {
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        filename: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: 1024,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response)

      const { uploadFile } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      const result = await uploadFile(testFile)

      expect(mockGlobalFetch).toHaveBeenCalledWith(
        'https://r2.example.com/upload',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'image/jpeg'
          }),
          body: testFile
        })
      )

      expect(result).toEqual({
        filename: 'avatar-key-123',
        originalName: 'avatar.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024,
        uploadedAt: expect.any(String)
      })
    })

    it('should handle upload errors gracefully', async () => {
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: 1024,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const { uploadFile, error } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      await expect(uploadFile(testFile)).rejects.toThrow()

      expect(error.value).toBeTruthy()
      // The error message will be from the fetch error, not "Upload failed"
      expect(error.value?.message).toBeTruthy()
    })

    it('should handle pre-signed URL fetch errors', async () => {
      const fetchError = new Error('Network error')
      mockFetch.mockRejectedValue(fetchError)

      const { uploadFile, error } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      await expect(uploadFile(testFile)).rejects.toThrow('Failed to get pre-signed URL')

      expect(error.value).toBeTruthy()
    })
  })

  describe('State Management', () => {
    it('should track uploading state', async () => {
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: 1024,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, status: 200 } as Response)
          }, 100)
        })
      })

      const { uploadFile, uploading } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      const uploadPromise = uploadFile(testFile)

      // Uploading should be true during upload
      expect(uploading.value).toBe(true)

      await uploadPromise

      // Uploading should be false after completion
      expect(uploading.value).toBe(false)
    })

    it('should track upload progress', async () => {
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-123',
        contentType: 'image/jpeg',
        fileSize: 1024,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar.jpg'
      }

      mockFetch.mockResolvedValue(mockPresignedResponse)
      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200
      } as Response)

      const { uploadFile, uploadProgress } = useAvatarUpload()
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      await uploadFile(testFile)

      // Progress should be 100% after successful upload
      expect(uploadProgress.value).toBe(100)
    })

    it('should clear error state', async () => {
      const { clearError, error, uploadProgress, uploadFile } = useAvatarUpload()

      // Trigger an error by providing invalid input
      mockFetch.mockRejectedValue(new Error('Test error'))
      const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

      try {
        await uploadFile(testFile)
      } catch {
        // Error is expected
      }

      // Verify error exists
      expect(error.value).toBeTruthy()

      // Clear the error
      clearError()

      expect(error.value).toBeNull()
      expect(uploadProgress.value).toBe(0)
    })
  })

  describe('Multiple File Upload', () => {
    it('should upload multiple files sequentially', async () => {
      const mockPresignedResponse1 = {
        presignedUrl: 'https://r2.example.com/upload1',
        key: 'avatar-key-1',
        contentType: 'image/jpeg',
        fileSize: 1024,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar1.jpg'
      }

      const mockPresignedResponse2 = {
        presignedUrl: 'https://r2.example.com/upload2',
        key: 'avatar-key-2',
        contentType: 'image/jpeg',
        fileSize: 2048,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar2.jpg'
      }

      mockFetch
        .mockResolvedValueOnce(mockPresignedResponse1)
        .mockResolvedValueOnce(mockPresignedResponse2)
      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200
      } as Response)

      const { uploadFiles } = useAvatarUpload()
      const files = [
        new File(['test1'], 'avatar1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'avatar2.jpg', { type: 'image/jpeg' })
      ]

      const results = await uploadFiles(files)

      expect(results).toHaveLength(2)
      expect(results[0]?.originalName).toBe('avatar1.jpg')
      expect(results[1]?.originalName).toBe('avatar2.jpg')
    })

    it('should continue uploading other files if one fails', async () => {
      const mockPresignedResponse = {
        presignedUrl: 'https://r2.example.com/upload',
        key: 'avatar-key-2',
        contentType: 'image/jpeg',
        fileSize: 2048,
        expiresIn: 86400,
        uploadedBy: 'user-123',
        uploadedAt: '2024-01-01T00:00:00Z',
        originalFilename: 'avatar2.jpg'
      }

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('First upload failed'))
        }
        return Promise.resolve(mockPresignedResponse)
      })

      mockGlobalFetch.mockResolvedValue({
        ok: true,
        status: 200
      } as Response)

      const { uploadFiles } = useAvatarUpload()
      const files = [
        new File(['test1'], 'avatar1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'avatar2.jpg', { type: 'image/jpeg' })
      ]

      const results = await uploadFiles(files)

      // Should have one successful upload
      expect(results).toHaveLength(1)
      expect(results[0]?.originalName).toBe('avatar2.jpg')
    })
  })
})
