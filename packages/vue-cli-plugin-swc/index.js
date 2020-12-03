const path = require('path')

module.exports = (api, projectOptions) => {
  // const {semver, loadModule} = require('@vue/cli-shared-utils')
  // const vue = loadModule('vue', api.service.context)
  // const isVue3 = (vue && semver.major(vue.version) === 3)

  api.chainWebpack((config) => {
    config.resolveLoader.modules.prepend(path.join(__dirname, 'node_modules'))

    if (!projectOptions.pages) {
      config.entry('app')
        .clear()
        .add('./src/main.ts')
    }

    config.resolve
      .extensions
      .prepend('.ts')
      .prepend('.tsx')

    const tsRule = config.module.rule('ts').test(/\.ts$/)
    const jsRule = config.module.rule('js').test(/\.js$/)
    const tsxRule = config.module.rule('tsx').test(/\.tsx$/)

    const addLoader = ({name, loader, options}) => {
      tsRule.use(name).loader(loader).options(options)
      tsxRule.use(name).loader(loader).options(options)
    }

    addLoader({
      name: 'cache-loader',
      loader: require.resolve('cache-loader'),
      options: api.genCacheConfig('swc-loader', {
        'ts-loader': require('swc-loader/package.json').version,
        typescript: require('typescript/package.json').version,
        modern: !!process.env.VUE_CLI_MODERN_BUILD,
      }, 'tsconfig.json'),
    })

    addLoader({
      name: 'swc-loader',
      loader: require.resolve('swc-loader'),
      options: {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
          module: {
            type: 'amd',
            strict: false,
            strictMode: true,
            lazy: false,
            noInterop: false,
          },
        },
      },
    })

    jsRule.use('swc-loader').loader(require.resolve('swc-loader')).options({
      jsc: {
        parser: {
          syntax: 'ecmascript',
          jsx: true,
          dynamicImport: true,
          privateMethod: true,
          functionBind: true,
          classPrivateProperty: true,
          exportDefaultFrom: true,
          exportNamespaceFrom: true,
          decorators: true,
          decoratorsBeforeExport: true,
          importMeta: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        module: {
          type: 'amd',
          strict: false,
          strictMode: true,
          lazy: false,
          noInterop: false,
        },
      },
    })
  })
}
