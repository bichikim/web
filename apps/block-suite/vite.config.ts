import path from 'node:path'
import {fileURLToPath} from 'node:url'
import UnoCSS from '@unocss/vite'
import {defineConfig, loadEnv} from 'vite'
import solid from 'vite-plugin-solid'

const projectRootDir = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_YJS_SERVER_PORT = 1234

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  const yjsServerPort = Number(env.VITE_YJS_SERVER_PORT ?? DEFAULT_YJS_SERVER_PORT)

  return {
    plugins: [UnoCSS(), solid()],
    resolve: {
      alias: {
        '@': path.resolve(projectRootDir, 'src'),
        '@winter-love/blocks': path.resolve(projectRootDir, '../../packages/blocks/src/index.ts'),
      },
    },
    server: {
      proxy: {
        '/collaboration': {
          changeOrigin: true,
          target: `ws://localhost:${String(yjsServerPort)}`,
          ws: true,
        },
      },
    },
  }
})
