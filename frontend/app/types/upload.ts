export interface UploadRequest {
  contentType: string
  fileSize: number
  originalFilename?: string
}

export interface UploadResponse {
  presignedUrl: string
  filename: string
  originalFilename: string
  contentType: string
  fileSize: number
  expiresIn: number
  uploadedBy: string
  uploadedAt: string
}

export interface UploadedFile {
  filename: string
  originalName: string
  contentType: string
  fileSize: number
  uploadedAt: string
}

export interface UploadError {
  message: string
  code?: string
  details?: unknown
}
