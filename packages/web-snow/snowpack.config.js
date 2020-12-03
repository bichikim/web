module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: ['@snowpack/plugin-typescript', '@snowpack/plugin-vue', '@snowpack/plugin-dotenv'],
  install: [
    'vue/dist/vue.esm-bundler.js',
    /* ... */
  ],
  installOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    /* ... */
  },
  alias: {
    vue: 'vue/dist/vue.esm-bundler.js',
  },
}
