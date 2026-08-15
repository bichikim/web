import {createConfig, targets} from '@winter-love/vite-lib-config'
import {getBabelOutputPlugin} from '@rollup/plugin-babel'
import {type ConfigEnv, defineConfig, type UserConfig} from 'vite'

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

// AI_NOTE - The generator copies only sw.mjs, so the service worker runtime must not depend on sibling chunks.
const createBaseConfigFactory = createBaseConfig as unknown as (
  env: ConfigEnv,
) => UserConfig | Promise<UserConfig>

export default defineConfig(async (env) => {
  const config = await createBaseConfigFactory(env)
  const output = config.build?.rollupOptions?.output

  return {
    ...config,
    build: {
      ...config.build,
      rollupOptions: {
        ...config.build?.rollupOptions,
        output: Array.isArray(output)
          ? output.map((entry) => ({...entry, preserveModules: false}))
          : output,
      },
    },
  }
})
