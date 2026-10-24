import {hooksOnly} from './rules/hooks-only.mjs'
import {forbiddenHooks} from './rules/forbidden-hooks.mjs'
import {sortKeysFix} from './rules/sort-keys-fix.mjs'

/** @type {import('eslint').ESLint.Plugin} */
export default {
  rules: {
    'forbidden-hooks': forbiddenHooks,
    'hooks-only': hooksOnly,
    'sort-keys-fix': sortKeysFix,
  },
}
