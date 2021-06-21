const path = require('path')

module.exports = {
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
    "../src-se/**/*.stories.mdx",
    "../src-se/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ],
  webpackFinal: (config) => {
    /**
     * src alias
     */
    config.resolve.alias['@'] = path.resolve(__dirname, '../src')
    config.resolve.alias['~'] = path.resolve(__dirname, '../src-se')
    // remove svg test
    config.module.rules.forEach((rule) => {
      if (!rule.test) {
        return
      }
      if (rule.test.toString().includes('svg')) {
        rule.test = /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
      }
    })

    /**
     *  add rule for svg
     *  @see https://www.npmjs.com/package/vue-svg-loader#webpack
     */

    config.module.rules.push({
      test: /\.svg$/,
      use: [
        'vue-loader',
        path.resolve(__dirname, '..', 'vue-svg-loader'),
      ],
    })
    return config
  }
}
