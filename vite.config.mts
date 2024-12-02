import {fileURLToPath, URL} from 'node:url'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  // Example build config for a component library
  build: {
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
      },
    },
  },

  plugins: [
    // Vite Plugins
    vue(),
    monorepoAlias({
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/coong\//u, /^\/packages\//u],
    }) as any,
  ],
})
