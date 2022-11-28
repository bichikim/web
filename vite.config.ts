import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    //
    vue(),
    // support src path and monorepo relative path
    tsconfigPaths(),
  ],
})
