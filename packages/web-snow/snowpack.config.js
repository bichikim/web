module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  env: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: true,
  },
  plugins: ['@snowpack/plugin-typescript', '@snowpack/plugin-vue', '@snowpack/plugin-dotenv'],
  // install: [
  //   'vue/dist/vue.runtime.esm-bundler.js',
  //   /* ... */
  // ],
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  // alias: {
  //   vue: 'vue/dist/vue.runtime.esm-bundler.js',
  // },
}
