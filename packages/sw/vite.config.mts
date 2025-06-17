import {createConfig, targets} from '@winter-love/vite-lib-config'
import {getBabelOutputPlugin} from '@rollup/plugin-babel'

export default createConfig({
  entry: {
    cli: 'src/cli.ts',
    sw: 'src/sw.ts',
  },
  external: ['node:path', 'node:fs', 'node:url', 'vite'],
  rollupOutputPlugins: [
    getBabelOutputPlugin({
      allowAllFormats: true,
      presets: [
        [
          '@babel/preset-env',
          {
            // Default：false
            // // https://babeljs.io/docs/en/babel-preset-env#modules
            modules: false,
            targets,
            useBuiltIns: false,
          },
        ],
      ],
    }),
  ],
})
