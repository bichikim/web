import path from 'node:path'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import solidPlugin from 'vite-plugin-solid'

import package_ from './package.json'

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(package_.dependencies),
        ...Object.keys(package_.peerDependencies),
      ],
    },
  },
  plugins: [
    solidPlugin(),
    dts({
      compilerOptions: {
        declaration: true,
        declarationDir: 'dist',
        declarationMap: true,
        emitDeclarationOnly: true,
      },
      entryRoot: 'src',
      insertTypesEntry: true,
    }),
  ],
})
