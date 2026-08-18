import unoCss from '@unocss/vite'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [unoCss('../../')],
  resolve: {
    tsconfigPaths: true,
  },
})
