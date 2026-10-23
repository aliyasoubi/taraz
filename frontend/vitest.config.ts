import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts so unit tests do not build the PWA.
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
