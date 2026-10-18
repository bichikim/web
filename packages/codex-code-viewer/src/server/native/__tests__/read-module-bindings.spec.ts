import {describe, expect, it} from 'vitest'
import typescript from '@typescript/typescript6'
import {readModuleBindings} from '../read-module-bindings'

const parse = (source: string) =>
  typescript.createSourceFile('use.ts', source, typescript.ScriptTarget.Latest, true)
describe('readModuleBindings', () => {
  it('should retain immutable require and nested dynamic import binding positions', () => {
    const text =
      "const {greet: hello} = require('./core'); " +
      "async function run() { const {welcome: invoke} = await import('./bridge'); invoke() }"
    expect(readModuleBindings(parse(text))).toEqual([
      {local: text.indexOf('hello'), property: text.indexOf('greet')},
      {local: text.indexOf('invoke'), property: text.indexOf('welcome')},
    ])
  })
  it('should exclude mutable, computed, rest and defaulted bindings', () => {
    const text =
      "let {greet: mutable} = require('./core'); " +
      "const {greet: defaulted = fallback, ...rest} = require('./core'); " +
      "const {greet: computed} = require(path); const {greet: ordinary} = unrelated('./core')"
    expect(readModuleBindings(parse(text))).toEqual([])
  })
  it('should preserve shorthand and string property keys without matching text inside strings', () => {
    const text =
      `const {greet, 'welcome': hello} = (require('./core')); ` +
      `const text = "const {fake} = require('./wrong')"`
    expect(readModuleBindings(parse(text))).toEqual([
      {local: text.indexOf('greet'), property: text.indexOf('greet')},
      {local: text.indexOf('hello'), property: text.indexOf("'welcome'")},
    ])
  })
})
