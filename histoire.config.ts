import {defineConfig} from 'histoire'
import vue from '@vitejs/plugin-vue'
import babel from 'vite-plugin-babel'

export default defineConfig({
  setupFile: 'histoire.setup.ts',
  storyMatch: ['**/__stories__/*.story.vue'],
  vite: {
    plugins: [
      vue({}),
      {
        ...babel({
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
                },
              ],
            ],
          },
          filter: /\.[jt]sx?$/u,
        }),
        enforce: 'post',
      },
    ],
  },
})
