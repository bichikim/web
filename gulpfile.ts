// noinspection ES6PreferShortImport
import {creBundle, creWatchBundle, RollupOptions} from './scripts'

const bundleOptions: RollupOptions = {
  output: [
    {
      format: 'es',
      file: 'index.module.js',
    },
    {
      format: 'umd',
      file: 'index.js',
    },
  ],
}

export const dev = creWatchBundle(bundleOptions)

export const build = creBundle(bundleOptions)
