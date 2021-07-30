// noinspection ES6PreferShortImport
import {creBundle, creWatchBundle} from './scripts'
import {series} from 'gulp'

export const dev = creWatchBundle({
  minify: false,
  output: [
    {
      file: 'index.module.js',
      format: 'es',
    },
    {
      file: 'index.js',
      format: 'commonjs',
    },
  ],
  target: 'ES2019',
})

export const build = series(
  creBundle({
    // minify: true,
    output: [
      {
        file: 'index.module.js',
        format: 'es',
      },
    ],
    target: 'ES2019',
  }),
  creBundle({
    clean: false,
    // minify: true,
    output: [
      {
        file: 'index.iife.js',
        format: 'iife',
      },
      {
        file: 'index.js',
        format: 'commonjs',
      },
    ],
    target: 'ES2015',
  }),
)

export const prepare = creBundle({
  minify: false,
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
      file: 'index.iife.js',
      format: 'iife',
    },
  ],
  target: 'ES2019',
})
