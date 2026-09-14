import {createConfig, targets} from '@winter-love/vite-lib-config'
import {getBabelOutputPlugin} from '@rollup/plugin-babel'
import {defineConfig} from 'vite'

const createBaseConfig = createConfig({
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
  root: import.meta.dirname,
})

export default defineConfig((env) => {
  const config = createBaseConfig(env)
  const output = config.build?.rollupOptions?.output

  return {
    ...config,
    build: {
      ...config.build,
      rollupOptions: {
        ...config.build?.rollupOptions,
        // The generator copies only sw.mjs, so the runtime must not depend on sibling chunks.
        output: Array.isArray(output)
          ? output.map((entry) => ({...entry, preserveModules: false}))
          : output,
      },
    },
  }
})
