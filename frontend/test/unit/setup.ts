import { vi } from 'vitest'

// Mock global fetch for unit tests (Node environment)
global.fetch = global.fetch || vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
}
