import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineConfig, loadEnv} from 'vite'

const projectRootDir = path.dirname(fileURLToPath(import.meta.url))
import UnoCSS from '@unocss/vite'
import Icons from 'unplugin-icons/vite'
import solid from 'vite-plugin-solid'

const DEFAULT_CLI_SERVER_PORT = 3040

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cliServerPort = Number(env.VITE_CLI_SERVER_PORT ?? DEFAULT_CLI_SERVER_PORT)

  return {
    plugins: [
      UnoCSS(),
      Icons({
        compiler: 'solid',
      }),
      solid(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRootDir, 'src'),
      },
    },
    server: {
      proxy: {
        '/agent': {
          changeOrigin: true,
          target: `http://localhost:${String(cliServerPort)}`,
        },
      },
    },
  }
})
