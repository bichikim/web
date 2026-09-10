import {defineConfig} from 'vitest/config'

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['src/__tests__/plugin.e2e.spec.ts'],
  },
})
