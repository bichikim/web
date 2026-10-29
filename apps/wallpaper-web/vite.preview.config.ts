import {defineConfig} from 'vite'

export default defineConfig({
  build: {outDir: '.output/public'},
  preview: {host: '127.0.0.1', port: 3410, strictPort: true},
})
