import {sortKeysFix} from './rules/sort-keys-fix.mjs'

/** @type {import('eslint').ESLint.Plugin} */
export default {
  rules: {
    'sort-keys-fix': sortKeysFix,
  },
}
