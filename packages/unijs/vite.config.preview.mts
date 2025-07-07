import {defineConfig} from 'vite'
import unocss from 'unocss/vite'
import presetWind3 from '@unocss/preset-wind3'

export default defineConfig({
  plugins: [
    //
    unocss({
      //
      content: {
        pipeline: {
          include: ['./*.html', './main.ts'],
        },
      },
      presets: [presetWind3()],
    }) as any,
  ],
})
