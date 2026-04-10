// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow explicit any in tests and when necessary
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars are warnings, not errors (prefixed with _ are ignored)
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Ignore build output and config files
    ignores: [
      'node_modules/**',
      '.wrangler/**',
      'worker-configuration.d.ts',
      'eslint.config.mjs',
    ],
  }
)

