import {defineConfig} from 'vite'
import {crossOriginIsolation} from './cross-origin-isolation'

export default defineConfig({
  build: {outDir: '.output/public'},
  plugins: [crossOriginIsolation()],
  preview: {host: '127.0.0.1', port: 3410, strictPort: true},
})
