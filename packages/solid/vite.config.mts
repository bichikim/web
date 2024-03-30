import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

import pkg from './package.json'

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]

const resolvePath = (url: string) => fileURLToPath(new URL(url, import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolvePath('src/index.ts'),
        'test/index': resolvePath('src/test'),
        'use/index': resolvePath('src/use'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external,
    },
  },
  plugins: [
    solidPlugin(),
    dts({
      compilerOptions: {
        checkJs: false,
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: true,
        noEmit: false,
        noEmitOnError: true,
        preserveSymlinks: false,
        skipLibCheck: true,
      },
      entryRoot: 'src',
      exclude: ['**/__tests__/*'],
      include: ['**/*.ts', '**/*.tsx'],
    }),
  ],
  resolve: {
    alias: {
      src: resolvePath('src'),
    },
  },
})