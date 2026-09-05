import {defineConfig, presetMini, transformerDirectives} from 'unocss'

export default defineConfig({
  presets: [presetMini({preflight: false})],
  transformers: [transformerDirectives()],
})
