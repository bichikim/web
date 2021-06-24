module.exports = {
  "stories": [
    "../src/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ],
  babel: async (options) => {
    // monorepo alias resolving
    options.plugins.push([
      'module-resolver',
      {
        alias: {
          src: './src',
        },
        cwd: 'packagejson',
        loglevel: 'info',
      },
    ])
    return {
      ...options,
    }
  },
  webpackFinal: (config) => {
    /**
     * src alias
     */
    // config.resolve.alias['src'] = path.resolve(__dirname, '../src')
    // remove svg test
    // config.module.rules.forEach((rule) => {
    //   if (!rule.test) {
    //     return
    //   }
    //   if (rule.test.toString().includes('svg')) {
    //     rule.test = /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
    //   }
    // })

    /**
     *  add rule for svg
     *  @see https://www.npmjs.com/package/vue-svg-loader#webpack
     */

    // config.module.rules.push({
    //   test: /\.svg$/,
    //   use: [
    //     'vue-loader',
    //     path.resolve(__dirname, '..', 'vue-svg-loader'),
    //   ],
    // })
    return config
  },
  "core": {
    "builder": "webpack5"
  }
}
