import {series, parallel} from 'gulp'
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

export const dev = parallel(
  creWatchBundle(bundleOptions),
)

export const build = series(
  creBundle(bundleOptions),
)
