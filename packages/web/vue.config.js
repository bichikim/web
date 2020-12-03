const app = require('./app.config')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  pwa: {
    ...app,
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './service-worker.js',
      exclude: [
        /\.map$/,
        /manifest\.json$/,
      ],
    },
  },
  chainWebpack(config) {
    if (process.env.ANALYZER) {
      config.plugin('webpack-bundle-analyzer')
        .use(BundleAnalyzerPlugin)
    }
    config.resolve.alias.set('vue$', 'vue/dist/vue.esm-bundler.js')
  },
  pluginOptions: {
  },
  transpileDependencies: [
  ],
}
