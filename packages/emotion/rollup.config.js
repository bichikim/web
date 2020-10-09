import pkg from './package.json'
import {snakeCase} from 'lodash'
import {getConfig} from '../../rollup.config'

const name = snakeCase(pkg.name)

export default [
  getConfig({output: 'lib/index.iife.js', name, format: 'iife'}),
  getConfig({output: 'lib/index.js', name}),
]
