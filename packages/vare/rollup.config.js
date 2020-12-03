import pkg from './package.json'
import {snakeCase} from 'lodash'
import {getConfig} from '../../rollup.config'

const name = snakeCase(pkg.name)
const external = Object.keys(pkg.dependencies)

export default [
  getConfig({output: 'lib/index.iife.js', name, format: 'iife', external, projectRootDir: __dirname}),
  getConfig({output: 'lib/index.js', name, external, projectRootDir: __dirname}),
]
