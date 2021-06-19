// noinspection ES6PreferShortImport
import {creBundle, creWatchBundle, RollupOptions} from './scripts'

const bundleOptions: RollupOptions = {
  output: [
    {
      file: 'index.module.js',
      format: 'es',
    },
    {
      file: 'index.js',
      format: 'commonjs',
    },
    {
      file: 'index.umd.js',
      format: 'umd',
    },
  ],
  target: 'ES2019',
}

export const dev = creWatchBundle(bundleOptions)

export const build = creBundle(bundleOptions)
