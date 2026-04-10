import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      // Unit tests - run in Node environment (faster, no Nuxt runtime)
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          environment: 'node',
          setupFiles: ['./test/unit/setup.ts']
        }
      },
      // Nuxt runtime tests - run in Nuxt environment
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          environment: 'nuxt',
          setupFiles: ['./test/nuxt/setup.ts']
        }
      })
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/types/**',
        '**/*.d.ts'
      ]
    }
  }
})
