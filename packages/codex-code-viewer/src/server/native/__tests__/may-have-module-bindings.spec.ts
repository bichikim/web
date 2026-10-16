import {describe, expect, it} from 'vitest'
import {mayHaveModuleBindings} from '../may-have-module-bindings'

describe('mayHaveModuleBindings', () => {
  it.each([
    "const {greet: hello} = require('./core')",
    "const {greet: hello} = require /* comment */ ('./core')",
    "const {greet: hello} = require // comment\n ('./core')",
    "const {greet: hello} = require?.('./core')",
    "const {greet: hello} = require<typeof api>('./core')",
    "const {greet: hello} = req\\u0075ire('./core')",
    "const {greet: hello} = await import /* comment */ ('./core')",
    // oxlint-disable-next-line no-template-curly-in-string -- This is literal TypeScript input to the scanner.
    "const text = `template ${other()}`; const {greet} = require('./core')",
    "const first = 1, {greet: hello} = require('./core')",
    "const /* declaration */ {greet} = require('./core')",
    "const first = 1, /* next */ {greet} = await import('./core')",
    "const {greet} /* close */ = /* value */ (await (import('./core')))",
    "const {greet}: {greet: () => void} = require('./core')",
    "const {greet: hello}: API = require('./core')",
    "const {greet: hello} = (await (import('./core')))",
    "const {greet: hello} /* binding */ = /* initializer */ require('./core')",
    "const {greet: hello} // binding\n = require('./core')",
    // oxlint-disable-next-line no-template-curly-in-string -- This is TypeScript input containing nested templates.
    "const text = `outer ${`inner ${(() => { const {greet} = require('./core'); return greet() })()}`} tail`",
  ])('should retain a potential module binding in %s', (text) => {
    expect(mayHaveModuleBindings(text)).toBe(true)
  })
  it.each([
    "const loaded = import('./core'); loaded.then(use)",
    "const api = require('./core'); api.greet()",
    "const api = require('./core'); const read = ({value}: Props) => value",
    "const {unrelated} = source; const api = require('./core')",
    "const {unrelated} = source; const api = (await import('./core'))",
    "async function run() { return import('./core') }",
    // oxlint-disable-next-line no-template-curly-in-string -- This is TypeScript input containing nested templates.
    "const text = `outer ${`inner ${import('./core')}`} tail`; const api = require('./core')",
  ])('should avoid full syntax parsing when %s contains no module destructuring', (text) => {
    expect(mayHaveModuleBindings(text)).toBe(false)
  })
  it.each([
    "const text = \"const {fake} = require('./core')\"; const api = require('./core')",
    "// const {fake} = require('./core')\nconst api = require('./core')",
    "const text = `const {fake} = require('./core')`; const api = require('./core')",
    "const matcher = /\"/; const {greet} = require('./core')",
    "const view = <div>{(() => { const {greet} = require('./core'); return greet() })()}</div>",
  ])('should keep lexical ambiguities for the compiler in %s', (text) => {
    expect(mayHaveModuleBindings(text)).toBe(true)
  })
  it.each([
    "const {fake} = other; require('./core'); /* unfinished",
    "const {fake} = other; require('./core'); /* outer /* inner */",
  ])('should leave incomplete or nested comment delimiters to the compiler in %s', (text) => {
    expect(mayHaveModuleBindings(text)).toBe(true)
  })
  it.each([
    "const {other} = source; const loader = require('./core'); function run() {} // : comment",
    "function run() {} // = require('./core')\nconst {other} = source",
  ])('should consume complete comments before looking for a binding operator in %s', (text) => {
    expect(mayHaveModuleBindings(text)).toBe(false)
  })
  it('should avoid parsing static imports and ordinary exports for module bindings', () => {
    expect(
      mayHaveModuleBindings("import {value} from './core'; export const read = () => value"),
    ).toBe(false)
  })
  it('should exclude plain generic module calls and retain destructuring', () => {
    expect(mayHaveModuleBindings("const api = require<API>('./core')")).toBe(false)
    expect(mayHaveModuleBindings("const {greet} = require<API>('./core')")).toBe(true)
  })
  it('should ignore call syntax inside the module name trailing line comment', () => {
    expect(mayHaveModuleBindings('const {greet}: API = source; require // (')).toBe(false)
  })
  it.each([
    {kind: 'block', trivia: `/*${'*//*'.repeat(4096)}*/`},
    {kind: 'line', trivia: `${'//'.repeat(8192)}\n`},
  ])('should reject missing calls after repeated $kind comment delimiters', ({trivia}) => {
    expect(mayHaveModuleBindings(`const {greet}: API = source; require ${trivia} neither`)).toBe(
      false,
    )
  })
  it.each([
    {kind: 'block', trivia: `/*${'*//*'.repeat(4096)}*/`},
    {kind: 'line', trivia: `${'//'.repeat(8192)}\n`},
  ])('should retain module bindings after repeated $kind comment delimiters', ({trivia}) => {
    expect(mayHaveModuleBindings(`const {greet} = require ${trivia} ('./core')`)).toBe(true)
  })
})
