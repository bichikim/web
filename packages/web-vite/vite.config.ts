import path from 'path'

export default {
  alias: {
    vue: 'vue/dist/vue.esm-bundler.js',
    '/@/': path.resolve(__dirname, 'src'),
  },
}
