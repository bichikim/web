import {defineConfig} from 'vite'
import {naturalLint} from '../../dist/index.mjs'
import naturalLintOptions from './natural-lint.config.mjs'

export default defineConfig({
  plugins: [naturalLint(naturalLintOptions)],
})
