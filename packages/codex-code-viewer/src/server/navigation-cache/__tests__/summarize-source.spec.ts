import {describe, expect, it} from 'vitest'
import {summarizeSource} from '../summarize-source'

describe('summarizeSource', () => {
  it('should index aliases, property names and reexports without resolving foreign files', () => {
    const result = summarizeSource('main.ts', "export {greet as hello} from './helper'\n")
    expect(result.imports).toEqual(['./helper'])
    expect(result.names).toEqual(expect.arrayContaining(['greet', 'hello']))
    expect(result.uncertain).toBe(false)
    expect(result.surface).not.toBe('')
  })
  it('should keep private body edits local but propagate changes to inferred exports', () => {
    const before = summarizeSource('main.ts', "import {greet} from './helper'\ngreet()")
    const after = summarizeSource('main.ts', "import {greet} from './helper'\n\ngreet(1)")
    expect(after.surface).toBe(before.surface)
    expect(after.fingerprint).not.toBe(before.fingerprint)
    expect(summarizeSource('main.ts', 'export const value = 1').surface).not.toBe(
      summarizeSource('main.ts', 'export const value = "one"').surface,
    )
  })
  it.each([
    'const value = 1',
    'export {}; declare global { interface Window { greet(): void } }',
    'export {}; import(path)',
    'module.exports = require("./helper")',
  ])('should widen unproven semantic scope for %s', (source) => {
    expect(summarizeSource('main.ts', source).uncertain).toBe(true)
  })
})
