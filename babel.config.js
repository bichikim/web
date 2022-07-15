/* eslint-env node */
module.exports = {
  env: {
    test: {
      plugins: [
        [
          'module-resolver',
          {
            alias: {
              // for coong/server
              '#auth': './src/auth',
              '#extended-schema': './src/extended-schema',
              '#schema': './src/schema',
              '#src': './src',
              '#utils': './src/utils',
              // shared alias
              src: './src',
            },
            cwd: 'packagejson',
            loglevel: 'info',
          },
        ],
        ['@vue/babel-plugin-transform-vue-jsx'],
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            // for tree shaking
            targets: {
              node: true,
            },
          },
        ],
        [
          '@babel/preset-typescript',
          {
            allExtensions: true,
            isTSX: true,
          },
        ],
      ],
    },
  },
}
