import {defineConfig, getDefaultConfig} from 'histoire'
import {HstVue} from '@histoire/plugin-vue'

export default defineConfig({
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      color: '#cafff5',
      contrastColor: '#005142',
      label: 'Custom gray',
    },
  ],
  // outDir: 'hdist',
  plugins: [HstVue()],
  // autoApplyContrastColor: true,
  // routerMode: 'hash',
  // theme: {
  //   darkClass: 'my-dark',
  // },
})
