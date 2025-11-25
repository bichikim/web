import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'
import {fileURLToPath} from 'node:url'
import devtools from 'solid-devtools/vite'

export default defineConfig({
  vite: {
    plugins: [
      devtools({
        autoname: true,
        locator: {
          jsxLocation: true,
          targetIDE: 'vscode' as any,
        },
      }),
      //
      UnoCSS(),
    ],
    resolve: {
      alias: {
        // root source path alias
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
