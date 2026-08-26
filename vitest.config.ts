import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    exclude: ['tests/e2e/**', 'tests/architecture/**']
  }
})
