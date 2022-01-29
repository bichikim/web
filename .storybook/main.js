module.exports = {
  "stories": [
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
  "core": {
    "builder": "webpack5"
  }
}
