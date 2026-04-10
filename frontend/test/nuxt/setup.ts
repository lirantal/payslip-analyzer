import { vi } from 'vitest'

// Mock window.URL.createObjectURL for file upload tests (browser environment)
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-url')
  window.URL.revokeObjectURL = vi.fn()
}

// Mock global fetch for Nuxt runtime tests
global.fetch = global.fetch || vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
}
