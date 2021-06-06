// noinspection ES6PreferShortImport
import {creBundle, creWatchBundle, RollupOptions} from './scripts'

const bundleOptions: RollupOptions = {
  target: 'ES2019',
  output: [
    {
      format: 'es',
      file: 'index.module.js',
    },
    {
      format: 'commonjs',
      file: 'index.js',
    },
    {
      format: 'umd',
      file: 'index.umd.js',
    },
  ],
}

export const dev = creWatchBundle(bundleOptions)

export const build = creBundle(bundleOptions)
