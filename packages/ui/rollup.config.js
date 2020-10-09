import {getConfig} from '../../rollup.config'
import {snakeCase} from 'lodash'
import pkg from '@innovirus/emotion/package.json'
const name = snakeCase(pkg.name)

export default [
  getConfig({output: 'lib/index.esm.js', isMinify: true, name}),
  getConfig({output: 'lib/index.js', isMinify: true, format: 'umd', name}),
]
