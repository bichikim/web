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
        ['@babel/preset-typescript', {
          allExtensions: true,
          isTSX: true,
        }],
      ],
    },
  },
}
