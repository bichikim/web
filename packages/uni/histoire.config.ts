import {defineConfig} from 'histoire'
import vue from '@vitejs/plugin-vue'
import babel from 'vite-plugin-babel'

export default defineConfig({
  setupFile: 'histoire.setup.ts',

  vite: {
    plugins: [
      babel({
        babelConfig: {
          babelrc: false,
          configFile: false,
          plugins: [
            [
              'module-resolver',
              {
                alias: {
                  src: './src',
                },
                cwd: 'packagejson',
                loglevel: 'info',
              },
            ],
          ],
        },
      }),
      vue(),
    ],
  },
})
