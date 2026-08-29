import {describe, expect, it} from 'vitest'

// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import plugin from '../index.mjs'
// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import {sortKeysFix} from '../rules/sort-keys-fix.mjs'

describe('oxlint plugin entrypoint', () => {
  it('should expose the sort-keys-fix rule', () => {
    expect(plugin.rules['sort-keys-fix']).toBe(sortKeysFix)
  })
})
