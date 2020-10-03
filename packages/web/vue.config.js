const app = require('./app.config')

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
  pluginOptions: {
  },
  transpileDependencies: [
  ],
}
