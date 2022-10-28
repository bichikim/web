/* eslint-env node */
module.exports = {
  env: {
    test: {
      plugins: [
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
        'babel-plugin-transform-typescript-metadata',
        ['@babel/plugin-proposal-class-properties', {loose: true}],
        [
          '@babel/plugin-proposal-decorators',
          {
            legacy: true,
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
