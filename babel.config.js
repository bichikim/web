/* eslint-env node */
module.exports = {
  env: {
    test: {
      plugins: [
        [
          'search-and-replace',
          {
            rules: [
              {
                replace: 'false',
                search: '__QUASAR_SSR_SERVER__',
              },
            ],
          },
        ],
        [
          'module-resolver',
          {
            alias: {
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
          '@babel/preset-typescript', {
            allExtensions: true,
            isTSX: true,
          },
        ],
      ],
    },
  },
}
