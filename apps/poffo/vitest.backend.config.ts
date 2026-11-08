import {defineConfig} from 'vitest/config'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@winter-love\/puppet\/(?<entry>player|model|converter)$/u,
        replacement: fileURLToPath(new URL('../../packages/puppet/dist/$1.js', import.meta.url)),
      },
    ],
    conditions: ['node'],
  },
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    exclude: ['src/backend/browser/**'],
    include: [
      'src/backend/**/*.spec.ts',
      'src/backend/**/*.integration.ts',
      'src/cli/**/*.spec.ts',
      'src/cli/**/*.integration.ts',
    ],
    name: 'poffo-backend',
  },
})
