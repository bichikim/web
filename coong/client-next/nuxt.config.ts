import {defineNuxtConfig} from 'nuxt3'

export default defineNuxtConfig({

  alias: {
    src: '/src',
  },
  // empty
  dir: {
    app: '/src/app.ts',
  },
  vue: {
    compilerOptions: {
      directiveTransforms: {
        css: () => ({
          needRuntime: true,
          props: [],
        }),
        focus: () => ({
          needRuntime: true,
          props: [],
        }),
      },
    },
  },
})
